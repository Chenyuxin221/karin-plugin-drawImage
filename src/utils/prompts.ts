import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Contact, Elements } from 'node-karin'

import { dir } from '@/dir'

export const PROMPT_TYPES = [0, 1] as const
export type PromptType = typeof PROMPT_TYPES[number]

/** 提示词 ID 约定为 p001、p002 这类短 ID，便于在命令中直接使用。 */
export const PROMPT_ID_REG = /^p\d+$/i
const PROMPT_FILE_EXTENSIONS = new Set(['.txt', '.md'])
const PROMPT_LIBRARY_VERSION = 1
const MAX_PROMPT_TEXT_LENGTH = 512 * 1024

export interface PromptRecord {
  id: string
  type: PromptType
  name: string
  text: string
}

export interface ResolvedPrompt {
  /** 最终发送给绘图接口的提示词。 */
  text: string
  /** 引用保存提示词时才有值。 */
  type?: PromptType
  /** 引用保存提示词时才有值。 */
  id?: string
}

export interface PromptMessage {
  /** 原始消息文本。 */
  msg: string
  /** 当前消息元素，主要用于读取当前消息附带的文件。 */
  elements?: readonly Elements[]
  /** 被引用消息的 ID。 */
  replyId?: string
  /** 当前事件来源。 */
  contact?: Contact
  /** 读取引用消息的最小接口。 */
  bot?: {
    getMsg: (contact: Contact, messageId: string) => Promise<{ elements: Elements[] }>
  }
}

interface PromptInput {
  type: PromptType
  name: string
  text: string
}

function isRecord (value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function readText (filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return ''
    throw error
  }
}

function normalizeString (value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`提示词${field}不能为空`)
  }

  return value.trim()
}

function normalizePromptType (value: unknown): PromptType {
  if (value === 0 || value === '0') return 0
  if (value === 1 || value === '1') return 1
  throw new Error('提示词 type 必须是 0 或 1')
}

function normalizePromptRecord (value: unknown, index: number): PromptRecord {
  if (!isRecord(value)) {
    throw new Error(`第 ${index + 1} 条提示词不是有效对象`)
  }

  const id = normalizeString(value.id, 'ID')
  if (!PROMPT_ID_REG.test(id)) {
    throw new Error(`提示词 ID 无效：${id}，格式应为 p001`)
  }

  const type = normalizePromptType(value.type)
  const name = normalizeString(value.name, '名称')
  const text = normalizeString(value.text, '正文')

  if (text.length > MAX_PROMPT_TEXT_LENGTH) {
    throw new Error(`提示词正文不能超过 ${MAX_PROMPT_TEXT_LENGTH} 个字符`)
  }

  return { id, type, name, text }
}

function getPromptItems (value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (isRecord(value) && Array.isArray(value.prompts)) return value.prompts
  throw new Error('提示词库根节点必须是数组或包含 prompts 数组的对象')
}

function parsePromptLibrary (content: string, filePath: string): PromptRecord[] {
  if (!content.trim()) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch (error) {
    throw new Error(`无法解析提示词库 ${filePath}`, { cause: error })
  }

  const records = getPromptItems(parsed).map(normalizePromptRecord)
  const ids = new Set<string>()
  for (const record of records) {
    const normalizedId = record.id.toLowerCase()
    if (ids.has(normalizedId)) {
      throw new Error(`提示词 ID 重复：${record.id}`)
    }
    ids.add(normalizedId)
  }

  return records
}

function writePromptLibrary (filePath: string, prompts: readonly PromptRecord[]): void {
  const content = `${JSON.stringify({ version: PROMPT_LIBRARY_VERSION, prompts }, null, 2)}\n`
  const current = readText(filePath)

  if (current === content) return

  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const tempFile = `${filePath}.${process.pid}.${Date.now()}.tmp`

  try {
    fs.writeFileSync(tempFile, content, 'utf8')
    fs.renameSync(tempFile, filePath)
  } catch (error) {
    fs.rmSync(tempFile, { force: true })
    throw error
  }
}

/**
 * 读取提示词库。文件不存在时返回空数组，旧版顶层数组格式也可以读取。
 *
 * @param filePath - 提示词库文件路径。
 * @returns 已校验的提示词记录。
 */
export function readPromptLibrary (filePath = dir.promptFile): PromptRecord[] {
  return parsePromptLibrary(readText(filePath), filePath)
}

/**
 * 根据 ID 查找提示词。
 *
 * @param id - 提示词 ID。
 * @param filePath - 提示词库文件路径。
 * @returns 找到的提示词；不存在时返回 undefined。
 */
export function getPrompt (id: string, filePath = dir.promptFile): PromptRecord | undefined {
  const normalizedId = id.trim().toLowerCase()
  return readPromptLibrary(filePath).find(record => record.id.toLowerCase() === normalizedId)
}

function generatePromptId (prompts: readonly PromptRecord[]): string {
  let maxId = 0
  for (const prompt of prompts) {
    const match = prompt.id.match(/^p(\d+)$/i)
    if (match) maxId = Math.max(maxId, Number.parseInt(match[1], 10))
  }

  return `p${String(maxId + 1).padStart(3, '0')}`
}

/**
 * 新增提示词并自动生成稳定 ID。
 *
 * @param input - 提示词内容。
 * @param filePath - 提示词库文件路径。
 * @returns 新增的提示词记录。
 */
export function addPrompt (input: PromptInput, filePath = dir.promptFile): PromptRecord {
  const prompts = readPromptLibrary(filePath)
  const record: PromptRecord = {
    id: generatePromptId(prompts),
    type: normalizePromptType(input.type),
    name: normalizeString(input.name, '名称'),
    text: normalizeString(input.text, '正文'),
  }

  if (record.text.length > MAX_PROMPT_TEXT_LENGTH) {
    throw new Error(`提示词正文不能超过 ${MAX_PROMPT_TEXT_LENGTH} 个字符`)
  }

  prompts.push(record)
  writePromptLibrary(filePath, prompts)
  return record
}

/**
 * 更新已有提示词。
 *
 * @param id - 提示词 ID。
 * @param input - 要更新的提示词内容。
 * @param filePath - 提示词库文件路径。
 * @returns 更新后的记录。
 */
export function updatePrompt (id: string, input: PromptInput, filePath = dir.promptFile): PromptRecord {
  const prompts = readPromptLibrary(filePath)
  const index = prompts.findIndex(record => record.id.toLowerCase() === id.trim().toLowerCase())
  if (index < 0) throw new Error(`未找到提示词：${id}`)

  const record: PromptRecord = {
    id: prompts[index].id,
    type: normalizePromptType(input.type),
    name: normalizeString(input.name, '名称'),
    text: normalizeString(input.text, '正文'),
  }

  if (record.text.length > MAX_PROMPT_TEXT_LENGTH) {
    throw new Error(`提示词正文不能超过 ${MAX_PROMPT_TEXT_LENGTH} 个字符`)
  }

  prompts[index] = record
  writePromptLibrary(filePath, prompts)
  return record
}

/**
 * 删除已有提示词。
 *
 * @param id - 提示词 ID。
 * @param filePath - 提示词库文件路径。
 * @returns 被删除的记录。
 */
export function removePrompt (id: string, filePath = dir.promptFile): PromptRecord {
  const prompts = readPromptLibrary(filePath)
  const index = prompts.findIndex(record => record.id.toLowerCase() === id.trim().toLowerCase())
  if (index < 0) throw new Error(`未找到提示词：${id}`)

  const [record] = prompts.splice(index, 1)
  writePromptLibrary(filePath, prompts)
  return record
}

/**
 * 解析 #draw 后面的保存提示词引用。
 *
 * 支持 `p001` 和兼容性的 `prompt:p001` 两种写法。未匹配 ID 格式时，
 * 保持原有行为，将输入作为普通提示词处理。
 *
 * @param input - #draw 或 #tpdraw 后面的文本。
 * @param filePath - 提示词库文件路径。
 * @returns 最终提示词及保存记录的类型。
 */
export function resolvePromptInput (input: string, filePath = dir.promptFile): ResolvedPrompt {
  const normalized = input.trim()
  const match = normalized.match(/^(?:prompt:)?(p\d+)(?:\s+([\s\S]*))?$/i)

  if (!match) return { text: normalized }

  const id = match[1]
  const record = getPrompt(id, filePath)
  if (!record) throw new Error(`未找到提示词：${id}`)

  const extraText = match[2]?.trim()
  return {
    text: [record.text, extraText].filter(Boolean).join('\n'),
    type: record.type,
    id: record.id,
  }
}

function getFileName (element: Extract<Elements, { type: 'file' }>): string {
  if (element.name?.trim()) return element.name.trim()

  const source = element.file.split(/[?#]/, 1)[0].replace(/\\/g, '/')
  return source.slice(source.lastIndexOf('/') + 1)
}

function getPromptFileElement (elements: readonly Elements[]): Extract<Elements, { type: 'file' }> | undefined {
  return elements.find((element): element is Extract<Elements, { type: 'file' }> => {
    if (element.type !== 'file' || !element.file) return false
    return PROMPT_FILE_EXTENSIONS.has(path.extname(getFileName(element)).toLowerCase())
  })
}

function hasFileElement (elements: readonly Elements[]): boolean {
  return elements.some(element => element.type === 'file')
}

/**
 * 提取引用消息中的文本或 Markdown 元素。
 *
 * @param elements - 消息元素列表。
 * @returns 拼接后的正文。
 */
export function extractPromptTextFromElements (elements: readonly Elements[]): string {
  return elements.flatMap(element => {
    if (element.type === 'text') return [element.text]
    if (element.type === 'markdown') return [element.markdown]
    return []
  }).join('').trim()
}

function validatePromptFileBuffer (buffer: Buffer): Buffer {
  if (buffer.byteLength > MAX_PROMPT_TEXT_LENGTH) {
    throw new Error(`提示词文件不能超过 ${MAX_PROMPT_TEXT_LENGTH} 个字节`)
  }
  return buffer
}

async function readPromptFileBuffer (source: string): Promise<Buffer> {
  const normalized = source.trim()

  if (normalized.startsWith('base64://')) {
    return validatePromptFileBuffer(Buffer.from(normalized.slice('base64://'.length), 'base64'))
  }

  const dataUrlMatch = normalized.match(/^data:[^;]+;base64,([\s\S]*)$/i)
  if (dataUrlMatch) return validatePromptFileBuffer(Buffer.from(dataUrlMatch[1], 'base64'))

  if (/^https?:\/\//i.test(normalized)) {
    const response = await fetch(normalized)
    if (!response.ok) throw new Error(`下载提示词文件失败：HTTP ${response.status}`)

    const contentLength = Number(response.headers.get('content-length') ?? 0)
    if (contentLength > MAX_PROMPT_TEXT_LENGTH) {
      throw new Error(`提示词文件不能超过 ${MAX_PROMPT_TEXT_LENGTH} 个字节`)
    }

    return validatePromptFileBuffer(Buffer.from(await response.arrayBuffer()))
  }

  const filePath = normalized.startsWith('file:') ? fileURLToPath(normalized) : normalized
  return validatePromptFileBuffer(await fs.promises.readFile(filePath))
}

async function readPromptFile (element: Extract<Elements, { type: 'file' }>): Promise<string> {
  const buffer = await readPromptFileBuffer(element.file)
  return buffer.toString('utf8').replace(/^\uFEFF/, '').trim()
}

async function getReplyElements (event: PromptMessage): Promise<Elements[]> {
  const replyId = event.replyId?.trim()
  if (!replyId) return []
  if (!event.bot || !event.contact) {
    throw new Error('无法读取引用消息，请重新引用文本消息或 txt/md 文件')
  }

  try {
    const message = await event.bot.getMsg(event.contact, replyId)
    return message.elements
  } catch (error) {
    throw new Error('读取引用消息失败', { cause: error })
  }
}

/**
 * 根据命令文本、当前消息附件和引用消息解析提示词正文。
 *
 * 优先级为：命令尾部正文、当前消息附带的 txt/md、引用的 txt/md、引用文本。
 *
 * @param event - 当前提示词命令事件。
 * @param inlineText - 命令中可选的正文。
 * @returns 最终正文。
 */
export async function resolvePromptTextFromEvent (event: PromptMessage, inlineText = ''): Promise<string> {
  const explicitText = inlineText.trim()
  if (explicitText) return explicitText

  const currentElements = event.elements ?? []
  const currentFile = getPromptFileElement(currentElements)
  if (currentFile) return readPromptFile(currentFile)

  const replyElements = await getReplyElements(event)
  const replyFile = getPromptFileElement(replyElements)
  if (replyFile) return readPromptFile(replyFile)

  const replyText = extractPromptTextFromElements(replyElements)
  if (replyText) return replyText

  if (hasFileElement(currentElements) || hasFileElement(replyElements)) {
    throw new Error('只支持读取 .txt 或 .md 提示词文件')
  }

  throw new Error('请在命令后输入提示词正文，或引用文本消息、txt/md 文件')
}

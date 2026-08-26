import { karin, type SendMessage } from 'node-karin'

import {
  addPrompt,
  getPrompt,
  readPromptLibrary,
  removePrompt,
  resolvePromptTextFromEvent,
  updatePrompt,
  type PromptMessage,
  type PromptRecord,
  type PromptType,
} from '@/utils/prompts'

export const PROMPT_LIST_REG = /^#提示词(?:列表)?$/
export const PROMPT_DETAIL_REG = /^#提示词(?:查看)?\s+(p\d+)$/i
export const ADD_PROMPT_REG = /^#(?:新增|添加)提示词\s+([01])\s+(\S+)(?:\s+([\s\S]*))?$/i
export const EDIT_PROMPT_REG = /^#(?:编辑|修改)提示词\s+(p\d+)\s+([01])\s+(\S+)(?:\s+([\s\S]*))?$/i
export const REMOVE_PROMPT_REG = /^#(?:删除|移除)提示词\s+(p\d+)$/i

interface PromptCommandEvent extends PromptMessage {
  /** 判断当前用户是否有群管理员权限。 */
  hasPermission?: (role: 'group.admin') => boolean
  /** 回复消息。 */
  reply: (message: SendMessage) => unknown
}

interface PromptDeps {
  list: () => PromptRecord[]
  get: (id: string) => PromptRecord | undefined
  add: (input: { type: PromptType, name: string, text: string }) => PromptRecord
  update: (id: string, input: { type: PromptType, name: string, text: string }) => PromptRecord
  remove: (id: string) => PromptRecord
  resolveText: (event: PromptMessage, inlineText: string) => Promise<string>
}

const defaultDeps: PromptDeps = {
  list: () => readPromptLibrary(),
  get: (id) => getPrompt(id),
  add: (input) => addPrompt(input),
  update: (id, input) => updatePrompt(id, input),
  remove: (id) => removePrompt(id),
  resolveText: (event, inlineText) => resolvePromptTextFromEvent(event, inlineText),
}

const PROMPT_AUTH_FAIL_TEXT = '只有管理员或群主可以管理提示词'

function canManagePrompts (event: PromptCommandEvent): boolean {
  return event.hasPermission?.('group.admin') === true
}

async function replyPromptError (event: PromptCommandEvent, error: unknown): Promise<true> {
  await event.reply(`提示词操作失败：${error instanceof Error ? error.message : String(error)}`)
  return true
}

async function replyNoPromptPermission (event: PromptCommandEvent): Promise<true> {
  await event.reply(PROMPT_AUTH_FAIL_TEXT)
  return true
}

/**
 * 格式化提示词列表。
 *
 * @param prompts - 提示词记录。
 * @returns 用户可读的提示词列表。
 */
export function formatPromptList (prompts: readonly PromptRecord[]): string {
  if (prompts.length === 0) return '提示词列表为空'

  return [
    '提示词列表：',
    ...prompts.map(prompt => `${prompt.id} [${prompt.type}] ${prompt.name}`),
  ].join('\n')
}

/**
 * 格式化提示词详情。
 *
 * @param prompt - 提示词记录。
 * @returns 用户可读的提示词详情。
 */
export function formatPromptDetail (prompt: PromptRecord): string {
  const typeLabel = prompt.type === 1 ? '需要图片' : '纯文本'
  return [
    `提示词 ${prompt.id}：`,
    `类型：${prompt.type}（${typeLabel}）`,
    `名称：${prompt.name}`,
    '正文：',
    prompt.text,
  ].join('\n')
}

/**
 * 处理 #提示词 和 #提示词列表。
 */
export async function handlePromptListMessage (
  event: PromptCommandEvent,
  deps: Partial<PromptDeps> = {}
): Promise<true> {
  const runtime = { ...defaultDeps, ...deps }

  try {
    await event.reply(formatPromptList(runtime.list()))
  } catch (error) {
    return replyPromptError(event, error)
  }

  return true
}

/**
 * 处理 #提示词 p001 和 #提示词查看 p001。
 */
export async function handlePromptDetailMessage (
  event: PromptCommandEvent,
  deps: Partial<PromptDeps> = {}
): Promise<true> {
  const runtime = { ...defaultDeps, ...deps }
  const id = event.msg.match(PROMPT_DETAIL_REG)?.[1] ?? ''

  try {
    const prompt = runtime.get(id)
    if (!prompt) {
      await event.reply(`未找到提示词：${id}`)
      return true
    }

    await event.reply(formatPromptDetail(prompt))
  } catch (error) {
    return replyPromptError(event, error)
  }

  return true
}

/**
 * 处理 #新增提示词 type name [text]。
 *
 * 正文为空时，从当前消息附带的 txt/md 文件、引用的 txt/md 文件或引用文本中读取。
 */
export async function handleAddPromptMessage (
  event: PromptCommandEvent,
  deps: Partial<PromptDeps> = {}
): Promise<true> {
  if (!canManagePrompts(event)) return replyNoPromptPermission(event)

  const runtime = { ...defaultDeps, ...deps }
  const match = event.msg.match(ADD_PROMPT_REG)
  const type = Number.parseInt(match?.[1] ?? '', 10) as PromptType
  const name = match?.[2] ?? ''
  const inlineText = match?.[3] ?? ''

  try {
    const text = await runtime.resolveText(event, inlineText)
    const prompt = runtime.add({ type, name, text })
    await event.reply(`提示词已新增：${prompt.id} ${prompt.name}`)
  } catch (error) {
    return replyPromptError(event, error)
  }

  return true
}

/**
 * 处理 #编辑提示词 id type name [text]。
 *
 * 正文为空时，正文来源规则与新增命令相同。
 */
export async function handleEditPromptMessage (
  event: PromptCommandEvent,
  deps: Partial<PromptDeps> = {}
): Promise<true> {
  if (!canManagePrompts(event)) return replyNoPromptPermission(event)

  const runtime = { ...defaultDeps, ...deps }
  const match = event.msg.match(EDIT_PROMPT_REG)
  const id = match?.[1] ?? ''
  const type = Number.parseInt(match?.[2] ?? '', 10) as PromptType
  const name = match?.[3] ?? ''
  const inlineText = match?.[4] ?? ''

  try {
    const text = await runtime.resolveText(event, inlineText)
    const prompt = runtime.update(id, { type, name, text })
    await event.reply(`提示词已更新：${prompt.id} ${prompt.name}`)
  } catch (error) {
    return replyPromptError(event, error)
  }

  return true
}

/**
 * 处理 #删除提示词 id。
 */
export async function handleRemovePromptMessage (
  event: PromptCommandEvent,
  deps: Partial<PromptDeps> = {}
): Promise<true> {
  if (!canManagePrompts(event)) return replyNoPromptPermission(event)

  const runtime = { ...defaultDeps, ...deps }
  const id = event.msg.match(REMOVE_PROMPT_REG)?.[1] ?? ''

  try {
    const prompt = runtime.remove(id)
    await event.reply(`提示词已删除：${prompt.id} ${prompt.name}`)
  } catch (error) {
    return replyPromptError(event, error)
  }

  return true
}

export const promptList = karin.command(PROMPT_LIST_REG, async (event) => {
  return handlePromptListMessage(event)
}, {
  name: '查看提示词列表',
  permission: 'all',
  log: true,
  priority: 9998,
})

export const promptDetail = karin.command(PROMPT_DETAIL_REG, async (event) => {
  return handlePromptDetailMessage(event)
}, {
  name: '查看提示词详情',
  permission: 'all',
  log: true,
  priority: 9998,
})

export const addPromptCommand = karin.command(ADD_PROMPT_REG, async (event) => {
  return handleAddPromptMessage(event)
}, {
  name: '新增提示词',
  permission: 'all',
  log: true,
  priority: 9998,
})

export const editPromptCommand = karin.command(EDIT_PROMPT_REG, async (event) => {
  return handleEditPromptMessage(event)
}, {
  name: '编辑提示词',
  permission: 'all',
  log: true,
  priority: 9998,
})

export const removePromptCommand = karin.command(REMOVE_PROMPT_REG, async (event) => {
  return handleRemovePromptMessage(event)
}, {
  name: '删除提示词',
  permission: 'all',
  log: true,
  priority: 9998,
})

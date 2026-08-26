import {
  addPrompt,
  readPromptLibrary,
  removePrompt,
  updatePrompt,
  type PromptRecord,
  type PromptType,
} from '@/utils/prompts'

export interface PromptWebInput {
  type: PromptType
  name: string
  text: string
}

function isRecord (value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeString (value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`提示词${label}不能为空`)
  }
  return value.trim()
}

/**
 * 解析 Web UI 提交的提示词表单。
 *
 * Web UI 始终发送数字 type，服务端不接受字符串或其他类型，保证写入格式统一。
 */
export function parsePromptWebInput (input: unknown): PromptWebInput {
  if (!isRecord(input)) throw new Error('请求体必须是有效的提示词对象')
  if (input.type !== 0 && input.type !== 1) {
    throw new Error('提示词 type 必须是 0 或 1')
  }

  return {
    type: input.type,
    name: normalizeString(input.name, '名称'),
    text: normalizeString(input.text, '正文'),
  }
}

export function getPromptWebRecords (): PromptRecord[] {
  return readPromptLibrary()
}

export function createPromptWebRecord (input: unknown): PromptRecord {
  return addPrompt(parsePromptWebInput(input))
}

export function updatePromptWebRecord (id: string, input: unknown): PromptRecord {
  return updatePrompt(id, parsePromptWebInput(input))
}

export function deletePromptWebRecord (id: string): PromptRecord {
  return removePrompt(id)
}

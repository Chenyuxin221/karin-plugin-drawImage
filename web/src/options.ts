import type { ApiMode, SelectOption } from './types'

export const disabledValue = '__disabled__'
export const customValue = '__custom__'

export const apiModes: Array<SelectOption & { value: ApiMode }> = [
  { value: 'images', label: 'Images', description: '图片生成接口' },
  { value: 'chatCompletions', label: 'Chat', description: '聊天补全接口' },
  { value: 'responses', label: 'Responses', description: '响应接口' },
  { value: 'custom', label: 'Custom', description: '自定义路径' },
]

export const imageDetails: SelectOption[] = [
  { value: 'auto', label: '自动' },
  { value: 'low', label: '低' },
  { value: 'high', label: '高' },
  { value: 'original', label: '原始' },
]

export const uploadModes: SelectOption[] = [
  { value: 'default', label: '原始地址', description: '直接使用消息图片地址' },
  { value: 'base64', label: 'Base64', description: '转换为 data URL' },
  { value: 'custom', label: '自定义图床', description: '上传后再提交' },
]

export const moderationOptions: SelectOption[] = [
  { value: disabledValue, label: '不发送' },
  { value: 'auto', label: '自动' },
  { value: 'low', label: '低' },
]

export const backgroundOptions: SelectOption[] = [
  { value: disabledValue, label: '不发送' },
  { value: 'auto', label: '自动' },
  { value: 'transparent', label: '透明' },
  { value: 'opaque', label: '不透明' },
]

export const formatOptions: SelectOption[] = [
  { value: disabledValue, label: '不发送' },
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
]

export const qualityOptions: SelectOption[] = [
  { value: disabledValue, label: '不发送' },
  { value: 'auto', label: '自动' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
]

export const sizeOptions: SelectOption[] = [
  { value: disabledValue, label: '不发送' },
  { value: 'auto', label: '自动' },
  { value: '1024x1024', label: '1024 x 1024' },
  { value: '1536x1024', label: '1536 x 1024' },
  { value: '1024x1536', label: '1024 x 1536' },
  { value: '2560x1440', label: '2560 x 1440' },
  { value: '3840x2160', label: '3840 x 2160' },
  { value: '2160x3840', label: '2160 x 3840' },
]

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { postMultipart, readBinary } from './http'

const HTTP_URL_REG = /^https?:\/\//i
const DATA_URL_REG = /^data:image\//i
const BASE64_PREFIX = 'base64://'

export interface ImageInputConfig {
  /** 图片上传模式 */
  imageUploadMode: 'default' | 'base64' | 'custom'
  /** 自定义图床上传地址 */
  imageUploadUrl: string
  /** 自定义图床 Bearer Token */
  imageUploadToken?: string
  /** 图片下载/上传超时时间 */
  requestTimeoutSeconds: number
  /** 输出图片格式，同时也作为无类型图片输入的兜底格式 */
  outputFormat?: string
}

/**
 * 归一化输出图片格式。
 *
 * @param outputFormat - 配置中的输出格式。
 * @returns 标准化后的图片扩展名。
 */
function normalizeOutputFormat (outputFormat?: string): 'png' | 'jpeg' | 'webp' {
  switch (String(outputFormat ?? '').trim().toLowerCase()) {
    case 'jpg':
    case 'jpeg':
      return 'jpeg'
    case 'webp':
      return 'webp'
    default:
      return 'png'
  }
}

/**
 * 根据输出格式生成默认 MIME 类型。
 *
 * @param outputFormat - 配置中的输出格式。
 * @returns 默认 MIME 类型。
 */
function getDefaultMimeType (outputFormat?: string): string {
  switch (normalizeOutputFormat(outputFormat)) {
    case 'jpeg':
      return 'image/jpeg'
    case 'webp':
      return 'image/webp'
    default:
      return 'image/png'
  }
}

/**
 * 根据 MIME 类型推断文件扩展名。
 *
 * @param mimeType - 图片 MIME 类型。
 * @returns 推断后的扩展名；无法识别时返回 undefined。
 */
function getExtensionFromMimeType (mimeType: string): string | undefined {
  switch (mimeType.trim().toLowerCase()) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpeg'
    case 'image/webp':
      return 'webp'
    case 'image/gif':
      return 'gif'
    case 'image/png':
      return 'png'
    default:
      return undefined
  }
}

/**
 * 根据输出格式生成兜底文件名。
 *
 * @param outputFormat - 配置中的输出格式。
 * @returns 默认文件名。
 */
function getDefaultFileName (outputFormat?: string): string {
  return `image.${normalizeOutputFormat(outputFormat)}`
}

/**
 * 根据 MIME 类型生成文件名。
 *
 * @param mimeType - 图片 MIME 类型。
 * @param outputFormat - 配置中的输出格式。
 * @returns 带扩展名的默认文件名。
 */
function getFileNameFromMimeType (mimeType: string, outputFormat?: string): string {
  return `image.${getExtensionFromMimeType(mimeType) ?? normalizeOutputFormat(outputFormat)}`
}

/**
 * 判断是否为 HTTP 图片地址。
 *
 * @param input - 原始图片输入。
 * @returns 是否为 HTTP/HTTPS 地址。
 */
function isHttpImageInput (input: string): boolean {
  return HTTP_URL_REG.test(input)
}

/**
 * 判断是否为 data URL 图片。
 *
 * @param input - 原始图片输入。
 * @returns 是否为 data:image URL。
 */
function isDataImageInput (input: string): boolean {
  return DATA_URL_REG.test(input)
}

/**
 * 根据文件后缀推断 MIME 类型。
 *
 * @param filePath - 文件路径。
 * @returns 推断后的图片 MIME 类型。
 */
function getMimeType (filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.webp':
      return 'image/webp'
    case '.gif':
      return 'image/gif'
    default:
      return 'image/png'
  }
}

/**
 * 根据输入源推断上传文件名。
 *
 * @param input - 原始图片输入。
 * @returns 适合上传时使用的文件名。
 */
function getUploadFileName (input: string, outputFormat?: string): string {
  if (input.startsWith('file://')) {
    return path.basename(fileURLToPath(input))
  }

  if (isHttpImageInput(input)) {
    try {
      const pathname = new URL(input).pathname
      const name = path.basename(pathname)
      return name && name !== '/' ? name : getDefaultFileName(outputFormat)
    } catch {
      return getDefaultFileName(outputFormat)
    }
  }

  return path.basename(input) || getDefaultFileName(outputFormat)
}

/**
 * 将任意图片输入读取成 buffer。
 *
 * @param input - 图片 URL、file URL、本地路径或 base64 前缀内容。
 * @param timeoutSeconds - 网络读取超时时间，单位秒。
 * @returns 图片 buffer、mime 和文件名。
 */
async function readImageSource (
  input: string,
  timeoutSeconds: number,
  outputFormat?: string,
): Promise<{ buffer: Buffer, mimeType: string, fileName: string }> {
  if (input.startsWith(BASE64_PREFIX)) {
    const mimeType = getDefaultMimeType(outputFormat)
    return {
      buffer: Buffer.from(input.slice(BASE64_PREFIX.length), 'base64'),
      mimeType,
      fileName: getFileNameFromMimeType(mimeType, outputFormat),
    }
  }

  if (isDataImageInput(input)) {
    const [, matchedMimeType = '', base64 = ''] = input.match(/^data:([^;]+);base64,(.+)$/i) ?? []
    const mimeType = matchedMimeType || getDefaultMimeType(outputFormat)
    return {
      buffer: Buffer.from(base64, 'base64'),
      mimeType,
      fileName: getFileNameFromMimeType(mimeType, outputFormat),
    }
  }

  if (isHttpImageInput(input)) {
    const response = await readBinary(input, timeoutSeconds)
    if (!response.ok) {
      throw new Error(`下载输入图片失败: ${response.status} ${response.statusText}`.trim())
    }

    return {
      buffer: response.buffer,
      mimeType: response.contentType || getDefaultMimeType(outputFormat),
      fileName: getUploadFileName(input, outputFormat),
    }
  }

  const filePath = input.startsWith('file://') ? fileURLToPath(input) : input
  return {
    buffer: await fs.readFile(filePath),
    mimeType: getMimeType(filePath),
    fileName: path.basename(filePath) || getDefaultFileName(outputFormat),
  }
}

/**
 * 从任意图床返回结构中递归提取第一个图片 URL。
 *
 * @param value - 图床响应 JSON 或其中的任意节点。
 * @returns 找到的图片 URL；没有时返回 undefined。
 */
function findFirstHttpUrl (value: unknown): string | undefined {
  if (typeof value === 'string') {
    const match = value.match(/https?:\/\/[^\s"'<>]+/)
    return match?.[0]
  }

  if (!value || typeof value !== 'object') return undefined

  if (Array.isArray(value)) {
    for (const item of value) {
      const url = findFirstHttpUrl(item)
      if (url) return url
    }
    return undefined
  }

  for (const item of Object.values(value as Record<string, unknown>)) {
    const url = findFirstHttpUrl(item)
    if (url) return url
  }

  return undefined
}

/**
 * 上传单张图片到自定义图床。
 *
 * 约定为 `POST multipart/form-data`，文件字段名固定 `file`。
 * 返回值兼容纯文本 URL，或任意 JSON 中递归出现的第一个 HTTP URL。
 *
 * @param input - 原始图片输入。
 * @param uploadUrl - 图床上传接口地址。
 * @param timeoutSeconds - 上传超时时间，单位秒。
 * @returns 上传后的图片 URL。
 */
async function uploadImageToCustomHost (
  input: string,
  uploadUrl: string,
  timeoutSeconds: number,
  imageUploadToken?: string,
  outputFormat?: string,
): Promise<string> {
  const file = await readImageSource(input, timeoutSeconds, outputFormat)
  const response = await postMultipart(uploadUrl, {
    fieldName: 'file',
    fileName: file.fileName,
    contentType: file.mimeType,
    buffer: file.buffer,
  }, timeoutSeconds, {
    bearerToken: imageUploadToken,
  })

  if (!response.ok) {
    throw new Error(`上传图床失败: ${response.status} ${response.statusText}`.trim())
  }

  const plainUrl = response.text.trim()
  if (isHttpImageInput(plainUrl)) {
    return plainUrl
  }

  try {
    const parsed = JSON.parse(response.text)
    const url = findFirstHttpUrl(parsed)
    if (url) return url
  } catch {}

  throw new Error('上传图床失败: 返回内容中未找到图片地址')
}

/**
 * 将 Karin/QQ 得到的图片输入统一转换成上游可接收的 URL 或 data URL。
 *
 * @param images - Karin 事件里提取到的图片地址、file URL 或 base64:// 内容。
 * @param config - 图片输入转换配置。
 * @returns 上游 API 可读取的图片 URL 或 data URL 列表。
 */
export async function resolveApiImageInputs (
  images: readonly string[],
  config: ImageInputConfig,
): Promise<string[]> {
  if (config.imageUploadMode === 'default') {
    return [...images]
  }

  if (config.imageUploadMode === 'base64') {
    return Promise.all(images.map(async (input) => {
      if (isDataImageInput(input)) {
        return input
      }

      const file = await readImageSource(input, config.requestTimeoutSeconds, config.outputFormat)
      return `data:${file.mimeType};base64,${file.buffer.toString('base64')}`
    }))
  }

  if (!config.imageUploadUrl) {
    throw new Error('图片上传方式已选择“上传图床”，请先配置自定义图床地址')
  }

  return Promise.all(images.map(async (input) => uploadImageToCustomHost(
    input,
    config.imageUploadUrl,
    config.requestTimeoutSeconds,
    config.imageUploadToken,
    config.outputFormat,
  )))
}

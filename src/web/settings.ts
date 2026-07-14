import { dir } from '@/dir'
import {
  DRAW_PROFILE_IDS,
  getDrawSettings,
  saveDrawSettings,
  type DrawProfileId,
} from '@/utils/config'
import {
  DRAW_API_MODES,
  DRAW_CONFIG_KEYS,
  IMAGE_DETAIL_OPTIONS,
  IMAGE_UPLOAD_MODES,
  type DrawConfig,
  type DrawConfigSource,
} from '@/utils/draw'

const GLOBAL_WEB_KEYS = DRAW_CONFIG_KEYS.filter((key) => ![
  'name',
  'useEditRoute',
  'cooldownSeconds',
].includes(key))

const PROFILE_WEB_KEYS = DRAW_CONFIG_KEYS.filter((key) => ![
  'imageUploadMode',
  'imageUploadUrl',
  'imageUploadToken',
  'taskLockEnabled',
  'cooldownSeconds',
  'requestTimeoutSeconds',
  'n',
].includes(key))

const STRING_KEYS = new Set([
  'name',
  'apiMode',
  'apiKey',
  'baseUrl',
  'endpoint',
  'model',
  'imageDetail',
  'imageUploadMode',
  'imageUploadUrl',
  'imageUploadToken',
  'moderation',
  'background',
  'outputFormat',
  'quality',
  'size',
])

type WebConfigSource = Record<string, string | number | boolean | undefined>

export interface DrawWebSettings {
  activeProfile: DrawProfileId
  global: WebConfigSource
  profiles: Record<DrawProfileId, WebConfigSource>
  resolvedProfiles: Record<DrawProfileId, DrawConfig>
}

function isRecord (value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasValue (source: DrawConfigSource, key: keyof DrawConfigSource): boolean {
  return source[key] !== undefined && source[key] !== null
}

function materializeGlobal (raw: DrawConfigSource, resolved: DrawConfig): WebConfigSource {
  return Object.fromEntries(GLOBAL_WEB_KEYS.map((key) => [
    key,
    hasValue(raw, key) ? raw[key] : resolved[key],
  ])) as WebConfigSource
}

function materializeProfile (
  profileId: DrawProfileId,
  raw: DrawConfigSource,
  resolved: DrawConfig
): WebConfigSource {
  return Object.fromEntries(PROFILE_WEB_KEYS.map((key) => {
    if (key === 'name') return [key, hasValue(raw, key) ? raw[key] : resolved.name]
    if (key === 'useEditRoute') return [key, hasValue(raw, key) ? raw[key] : false]
    return [key, hasValue(raw, key) ? raw[key] : '']
  }).concat([['id', profileId]])) as WebConfigSource
}

export function getDrawWebSettings (filePath = dir.configFile): DrawWebSettings {
  const settings = getDrawSettings(filePath)

  return {
    activeProfile: settings.activeProfile,
    global: materializeGlobal(settings.rawGlobal, settings.global),
    profiles: Object.fromEntries(DRAW_PROFILE_IDS.map((profileId) => [
      profileId,
      materializeProfile(profileId, settings.rawProfiles[profileId], settings.profiles[profileId]),
    ])) as Record<DrawProfileId, WebConfigSource>,
    resolvedProfiles: settings.profiles,
  }
}

function normalizeString (value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeBoolean (value: unknown): boolean {
  return value === true || value === 'true'
}

function normalizePositiveInteger (value: unknown, label: string): number {
  const normalized = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(`${label}必须是大于 0 的整数`)
  }
  return normalized
}

function sanitizeScope (
  value: unknown,
  keys: readonly string[],
  label: string
): DrawConfigSource {
  if (!isRecord(value)) throw new Error(`${label}不是有效的配置对象`)

  const result: Record<string, unknown> = {}
  for (const key of keys) {
    const fieldValue = value[key]
    if (key === 'useEditRoute' || key === 'taskLockEnabled') {
      result[key] = normalizeBoolean(fieldValue)
    } else if (key === 'n') {
      result[key] = normalizePositiveInteger(fieldValue, '生成数量')
    } else if (key === 'requestTimeoutSeconds') {
      result[key] = normalizePositiveInteger(fieldValue, '请求超时')
    } else if (STRING_KEYS.has(key)) {
      result[key] = normalizeString(fieldValue)
    }
  }

  return result as DrawConfigSource
}

function validateUrl (value: unknown, label: string): void {
  const text = normalizeString(value)
  try {
    const url = new URL(text)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsupported protocol')
  } catch {
    throw new Error(`${label}必须是有效的 HTTP(S) 地址`)
  }
}

function validateGlobal (global: DrawConfigSource): void {
  const apiMode = normalizeString(global.apiMode)
  if (!DRAW_API_MODES.includes(apiMode as typeof DRAW_API_MODES[number])) {
    throw new Error('全局接口模式无效')
  }

  validateUrl(global.baseUrl, 'API 服务地址')
  if (!normalizeString(global.model)) throw new Error('全局模型不能为空')

  const imageDetail = normalizeString(global.imageDetail)
  if (!IMAGE_DETAIL_OPTIONS.includes(imageDetail as typeof IMAGE_DETAIL_OPTIONS[number])) {
    throw new Error('全局图像细节选项无效')
  }

  const uploadMode = normalizeString(global.imageUploadMode)
  if (!IMAGE_UPLOAD_MODES.includes(uploadMode as typeof IMAGE_UPLOAD_MODES[number])) {
    throw new Error('图片上传方式无效')
  }

  if (apiMode === 'custom' && !normalizeString(global.endpoint)) {
    throw new Error('自定义接口模式必须填写请求路径')
  }

  if (uploadMode === 'custom') {
    validateUrl(global.imageUploadUrl, '自定义图床地址')
  }
}

function validateProfile (profile: DrawConfigSource, profileId: DrawProfileId): void {
  const label = normalizeString(profile.name) || profileId
  if (!normalizeString(profile.name)) throw new Error(`${label}名称不能为空`)

  const apiMode = normalizeString(profile.apiMode)
  if (apiMode && !DRAW_API_MODES.includes(apiMode as typeof DRAW_API_MODES[number])) {
    throw new Error(`${label}的接口模式无效`)
  }

  const imageDetail = normalizeString(profile.imageDetail)
  if (imageDetail && !IMAGE_DETAIL_OPTIONS.includes(imageDetail as typeof IMAGE_DETAIL_OPTIONS[number])) {
    throw new Error(`${label}的图像细节选项无效`)
  }

  if (apiMode === 'custom' && !normalizeString(profile.endpoint)) {
    throw new Error(`${label}使用自定义接口时必须填写请求路径`)
  }

  const baseUrl = normalizeString(profile.baseUrl)
  if (baseUrl) validateUrl(baseUrl, `${label}的 API 服务地址`)
}

export function parseDrawWebSettings (input: unknown): {
  activeProfile: DrawProfileId
  global: DrawConfigSource
  profiles: Record<DrawProfileId, DrawConfigSource>
} {
  if (!isRecord(input)) throw new Error('请求体必须是有效的配置对象')

  const activeProfile = normalizeString(input.activeProfile) as DrawProfileId
  if (!DRAW_PROFILE_IDS.includes(activeProfile)) throw new Error('当前配置档无效')

  const global = sanitizeScope(input.global, GLOBAL_WEB_KEYS, '全局配置')
  validateGlobal(global)

  if (!isRecord(input.profiles)) throw new Error('配置档数据无效')
  const profilesInput = input.profiles
  const profiles = Object.fromEntries(DRAW_PROFILE_IDS.map((profileId) => {
    const profile = sanitizeScope(profilesInput[profileId], PROFILE_WEB_KEYS, profileId)
    validateProfile(profile, profileId)
    return [profileId, profile]
  })) as Record<DrawProfileId, DrawConfigSource>

  return { activeProfile, global, profiles }
}

export async function saveDrawWebSettings (
  input: unknown,
  filePath = dir.configFile
): Promise<DrawWebSettings> {
  const settings = parseDrawWebSettings(input)
  await saveDrawSettings(settings, filePath)
  return getDrawWebSettings(filePath)
}

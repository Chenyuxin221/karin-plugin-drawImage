export const profileIds = ['profile1', 'profile2', 'profile3'] as const
export type ProfileId = typeof profileIds[number]
export type ScopeId = 'global' | ProfileId

export type ApiMode = 'images' | 'chatCompletions' | 'responses' | 'custom'
export type ImageDetail = 'auto' | 'low' | 'high' | 'original'
export type ImageUploadMode = 'default' | 'base64' | 'custom'

export interface ConfigSource {
  id?: string
  name?: string
  apiMode?: ApiMode | ''
  apiKey?: string
  baseUrl?: string
  endpoint?: string
  model?: string
  imageDetail?: ImageDetail | ''
  imageUploadMode?: ImageUploadMode
  imageUploadUrl?: string
  imageUploadToken?: string
  useEditRoute?: boolean
  taskLockEnabled?: boolean
  requestTimeoutSeconds?: number | string
  moderation?: string
  background?: string
  outputFormat?: string
  quality?: string
  size?: string
  n?: number | string
}

export interface ResolvedConfig extends Required<Omit<ConfigSource, 'id' | 'moderation' | 'background' | 'outputFormat' | 'quality' | 'size' | 'n'>> {
  moderation?: string
  background?: string
  outputFormat?: string
  quality?: string
  size?: string
  n?: number
}

export interface DrawSettings {
  activeProfile: ProfileId
  global: ConfigSource
  profiles: Record<ProfileId, ConfigSource>
  resolvedProfiles: Record<ProfileId, ResolvedConfig>
}

export interface ApiResponse<T> {
  code?: number
  success?: boolean
  data?: T
  message?: string
}

export type FieldKey = keyof ConfigSource

export interface SelectOption {
  value: string
  label: string
  description?: string
}

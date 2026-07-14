import type { ApiResponse, DrawSettings } from './types'

const tokenKeys = {
  userId: 'userId',
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
} as const

function getToken (key: keyof typeof tokenKeys): string | null {
  return localStorage.getItem(tokenKeys[key])
}

function unwrap<T> (response: ApiResponse<T>, fallback: string): T {
  if ((response.success || response.code === 200) && response.data !== undefined) return response.data
  throw new Error(response.message || fallback)
}

let refreshPromise: Promise<boolean> | null = null

async function refreshAccessToken (): Promise<boolean> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const accessToken = getToken('accessToken')
    const refreshToken = getToken('refreshToken')
    if (!accessToken || !refreshToken) return false

    try {
      const response = await fetch('/api/v1/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, refreshToken }),
      })
      const payload = await response.json() as ApiResponse<{ accessToken: string }>
      const data = unwrap(payload, 'Karin 会话已过期')
      localStorage.setItem(tokenKeys.accessToken, data.accessToken)
      return true
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

async function request<T> (
  path: string,
  init: RequestInit = {},
  retry = true
): Promise<T> {
  const accessToken = getToken('accessToken')
  const userId = getToken('userId')
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  if (userId) headers.set('x-user-id', userId)

  const response = await fetch(path, { ...init, headers })
  if ([401, 419].includes(response.status) && retry && await refreshAccessToken()) {
    return request<T>(path, init, false)
  }

  const payload = await response.json().catch(() => ({})) as ApiResponse<T>
  if (!response.ok) {
    throw new Error(payload.message || `请求失败 (${response.status})`)
  }
  return unwrap(payload, '接口未返回有效数据')
}

export function getSettings (): Promise<DrawSettings> {
  return request('/drawimages/api/config')
}

export function saveSettings (settings: DrawSettings): Promise<DrawSettings> {
  return request('/drawimages/api/config', {
    method: 'POST',
    body: JSON.stringify({
      activeProfile: settings.activeProfile,
      global: settings.global,
      profiles: settings.profiles,
    }),
  })
}

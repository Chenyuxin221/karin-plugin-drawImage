import {
  AlertTriangle,
  Check,
  CheckCircle2,
  CircleDot,
  LoaderCircle,
  Moon,
  Network,
  RefreshCw,
  Save,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Sun,
  WandSparkles,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { getSettings, saveSettings } from './api'
import {
  SegmentedField,
  SelectField,
  SizeField,
  SwitchField,
  TextField,
} from './components/Fields'
import {
  apiModes,
  backgroundOptions,
  disabledValue,
  formatOptions,
  imageDetails,
  moderationOptions,
  qualityOptions,
  uploadModes,
} from './options'
import {
  profileIds,
  type ApiMode,
  type ConfigSource,
  type DrawSettings,
  type FieldKey,
  type ScopeId,
} from './types'

type Notice = { type: 'success' | 'error', message: string }

const endpointByMode: Record<Exclude<ApiMode, 'custom'>, string> = {
  images: '/v1/images/generations',
  chatCompletions: '/v1/chat/completions',
  responses: '/v1/responses',
}

function cloneSettings (settings: DrawSettings): DrawSettings {
  return structuredClone(settings)
}

function sourceValue (source: ConfigSource, key: FieldKey): unknown {
  return source[key]
}

function setSourceValue (source: ConfigSource, key: FieldKey, value: unknown): ConfigSource {
  return { ...source, [key]: value }
}

function isBlank (value: unknown): boolean {
  return value === '' || value === null || value === undefined
}

function asString (value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

function asBoolean (value: unknown): boolean {
  return value === true || value === 'true'
}

function effectiveValue (settings: DrawSettings, scope: ScopeId, key: FieldKey): unknown {
  if (scope === 'global') return sourceValue(settings.global, key)
  const local = sourceValue(settings.profiles[scope], key)
  return isBlank(local) ? sourceValue(settings.global, key) : local
}

function effectiveMode (settings: DrawSettings, scope: ScopeId): ApiMode {
  return asString(effectiveValue(settings, scope, 'apiMode')) as ApiMode
}

function isHttpUrl (value: unknown): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(asString(value)).protocol)
  } catch {
    return false
  }
}

function validateSettings (settings: DrawSettings): string[] {
  const errors: string[] = []
  if (!isHttpUrl(settings.global.baseUrl)) errors.push('全局 API 服务地址无效')
  if (!asString(settings.global.model).trim()) errors.push('全局模型不能为空')

  const count = Number(settings.global.n)
  if (!Number.isInteger(count) || count <= 0) errors.push('生成数量必须是大于 0 的整数')
  const timeout = Number(settings.global.requestTimeoutSeconds)
  if (!Number.isInteger(timeout) || timeout <= 0) errors.push('请求超时必须是大于 0 的整数')

  if (settings.global.apiMode === 'custom' && !asString(settings.global.endpoint).trim()) {
    errors.push('全局自定义接口缺少请求路径')
  }
  if (settings.global.imageUploadMode === 'custom' && !isHttpUrl(settings.global.imageUploadUrl)) {
    errors.push('自定义图床地址无效')
  }

  for (const profileId of profileIds) {
    const profile = settings.profiles[profileId]
    const name = asString(profile.name).trim() || profileId
    if (!asString(profile.name).trim()) errors.push(`${name}名称不能为空`)
    if (!isBlank(profile.baseUrl) && !isHttpUrl(profile.baseUrl)) errors.push(`${name}的 API 服务地址无效`)
    if (profile.apiMode === 'custom' && !asString(profile.endpoint).trim()) {
      errors.push(`${name}使用自定义接口时缺少请求路径`)
    }
  }

  return errors
}

function TooltipIconButton ({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <span className='tooltip-wrap'>
      <button className='icon-button' type='button' aria-label={label} disabled={disabled} onClick={onClick}>
        {children}
      </button>
      <span className='tooltip' role='tooltip'>{label}</span>
    </span>
  )
}

function LoadingView () {
  return (
    <main className='loading-page'>
      <div className='brand-mark'><WandSparkles aria-hidden='true' /></div>
      <LoaderCircle className='spin' size={20} aria-hidden='true' />
      <span>正在读取配置</span>
    </main>
  )
}

function Section ({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className='config-section'>
      <div className='config-section__heading'>
        <span className='section-icon'>{icon}</span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className='field-grid'>{children}</div>
    </section>
  )
}

function ModeNotice ({ mode }: { mode: ApiMode }) {
  if (mode !== 'chatCompletions') return null
  return (
    <div className='mode-notice'>
      <CircleDot size={17} aria-hidden='true' />
      <span>Chat Completions 仅发送模型、提示词和输入图片，输出参数已收起。</span>
    </div>
  )
}

interface EditorProps {
  settings: DrawSettings
  scope: ScopeId
  onChange: (key: FieldKey, value: unknown) => void
  onInherit: (key: FieldKey) => void
}

function ConfigEditor ({ settings, scope, onChange, onInherit }: EditorProps) {
  const global = scope === 'global'
  const source = global ? settings.global : settings.profiles[scope]
  const mode = effectiveMode(settings, scope)
  const inherited = (key: FieldKey) => global ? undefined : isBlank(sourceValue(source, key))
  const value = (key: FieldKey) => effectiveValue(settings, scope, key)
  const inherit = (key: FieldKey) => global ? undefined : () => onInherit(key)
  const fixedEndpoint = mode === 'custom' ? asString(value('endpoint')) : endpointByMode[mode]

  return (
    <div className='config-sections'>
      {!global && (
        <Section
          icon={<SlidersHorizontal size={18} />}
          title='配置档'
          description='名称与当前使用状态'
        >
          <TextField
            label='配置名称'
            value={asString(source.name)}
            placeholder='配置一'
            onChange={(next) => onChange('name', next)}
          />
          <SwitchField
            label='当前使用'
            help='绘图命令读取当前配置档'
            value={settings.activeProfile === scope}
            onChange={(selected) => selected && onChange('id', scope)}
          />
        </Section>
      )}

      <Section
        icon={<Network size={18} />}
        title='接口连接'
        description='上游接口、鉴权和图片输入'
      >
        <div className='field-span-full'>
          <SegmentedField
            label='接口模式'
            value={mode}
            options={apiModes}
            inherited={inherited('apiMode')}
            onChange={(next) => onChange('apiMode', next)}
            onInherit={inherit('apiMode')}
          />
        </div>
        <TextField
          label='API 服务地址'
          help='只填写服务根地址，不包含请求路径'
          value={asString(value('baseUrl'))}
          type='url'
          inputMode='url'
          placeholder='https://api.example.com'
          inherited={inherited('baseUrl')}
          onChange={(next) => onChange('baseUrl', next)}
          onInherit={inherit('baseUrl')}
        />
        <TextField
          label='API 密钥'
          value={asString(value('apiKey'))}
          type='password'
          placeholder='sk-...'
          inherited={inherited('apiKey')}
          onChange={(next) => onChange('apiKey', next)}
          onInherit={inherit('apiKey')}
        />
        <TextField
          label='请求路径'
          help={mode === 'custom' ? '自定义模式会使用此路径' : '当前模式使用固定路径'}
          value={fixedEndpoint}
          disabled={mode !== 'custom'}
          placeholder='/v1/images/generations'
          inherited={mode === 'custom' ? inherited('endpoint') : undefined}
          onChange={(next) => onChange('endpoint', next)}
          onInherit={mode === 'custom' ? inherit('endpoint') : undefined}
        />
        {global && (
          <SelectField
            label='图片输入方式'
            help='控制消息图片提交给上游前的处理方式'
            value={asString(source.imageUploadMode)}
            options={uploadModes}
            onChange={(next) => onChange('imageUploadMode', next)}
          />
        )}
        {global && source.imageUploadMode === 'custom' && (
          <>
            <TextField
              label='图床上传地址'
              value={asString(source.imageUploadUrl)}
              type='url'
              inputMode='url'
              placeholder='https://upload.example.com/api/upload'
              onChange={(next) => onChange('imageUploadUrl', next)}
            />
            <TextField
              label='图床 Bearer Token'
              value={asString(source.imageUploadToken)}
              type='password'
              onChange={(next) => onChange('imageUploadToken', next)}
            />
          </>
        )}
      </Section>

      <Section
        icon={<Sparkles size={18} />}
        title='生成参数'
        description='模型、图像理解与输出规格'
      >
        <TextField
          label='模型'
          value={asString(value('model'))}
          placeholder='gpt-image-2'
          inherited={inherited('model')}
          onChange={(next) => onChange('model', next)}
          onInherit={inherit('model')}
        />
        <SelectField
          label='输入图像细节'
          help='图生图时发送给上游的细节级别'
          value={asString(value('imageDetail'))}
          options={imageDetails}
          inherited={inherited('imageDetail')}
          onChange={(next) => onChange('imageDetail', next)}
          onInherit={inherit('imageDetail')}
        />
        <div className='field-span-full'><ModeNotice mode={mode} /></div>
        {mode !== 'chatCompletions' && (
          <>
            <SizeField
              label='输出尺寸'
              value={asString(value('size')) || disabledValue}
              inherited={inherited('size')}
              onChange={(next) => onChange('size', next)}
              onInherit={inherit('size')}
            />
            <SelectField
              label='生成质量'
              value={asString(value('quality')) || disabledValue}
              options={qualityOptions}
              inherited={inherited('quality')}
              onChange={(next) => onChange('quality', next)}
              onInherit={inherit('quality')}
            />
            <SelectField
              label='输出格式'
              value={asString(value('outputFormat')) || disabledValue}
              options={formatOptions}
              inherited={inherited('outputFormat')}
              onChange={(next) => onChange('outputFormat', next)}
              onInherit={inherit('outputFormat')}
            />
            <SelectField
              label='背景'
              value={asString(value('background')) || disabledValue}
              options={backgroundOptions}
              inherited={inherited('background')}
              onChange={(next) => onChange('background', next)}
              onInherit={inherit('background')}
            />
            <SelectField
              label='审核级别'
              value={asString(value('moderation')) || disabledValue}
              options={moderationOptions}
              inherited={inherited('moderation')}
              onChange={(next) => onChange('moderation', next)}
              onInherit={inherit('moderation')}
            />
          </>
        )}
      </Section>

      {(global || mode === 'images') && (
        <Section
          icon={<Settings2 size={18} />}
          title='运行控制'
          description='请求生命周期与任务并发'
        >
          {global && (
            <>
              <SwitchField
                label='绘图任务锁'
                help='同一时间只允许一个绘图任务'
                value={asBoolean(source.taskLockEnabled)}
                onChange={(next) => onChange('taskLockEnabled', next)}
              />
              <TextField
                label='请求超时（秒）'
                value={asString(source.requestTimeoutSeconds)}
                type='number'
                inputMode='numeric'
                onChange={(next) => onChange('requestTimeoutSeconds', next)}
              />
              <TextField
                label='单次生成数量'
                help='Images 和 Custom 模式使用'
                value={asString(source.n)}
                type='number'
                inputMode='numeric'
                onChange={(next) => onChange('n', next)}
              />
            </>
          )}
          {!global && mode === 'images' && (
            <SwitchField
              label='图生图使用 Edit 路由'
              help='带输入图片时切换到 /v1/images/edits'
              value={asBoolean(source.useEditRoute)}
              onChange={(next) => onChange('useEditRoute', next)}
            />
          )}
        </Section>
      )}
    </div>
  )
}

function Workspace ({ initialSettings }: { initialSettings: DrawSettings }) {
  const [settings, setSettings] = useState(() => cloneSettings(initialSettings))
  const [savedSettings, setSavedSettings] = useState(() => cloneSettings(initialSettings))
  const [scope, setScope] = useState<ScopeId>(initialSettings.activeProfile)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('drawimages-theme')
    return stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem('drawimages-theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 3200)
    return () => window.clearTimeout(timer)
  }, [notice])

  const dirty = useMemo(() => JSON.stringify({
    activeProfile: settings.activeProfile,
    global: settings.global,
    profiles: settings.profiles,
  }) !== JSON.stringify({
    activeProfile: savedSettings.activeProfile,
    global: savedSettings.global,
    profiles: savedSettings.profiles,
  }), [settings, savedSettings])

  const validationErrors = useMemo(() => validateSettings(settings), [settings])

  const update = useCallback((key: FieldKey, value: unknown) => {
    setSettings(current => {
      if (key === 'id' && scope !== 'global') {
        return { ...current, activeProfile: scope }
      }
      if (scope === 'global') {
        return { ...current, global: setSourceValue(current.global, key, value) }
      }
      return {
        ...current,
        profiles: {
          ...current.profiles,
          [scope]: setSourceValue(current.profiles[scope], key, value),
        },
      }
    })
  }, [scope])

  const inherit = useCallback((key: FieldKey) => {
    if (scope === 'global') return
    update(key, '')
  }, [scope, update])

  const refresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      const next = await getSettings()
      setSettings(cloneSettings(next))
      setSavedSettings(cloneSettings(next))
      setNotice({ type: 'success', message: '已重新读取配置' })
    } catch (cause) {
      setNotice({ type: 'error', message: cause instanceof Error ? cause.message : '读取失败' })
    } finally {
      setRefreshing(false)
    }
  }

  const save = async () => {
    if (!dirty || validationErrors.length || saving) return
    setSaving(true)
    try {
      const next = await saveSettings(settings)
      setSettings(cloneSettings(next))
      setSavedSettings(cloneSettings(next))
      setNotice({ type: 'success', message: '配置已保存' })
    } catch (cause) {
      setNotice({ type: 'error', message: cause instanceof Error ? cause.message : '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  const scopeTitle = scope === 'global'
    ? '全局默认'
    : asString(settings.profiles[scope].name) || scope
  const scopeMode = effectiveMode(settings, scope)

  return (
    <div className='workspace'>
      <main className='content'>
        <header className='page-heading'>
          <div className='page-heading__copy'>
            <p className='eyebrow'>DRAW IMAGES</p>
            <h1>AI 绘图配置</h1>
            <p className='page-description'>管理上游接口、配置档与图像生成参数</p>
          </div>
          <div className='page-heading__actions'>
            {dirty && <span className='dirty-state'><i />有未保存更改</span>}
            <TooltipIconButton label={dark ? '切换到浅色模式' : '切换到深色模式'} onClick={() => setDark(value => !value)}>
              {dark ? <Sun size={18} aria-hidden='true' /> : <Moon size={18} aria-hidden='true' />}
            </TooltipIconButton>
            <TooltipIconButton label='重新读取配置' onClick={refresh} disabled={refreshing || saving}>
              <RefreshCw className={refreshing ? 'spin' : ''} size={18} aria-hidden='true' />
            </TooltipIconButton>
            <button
              className='button button--primary save-button'
              type='button'
              aria-label='保存配置'
              disabled={!dirty || Boolean(validationErrors.length) || saving}
              onClick={save}
            >
              {saving ? <LoaderCircle className='spin' size={17} /> : <Save size={17} />}
              <span>保存配置</span>
            </button>
          </div>
        </header>

        <div className='scope-bar'>
          <nav className='scope-tabs' role='tablist' aria-label='绘图配置档'>
            {(['global', ...profileIds] as ScopeId[]).map((scopeId, index) => {
              const globalScope = scopeId === 'global'
              const active = !globalScope && settings.activeProfile === scopeId
              const title = globalScope
                ? '全局默认'
                : asString(settings.profiles[scopeId].name) || `配置 ${index}`

              return (
                <button
                  key={scopeId}
                  className={scope === scopeId ? 'is-active' : ''}
                  type='button'
                  role='tab'
                  aria-selected={scope === scopeId}
                  title={active ? `${title}（当前使用）` : title}
                  onClick={() => setScope(scopeId)}
                >
                  <span>{title}</span>
                  {active && <CheckCircle2 className='active-check' size={14} aria-label='当前使用' />}
                </button>
              )
            })}
          </nav>
          <div className='scope-status' aria-label={`当前编辑 ${scopeTitle}`}>
            <span className={`mode-dot mode-dot--${scopeMode}`} />
            <span>{scopeMode}</span>
            {scope !== 'global' && settings.activeProfile === scope && <em>当前使用</em>}
          </div>
        </div>

        {validationErrors.length > 0 && (
          <div className='validation-banner'>
            <AlertTriangle size={18} aria-hidden='true' />
            <span>{validationErrors[0]}</span>
            {validationErrors.length > 1 && <small>另有 {validationErrors.length - 1} 项</small>}
          </div>
        )}

        <ConfigEditor settings={settings} scope={scope} onChange={update} onInherit={inherit} />

        <footer className='content-footer'>
          <span>karin-plugin-drawImages</span>
          <span>配置保存后立即生效</span>
        </footer>
      </main>

      {notice && (
        <div className={`toast toast--${notice.type}`} role='status'>
          {notice.type === 'success' ? <Check size={17} /> : <X size={17} />}
          {notice.message}
        </div>
      )}
    </div>
  )
}

export default function App () {
  const [settings, setSettings] = useState<DrawSettings | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      setSettings(await getSettings())
    } catch (cause) {
      setSettings(null)
      setError(cause instanceof Error ? cause.message : '读取配置失败')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (error) {
    return (
      <main className='error-page'>
        <AlertTriangle size={24} />
        <h1>配置读取失败</h1>
        <p>{error}</p>
        <button className='button button--primary' type='button' onClick={load}>
          <RefreshCw size={17} />重新加载
        </button>
      </main>
    )
  }
  if (!settings) return <LoadingView />

  return <Workspace initialSettings={settings} />
}

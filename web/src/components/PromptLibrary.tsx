import {
  BookOpen,
  Check,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'

import { createPrompt, deletePrompt, getPrompts, updatePrompt } from '../api'
import { SegmentedField, TextAreaField, TextField } from './Fields'
import type { PromptInput, PromptRecord, PromptType, SelectOption } from '../types'

type Notice = { type: 'success' | 'error', message: string }
type PromptDraft = PromptInput & { id?: string }

const MAX_PROMPT_TEXT_LENGTH = 512 * 1024
const promptTypeOptions: SelectOption[] = [
  { value: '0', label: 'type 0 · 纯文本', description: '不要求图片' },
  { value: '1', label: 'type 1 · 需要图片', description: '必须附带图片' },
]

function getEmptyDraft (): PromptDraft {
  return { type: 0, name: '', text: '' }
}

function PromptIconButton ({
  label,
  onClick,
  disabled,
  children,
  danger = false,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
  danger?: boolean
}) {
  return (
    <span className='tooltip-wrap'>
      <button
        className={`icon-button${danger ? ' icon-button--danger' : ''}`}
        type='button'
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
      >
        {children}
      </button>
      <span className='tooltip' role='tooltip'>{label}</span>
    </span>
  )
}

function promptTypeLabel (type: PromptType): string {
  return type === 1 ? 'type 1 · 需要图片' : 'type 0 · 纯文本'
}

function promptTypeIcon (type: PromptType): ReactNode {
  return type === 1
    ? <ImageIcon size={13} aria-hidden='true' />
    : <FileText size={13} aria-hidden='true' />
}

export function PromptLibrary ({ onNotice }: { onNotice: (notice: Notice) => void }) {
  const [prompts, setPrompts] = useState<PromptRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<PromptDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')

  const load = useCallback(async () => {
    setError('')
    setRefreshing(true)
    try {
      setPrompts(await getPrompts())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '读取提示词库失败')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load().catch(() => undefined)
  }, [load])

  const filteredPrompts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return prompts
    return prompts.filter(prompt => [prompt.id, prompt.name, prompt.text].some(value => value.toLowerCase().includes(normalizedQuery)))
  }, [prompts, query])

  const setDraftValue = (patch: Partial<PromptDraft>) => {
    setDraft(current => current ? { ...current, ...patch } : current)
  }

  const closeEditor = () => {
    if (!saving) setDraft(null)
  }

  const saveDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft || saving) return

    const input: PromptInput = {
      type: draft.type,
      name: draft.name.trim(),
      text: draft.text.trim(),
    }
    if (!input.name || !input.text) {
      onNotice({ type: 'error', message: '请填写提示词名称和正文' })
      return
    }

    setSaving(true)
    try {
      const saved = draft.id
        ? await updatePrompt(draft.id, input)
        : await createPrompt(input)
      setPrompts(current => draft.id
        ? current.map(prompt => prompt.id === saved.id ? saved : prompt)
        : [...current, saved])
      setDraft(null)
      onNotice({ type: 'success', message: draft.id ? '提示词已更新' : '提示词已新增' })
    } catch (cause) {
      onNotice({ type: 'error', message: cause instanceof Error ? cause.message : '保存提示词失败' })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (prompt: PromptRecord) => {
    if (deletingId || !window.confirm(`确定删除提示词“${prompt.name}”（${prompt.id}）吗？`)) return

    setDeletingId(prompt.id)
    try {
      await deletePrompt(prompt.id)
      setPrompts(current => current.filter(item => item.id !== prompt.id))
      if (draft?.id === prompt.id) setDraft(null)
      onNotice({ type: 'success', message: `已删除提示词 ${prompt.id}` })
    } catch (cause) {
      onNotice({ type: 'error', message: cause instanceof Error ? cause.message : '删除提示词失败' })
    } finally {
      setDeletingId('')
    }
  }

  const draftValid = Boolean(draft?.name.trim() && draft?.text.trim())

  return (
    <>
      <section className='config-section prompt-library'>
        <div className='config-section__heading'>
          <span className='section-icon'><BookOpen size={18} aria-hidden='true' /></span>
          <div>
            <h2>提示词库</h2>
            <p>独立管理可复用的文生图和图生图提示词</p>
          </div>
        </div>

        <div className='prompt-library__body'>
          <div className='prompt-toolbar'>
            <div className='prompt-toolbar__meta'>
              <strong>{prompts.length}</strong>
              <span>条提示词</span>
              {query.trim() && <span className='prompt-filter-count'>匹配 {filteredPrompts.length} 条</span>}
            </div>
            <div className='prompt-toolbar__actions'>
              <label className='prompt-search'>
                <Search size={15} aria-hidden='true' />
                <span className='sr-only'>搜索提示词</span>
                <input
                  type='search'
                  value={query}
                  placeholder='搜索名称或正文'
                  aria-label='搜索提示词'
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <PromptIconButton label='重新读取提示词库' onClick={() => { load().catch(() => undefined) }} disabled={loading || refreshing || saving || Boolean(deletingId)}>
                <RefreshCw className={refreshing ? 'spin' : ''} size={17} aria-hidden='true' />
              </PromptIconButton>
              <button className='button button--primary' type='button' onClick={() => setDraft(getEmptyDraft())} disabled={saving || Boolean(deletingId)}>
                <Plus size={17} aria-hidden='true' />
                <span>新增提示词</span>
              </button>
            </div>
          </div>

          {loading && (
            <div className='prompt-state'>
              <LoaderCircle className='spin' size={19} aria-hidden='true' />
              <span>正在读取提示词库</span>
            </div>
          )}

          {!loading && error && (
            <div className='prompt-state prompt-state--error'>
              <X size={19} aria-hidden='true' />
              <span>{error}</span>
              <button className='button' type='button' onClick={() => { load().catch(() => undefined) }}>
                <RefreshCw size={15} aria-hidden='true' />重新读取
              </button>
            </div>
          )}

          {!loading && !error && prompts.length === 0 && (
            <div className='prompt-state prompt-state--empty'>
              <BookOpen size={22} aria-hidden='true' />
              <strong>提示词库为空</strong>
              <span>新增一条提示词后，可在 #draw 和 #tpdraw 中使用它的 ID。</span>
            </div>
          )}

          {!loading && !error && prompts.length > 0 && filteredPrompts.length === 0 && (
            <div className='prompt-state prompt-state--empty'>
              <Search size={22} aria-hidden='true' />
              <strong>没有匹配的提示词</strong>
              <span>调整搜索内容后重试。</span>
            </div>
          )}

          {!loading && !error && filteredPrompts.length > 0 && (
            <div className='prompt-list' role='list' aria-label='提示词列表'>
              {filteredPrompts.map(prompt => (
                <article className='prompt-row' key={prompt.id} role='listitem'>
                  <div className='prompt-row__main'>
                    <div className='prompt-row__meta'>
                      <code>{prompt.id}</code>
                      <span className={`prompt-type prompt-type--${prompt.type}`}>
                        {promptTypeIcon(prompt.type)}
                        {promptTypeLabel(prompt.type)}
                      </span>
                    </div>
                    <h3>{prompt.name}</h3>
                    <p>{prompt.text}</p>
                  </div>
                  <div className='prompt-row__actions'>
                    <PromptIconButton label={`编辑 ${prompt.id}`} onClick={() => setDraft({ ...prompt })} disabled={Boolean(deletingId) || saving}>
                      <Pencil size={16} aria-hidden='true' />
                    </PromptIconButton>
                    <PromptIconButton label={`删除 ${prompt.id}`} onClick={() => { remove(prompt).catch(() => undefined) }} disabled={Boolean(deletingId) || saving} danger>
                      {deletingId === prompt.id ? <LoaderCircle className='spin' size={16} aria-hidden='true' /> : <Trash2 size={16} aria-hidden='true' />}
                    </PromptIconButton>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {draft && (
        <div className='dialog-backdrop' role='presentation' onMouseDown={(event) => event.target === event.currentTarget && closeEditor()}>
          <section className='prompt-dialog' role='dialog' aria-modal='true' aria-labelledby='prompt-dialog-title' onMouseDown={(event) => event.stopPropagation()}>
            <header className='prompt-dialog__header'>
              <div>
                <p className='eyebrow'>PROMPT LIBRARY</p>
                <h2 id='prompt-dialog-title'>{draft.id ? `编辑 ${draft.id}` : '新增提示词'}</h2>
              </div>
              <PromptIconButton label='关闭编辑器' onClick={closeEditor} disabled={saving}>
                <X size={18} aria-hidden='true' />
              </PromptIconButton>
            </header>

            <form onSubmit={saveDraft}>
              <div className='prompt-dialog__body'>
                <div className='prompt-form-grid'>
                  <SegmentedField
                    label='提示词类型'
                    value={String(draft.type)}
                    options={promptTypeOptions}
                    onChange={(value) => setDraftValue({ type: value === '1' ? 1 : 0 })}
                  />
                  <TextField
                    label='提示词名称'
                    value={draft.name}
                    placeholder='例如：日系头像'
                    onChange={(value) => setDraftValue({ name: value })}
                  />
                  <div className='field-span-full'>
                    <TextAreaField
                      label='提示词正文'
                      value={draft.text}
                      rows={12}
                      maxLength={MAX_PROMPT_TEXT_LENGTH}
                      placeholder='输入可以复用的绘图提示词'
                      help={draft.type === 1 ? '使用时必须在当前消息或引用消息中附带图片。' : '使用时不要求图片，仍兼容附带图片的绘图命令。'}
                      onChange={(value) => setDraftValue({ text: value })}
                    />
                    <div className='prompt-length'>{draft.text.length.toLocaleString()} / {MAX_PROMPT_TEXT_LENGTH.toLocaleString()} 字符</div>
                  </div>
                </div>
              </div>
              <footer className='prompt-dialog__footer'>
                <button className='button' type='button' onClick={closeEditor} disabled={saving}>
                  <X size={16} aria-hidden='true' />取消
                </button>
                <button className='button button--primary' type='submit' disabled={!draftValid || saving}>
                  {saving ? <LoaderCircle className='spin' size={16} aria-hidden='true' /> : <Check size={16} aria-hidden='true' />}
                  {draft.id ? '保存修改' : '保存提示词'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  )
}

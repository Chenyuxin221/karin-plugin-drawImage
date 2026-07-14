import {
  Eye,
  EyeOff,
  Link2,
  RotateCcw,
} from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'

import { customValue, sizeOptions } from '../options'
import type { SelectOption } from '../types'

interface FieldFrameProps {
  label: string
  help?: string
  inherited?: boolean
  disabled?: boolean
  onEnableOverride?: () => void
  onInherit?: () => void
  children: (id: string) => ReactNode
}

function TooltipButton ({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <span className='tooltip-wrap'>
      <button className='icon-button icon-button--small' type='button' aria-label={label} onClick={onClick}>
        {children}
      </button>
      <span className='tooltip' role='tooltip'>{label}</span>
    </span>
  )
}

function FieldFrame ({
  label,
  help,
  inherited,
  disabled,
  onEnableOverride,
  onInherit,
  children,
}: FieldFrameProps) {
  const id = useId()

  return (
    <div className={`field${inherited ? ' field--inherited' : ''}${disabled ? ' field--disabled' : ''}`}>
      <div className='field__heading'>
        <label htmlFor={id}>{label}</label>
        {inherited !== undefined && !disabled && (
          inherited
            ? (
              <TooltipButton label='当前继承全局，点击改为独立设置' onClick={() => onEnableOverride?.()}>
                <Link2 size={14} aria-hidden='true' />
              </TooltipButton>
              )
            : (
              <TooltipButton label='恢复继承全局' onClick={() => onInherit?.()}>
                <RotateCcw size={14} aria-hidden='true' />
              </TooltipButton>
              )
        )}
      </div>
      {children(id)}
      {help && <p className='field__help'>{help}</p>}
    </div>
  )
}

interface BaseFieldProps {
  label: string
  help?: string
  value: string
  inherited?: boolean
  disabled?: boolean
  onChange: (value: string) => void
  onInherit?: () => void
}

export function TextField ({
  label,
  help,
  value,
  inherited,
  disabled,
  onChange,
  onInherit,
  type = 'text',
  placeholder,
  inputMode,
}: BaseFieldProps & {
  type?: 'text' | 'url' | 'password' | 'number'
  placeholder?: string
  inputMode?: 'numeric' | 'url' | 'text'
}) {
  const [passwordVisible, setPasswordVisible] = useState(false)
  const password = type === 'password'

  return (
    <FieldFrame
      label={label}
      help={help}
      inherited={inherited}
      disabled={disabled}
      onEnableOverride={() => onChange(value)}
      onInherit={onInherit}
    >
      {(id) => (
        <div className='input-shell'>
          <input
            id={id}
            type={password && passwordVisible ? 'text' : type}
            value={value}
            disabled={disabled}
            inputMode={inputMode}
            placeholder={placeholder}
            min={type === 'number' ? 1 : undefined}
            step={type === 'number' ? 1 : undefined}
            onChange={(event) => onChange(event.target.value)}
          />
          {password && (
            <span className='tooltip-wrap input-shell__action'>
              <button
                className='icon-button icon-button--small'
                type='button'
                aria-label={passwordVisible ? '隐藏密钥' : '显示密钥'}
                onClick={() => setPasswordVisible(visible => !visible)}
              >
                {passwordVisible
                  ? <EyeOff size={15} aria-hidden='true' />
                  : <Eye size={15} aria-hidden='true' />}
              </button>
              <span className='tooltip' role='tooltip'>{passwordVisible ? '隐藏密钥' : '显示密钥'}</span>
            </span>
          )}
        </div>
      )}
    </FieldFrame>
  )
}

export function SelectField ({
  label,
  help,
  value,
  options,
  inherited,
  disabled,
  onChange,
  onInherit,
}: BaseFieldProps & { options: SelectOption[] }) {
  return (
    <FieldFrame
      label={label}
      help={help}
      inherited={inherited}
      disabled={disabled}
      onEnableOverride={() => onChange(value)}
      onInherit={onInherit}
    >
      {(id) => (
        <select id={id} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
          {options.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      )}
    </FieldFrame>
  )
}

export function SegmentedField ({
  label,
  help,
  value,
  options,
  inherited,
  onChange,
  onInherit,
}: BaseFieldProps & { options: SelectOption[] }) {
  return (
    <FieldFrame
      label={label}
      help={help}
      inherited={inherited}
      onEnableOverride={() => onChange(value)}
      onInherit={onInherit}
    >
      {(id) => (
        <div id={id} className='segmented' role='radiogroup' aria-label={label}>
          {options.map(option => (
            <button
              key={option.value}
              className={value === option.value ? 'is-selected' : ''}
              type='button'
              role='radio'
              aria-checked={value === option.value}
              onClick={() => onChange(option.value)}
            >
              <span>{option.label}</span>
              {option.description && <small>{option.description}</small>}
            </button>
          ))}
        </div>
      )}
    </FieldFrame>
  )
}

export function SwitchField ({
  label,
  help,
  value,
  inherited,
  disabled,
  onChange,
  onInherit,
}: {
  label: string
  help?: string
  value: boolean
  inherited?: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
  onInherit?: () => void
}) {
  return (
    <FieldFrame
      label={label}
      help={help}
      inherited={inherited}
      disabled={disabled}
      onEnableOverride={() => onChange(value)}
      onInherit={onInherit}
    >
      {(id) => (
        <button
          id={id}
          className={`switch${value ? ' is-on' : ''}`}
          type='button'
          role='switch'
          aria-checked={value}
          disabled={disabled}
          onClick={() => onChange(!value)}
        >
          <span className='switch__track'><span className='switch__thumb' /></span>
          <span>{value ? '已开启' : '已关闭'}</span>
        </button>
      )}
    </FieldFrame>
  )
}

export function SizeField (props: BaseFieldProps) {
  const known = sizeOptions.some(option => option.value === props.value)
  const selectValue = known ? props.value : customValue

  return (
    <FieldFrame
      label={props.label}
      help={props.help}
      inherited={props.inherited}
      disabled={props.disabled}
      onEnableOverride={() => props.onChange(props.value)}
      onInherit={props.onInherit}
    >
      {(id) => (
        <div className='size-control'>
          <select
            id={id}
            value={selectValue}
            disabled={props.disabled}
            onChange={(event) => props.onChange(
              event.target.value === customValue ? '2048x2048' : event.target.value
            )}
          >
            {sizeOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
            <option value={customValue}>自定义</option>
          </select>
          {!known && (
            <input
              aria-label='自定义尺寸'
              value={props.value}
              disabled={props.disabled}
              placeholder='2048x2048'
              onChange={(event) => props.onChange(event.target.value)}
            />
          )}
        </div>
      )}
    </FieldFrame>
  )
}

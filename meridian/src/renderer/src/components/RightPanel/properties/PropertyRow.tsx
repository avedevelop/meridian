import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { FrontmatterValue } from '@shared/frontmatter'
import type { PropertyType } from './propertyType'
import { PropertyValueInput } from './PropertyValueInput'

interface PropertyRowProps {
  name: string
  type: PropertyType
  value: FrontmatterValue
  onValueChange: (value: FrontmatterValue) => void
  onDelete: () => void
}

export function PropertyRow({ name, type, value, onValueChange, onDelete }: PropertyRowProps) {
  const { t } = useTranslation()
  const inputId = useId()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label htmlFor={inputId} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {name}
        </label>
        <button
          type="button"
          aria-label={`${t('properties.deleteProperty')} ${name}`}
          onClick={onDelete}
          style={{
            border: 0,
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: 16,
            lineHeight: 1,
            padding: '2px 4px',
            cursor: 'pointer'
          }}
        >
          &times;
        </button>
      </div>
      <PropertyValueInput
        id={inputId}
        label={name}
        type={type}
        value={value}
        onChange={onValueChange}
      />
    </div>
  )
}

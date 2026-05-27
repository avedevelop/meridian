import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { FrontmatterValue } from '@shared/frontmatter'
import { PROPERTY_TYPES, type PropertyType } from './propertyType'
import { PropertyValueInput } from './PropertyValueInput'

interface PropertyRowProps {
  name: string
  type: PropertyType
  value: FrontmatterValue
  onTypeChange: (type: PropertyType) => void
  onValueChange: (value: FrontmatterValue) => void
  onDelete: () => void
}

export function PropertyRow({
  name,
  type,
  value,
  onTypeChange,
  onValueChange,
  onDelete
}: PropertyRowProps) {
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
          aria-label={t('properties.deleteProperty')}
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
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <PropertyValueInput
            id={inputId}
            label={name}
            type={type}
            value={value}
            onChange={onValueChange}
          />
        </div>
        <select
          aria-label={t('properties.propertyType')}
          value={type}
          onChange={(event) => onTypeChange(event.target.value as PropertyType)}
          style={{
            maxWidth: 94,
            padding: '6px 4px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 6,
            color: 'var(--text-secondary)',
            fontSize: 12
          }}
        >
          {PROPERTY_TYPES.map((propertyType) => (
            <option key={propertyType} value={propertyType}>
              {t(`properties.type.${propertyType}`)}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

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
    <div className="property-row">
      <div className="property-row__header">
        <label htmlFor={inputId} className="property-row__label">
          {name}
        </label>
        <button
          type="button"
          aria-label={`${t('properties.deleteProperty')} ${name}`}
          onClick={onDelete}
          className="properties-icon-button properties-icon-button--danger"
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

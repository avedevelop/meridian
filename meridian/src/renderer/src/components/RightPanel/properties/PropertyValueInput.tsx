import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { FrontmatterValue } from '@shared/frontmatter'
import { isIsoDateValue, listValue, stringValue, type PropertyType } from './propertyType'

interface PropertyValueInputProps {
  id: string
  label: string
  type: PropertyType
  value: FrontmatterValue
  onChange: (value: FrontmatterValue) => void
}

export function PropertyValueInput({ id, label, type, value, onChange }: PropertyValueInputProps) {
  const { t } = useTranslation()
  const sourceValue = stringValue(value)
  const [draft, setDraft] = useState(sourceValue)

  useEffect(() => {
    setDraft(sourceValue)
  }, [sourceValue, type])

  if (type === 'checkbox') {
    return (
      <input
        id={id}
        aria-label={label}
        type="checkbox"
        checked={value === true}
        onChange={(event) => onChange(event.target.checked)}
        className="properties-checkbox"
      />
    )
  }

  const commitValue = () => {
    if (draft === sourceValue) return

    if (type === 'number') {
      const number = Number(draft)
      if (!draft.trim() || !Number.isFinite(number)) {
        setDraft(sourceValue)
        return
      }

      onChange(number)
      return
    }

    if (type === 'date') {
      if (!isIsoDateValue(draft)) {
        setDraft(sourceValue)
        return
      }

      onChange(draft)
      return
    }

    if (type === 'tags' || type === 'relation') {
      onChange(listValue(draft))
      return
    }

    onChange(draft)
  }

  const placeholder =
    type === 'tags'
      ? t('properties.tagsPlaceholder')
      : type === 'relation'
        ? t('properties.relationPlaceholder')
        : undefined

  return (
    <input
      id={id}
      type={type === 'date' ? 'date' : type === 'number' ? 'number' : 'text'}
      value={draft}
      placeholder={placeholder}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commitValue}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
      className="properties-control"
    />
  )
}

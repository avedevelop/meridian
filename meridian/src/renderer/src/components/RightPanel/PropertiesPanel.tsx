import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  parseMarkdownFrontmatter,
  removeFrontmatterProperty,
  setFrontmatterProperty,
  type FrontmatterValue
} from '@shared/frontmatter'
import { useVaultStore } from '../../store/useVaultStore'
import { PropertyRow } from './properties/PropertyRow'
import {
  PROPERTY_TYPES,
  inferPropertyType,
  initialPropertyValue,
  isIsoDateValue,
  isRelationPropertyName,
  isTagsPropertyName,
  type PropertyType
} from './properties/propertyType'

const formInputStyle = {
  width: '100%',
  padding: '6px 10px',
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-color)',
  borderRadius: 6,
  color: 'var(--text-primary)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box' as const
}

export function PropertiesPanel() {
  const { t } = useTranslation()
  const panes = useVaultStore((state) => state.panes)
  const activePaneId = useVaultStore((state) => state.activePaneId)
  const setTabContent = useVaultStore((state) => state.setTabContent)
  const markTabDirty = useVaultStore((state) => state.markTabDirty)
  const activePane = panes.find((pane) => pane.id === activePaneId) ?? panes[0]
  const activeTab = activePane?.openTabs.find((tab) => tab.path === activePane.activeTabPath)
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<PropertyType>('text')
  const [newDate, setNewDate] = useState('')

  useEffect(() => {
    setIsAdding(false)
    setNewName('')
    setNewType('text')
    setNewDate('')
  }, [activeTab?.path])

  const frontmatter = useMemo(() => {
    if (!activeTab) return null
    return parseMarkdownFrontmatter(activeTab.content)
  }, [activeTab?.content])

  const updateContent = useCallback(
    (newContent: string) => {
      if (!activeTab || newContent === activeTab.content) return
      setTabContent(activeTab.path, newContent)
      markTabDirty(activeTab.path, true)
    },
    [activeTab, setTabContent, markTabDirty]
  )

  const handleChange = useCallback(
    (key: string, value: FrontmatterValue) => {
      if (!activeTab || !frontmatter?.ok) return
      updateContent(setFrontmatterProperty(activeTab.content, key, value))
    },
    [activeTab, frontmatter, updateContent]
  )

  const handleDelete = useCallback(
    (key: string) => {
      if (!activeTab || !frontmatter?.ok) return
      updateContent(removeFrontmatterProperty(activeTab.content, key))
    },
    [activeTab, frontmatter, updateContent]
  )

  const handleCreateProperty = (event: FormEvent) => {
    event.preventDefault()
    if (!activeTab || !frontmatter?.ok) return

    const name = newName.trim()
    if (!name || Object.prototype.hasOwnProperty.call(frontmatter.properties, name)) return
    if (newType === 'date' && !isIsoDateValue(newDate)) return
    if (newType === 'tags' && !isTagsPropertyName(name)) return
    if (newType === 'relation' && !isRelationPropertyName(name)) return

    handleChange(name, initialPropertyValue(newType, newDate))
    setNewName('')
    setNewType('text')
    setNewDate('')
    setIsAdding(false)
  }

  if (!activeTab) {
    return (
      <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 12 }}>
        {t('properties.noFileOpen')}
      </div>
    )
  }

  const properties = frontmatter?.properties ?? {}
  const propertyEntries = Object.entries(properties)
  const name = newName.trim()
  const hasUniqueName = Boolean(name) && !Object.prototype.hasOwnProperty.call(properties, name)
  const hasRecoverableName =
    (newType !== 'tags' || isTagsPropertyName(name)) &&
    (newType !== 'relation' || isRelationPropertyName(name))
  const hasValidInitialValue = newType !== 'date' || isIsoDateValue(newDate)
  const canCreateProperty = hasUniqueName && hasRecoverableName && hasValidInitialValue

  return (
    <div key={activeTab.path} style={{ padding: '16px 16px 20px' }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--text-secondary)',
          marginBottom: 12
        }}
      >
        {t('rightPanel.properties')}
      </div>

      {frontmatter && !frontmatter.ok && (
        <div
          role="alert"
          style={{
            padding: 10,
            marginBottom: 12,
            border: '1px solid var(--border-color)',
            borderRadius: 6,
            color: 'var(--text-secondary)',
            fontSize: 12,
            lineHeight: 1.4
          }}
        >
          {t('properties.invalidYaml')}
        </div>
      )}

      {frontmatter?.ok && propertyEntries.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
          {t('properties.empty')}
        </div>
      )}

      {frontmatter?.ok && propertyEntries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {propertyEntries.map(([key, value]) => {
            const type = inferPropertyType(key, value)
            return (
              <PropertyRow
                key={key}
                name={key}
                type={type}
                value={value}
                onValueChange={(nextValue) => handleChange(key, nextValue)}
                onDelete={() => handleDelete(key)}
              />
            )
          })}
        </div>
      )}

      {isAdding && frontmatter?.ok && (
        <form
          onSubmit={handleCreateProperty}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginTop: 16,
            paddingTop: 12,
            borderTop: '1px solid var(--border-color)'
          }}
        >
          <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {t('properties.propertyName')}
            <input
              autoFocus
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              style={{ ...formInputStyle, marginTop: 4 }}
            />
          </label>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {t('properties.newPropertyType')}
            <select
              value={newType}
              onChange={(event) => {
                const type = event.target.value as PropertyType
                setNewType(type)
                if (type !== 'date') setNewDate('')
              }}
              style={{ ...formInputStyle, marginTop: 4 }}
            >
              {PROPERTY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`properties.type.${type}`)}
                </option>
              ))}
            </select>
          </label>
          {newType === 'date' && (
            <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {t('properties.initialDate')}
              <input
                type="date"
                value={newDate}
                onChange={(event) => setNewDate(event.target.value)}
                style={{ ...formInputStyle, marginTop: 4 }}
              />
            </label>
          )}
          {newType === 'tags' && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {t('properties.tagsNameHint')}
            </div>
          )}
          {newType === 'relation' && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {t('properties.relationNameHint')}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="submit"
              disabled={!canCreateProperty}
              style={{
                flex: 1,
                padding: '7px 8px',
                background: 'var(--accent-glow)',
                border: '1px solid var(--border-color)',
                borderRadius: 6,
                color: 'var(--text-primary)',
                fontSize: 13,
                cursor: canCreateProperty ? 'pointer' : 'default'
              }}
            >
              {t('properties.createProperty')}
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              style={{
                padding: '7px 8px',
                background: 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: 6,
                color: 'var(--text-secondary)',
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}

      <button
        type="button"
        disabled={!frontmatter?.ok}
        onClick={() => setIsAdding(true)}
        style={{
          marginTop: 16,
          width: '100%',
          padding: '8px 0',
          background: 'var(--accent-glow)',
          border: '1px solid var(--border-color)',
          borderRadius: 6,
          color: 'var(--text-secondary)',
          fontSize: 13,
          fontWeight: 500,
          cursor: frontmatter?.ok ? 'pointer' : 'not-allowed',
          opacity: frontmatter?.ok ? 1 : 0.55,
          transition: 'all 0.15s ease'
        }}
      >
        {t('properties.addProperty')}
      </button>
    </div>
  )
}

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
    if (isTagsPropertyName(name) && newType !== 'tags') return
    if (isRelationPropertyName(name) && newType !== 'relation') return
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
    return <div className="properties-workspace--empty">{t('properties.noFileOpen')}</div>
  }

  const properties = frontmatter?.properties ?? {}
  const propertyEntries = Object.entries(properties)
  const name = newName.trim()
  const hasReservedTagsName = Boolean(name) && isTagsPropertyName(name)
  const hasReservedRelationName = Boolean(name) && isRelationPropertyName(name)
  const hasUniqueName = Boolean(name) && !Object.prototype.hasOwnProperty.call(properties, name)
  const hasRecoverableName =
    (!hasReservedTagsName || newType === 'tags') &&
    (!hasReservedRelationName || newType === 'relation') &&
    (newType !== 'tags' || isTagsPropertyName(name)) &&
    (newType !== 'relation' || isRelationPropertyName(name))
  const hasValidInitialValue = newType !== 'date' || isIsoDateValue(newDate)
  const canCreateProperty = hasUniqueName && hasRecoverableName && hasValidInitialValue
  const reservedNameError =
    hasReservedTagsName && newType !== 'tags'
      ? t('properties.reservedTagsNameError')
      : hasReservedRelationName && newType !== 'relation'
        ? t('properties.reservedRelationNameError')
        : ''

  return (
    <section
      key={activeTab.path}
      className="properties-workspace"
      role="region"
      aria-labelledby="properties-panel-title"
    >
      <h2 id="properties-panel-title" className="properties-heading">
        {t('rightPanel.properties')}
      </h2>

      {frontmatter && !frontmatter.ok && (
        <div role="alert" className="properties-alert properties-hint">
          {t('properties.invalidYaml')}
        </div>
      )}

      {frontmatter?.ok && propertyEntries.length === 0 && (
        <div className="properties-message">{t('properties.empty')}</div>
      )}

      {frontmatter?.ok && propertyEntries.length > 0 && (
        <div className="properties-list">
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
        <form onSubmit={handleCreateProperty} className="properties-form">
          <label className="properties-label">
            {t('properties.propertyName')}
            <input
              autoFocus
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              className="properties-control"
            />
          </label>
          <label className="properties-label">
            {t('properties.newPropertyType')}
            <select
              value={newType}
              onChange={(event) => {
                const type = event.target.value as PropertyType
                setNewType(type)
                if (type !== 'date') setNewDate('')
              }}
              className="properties-control"
            >
              {PROPERTY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`properties.type.${type}`)}
                </option>
              ))}
            </select>
          </label>
          {newType === 'date' && (
            <label className="properties-label">
              {t('properties.initialDate')}
              <input
                type="date"
                value={newDate}
                onChange={(event) => setNewDate(event.target.value)}
                className="properties-control"
              />
            </label>
          )}
          {newType === 'tags' && (
            <div className="properties-hint">{t('properties.tagsNameHint')}</div>
          )}
          {newType === 'relation' && (
            <div className="properties-hint">{t('properties.relationNameHint')}</div>
          )}
          {reservedNameError && (
            <div role="alert" className="properties-hint">
              {reservedNameError}
            </div>
          )}
          <div className="properties-form-actions">
            <button
              type="submit"
              disabled={!canCreateProperty}
              className="properties-button properties-button--primary"
            >
              {t('properties.createProperty')}
            </button>
            <button type="button" onClick={() => setIsAdding(false)} className="properties-button">
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}

      <button
        type="button"
        disabled={!frontmatter?.ok}
        onClick={() => setIsAdding(true)}
        className="properties-button properties-button--full"
      >
        {t('properties.addProperty')}
      </button>
    </section>
  )
}

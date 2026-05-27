import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import { useLinkStore } from '../../store/useLinkStore'
import { useVaultStore } from '../../store/useVaultStore'

function noteName(path: string): string {
  return (path.split('/').pop() ?? path).replace(/\.md$/i, '')
}

export function RelationshipsPanel() {
  const { t } = useTranslation()
  const activeTabPath = useVaultStore((state) => state.activeTabPath)
  const { openFile } = useVaultBridge()
  const linkStore = useLinkStore()

  const relations = activeTabPath ? linkStore.relationsForFile(activeTabPath) : []
  const unresolved = activeTabPath ? linkStore.unresolvedRelationsForFile(activeTabPath) : []
  const incoming = activeTabPath
    ? linkStore
        .backlinks(activeTabPath)
        .filter((path) =>
          linkStore.relationsForFile(path).some((relation) => relation.resolvedPath === activeTabPath)
        )
    : []

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof relations>()
    for (const relation of relations) {
      const items = groups.get(relation.key) ?? []
      items.push(relation)
      groups.set(relation.key, items)
    }
    return [...groups.entries()]
  }, [relations])

  if (!activeTabPath) {
    return <div className="properties-workspace--empty">{t('relationships.noFileOpen')}</div>
  }

  const hasAny = relations.length > 0 || incoming.length > 0

  return (
    <section className="properties-workspace" role="region" aria-labelledby="relationships-title">
      <h2 id="relationships-title" className="properties-heading">
        {t('relationships.title')}
      </h2>

      {!hasAny && <div className="properties-message">{t('relationships.empty')}</div>}

      {grouped.length > 0 && (
        <div className="properties-list">
          <div className="properties-section-heading">{t('relationships.outgoing')}</div>
          {grouped.map(([key, items]) => (
            <div key={key} className="relationship-group">
              <div className="relationship-key">{key}</div>
              {items.map((relation) =>
                relation.resolvedPath ? (
                  <button
                    key={`${key}-${relation.raw}`}
                    type="button"
                    className="relationship-link"
                    onClick={() => openFile(relation.resolvedPath!, relation.resolvedPath!.split('/').pop() ?? '')}
                  >
                    {noteName(relation.resolvedPath)}
                  </button>
                ) : (
                  <div key={`${key}-${relation.raw}`} className="relationship-unresolved">
                    {relation.raw}
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {incoming.length > 0 && (
        <div className="properties-list">
          <div className="properties-section-heading">{t('relationships.incoming')}</div>
          {incoming.map((path) => (
            <button
              key={path}
              type="button"
              className="relationship-link"
              onClick={() => openFile(path, path.split('/').pop() ?? '')}
            >
              {noteName(path)}
            </button>
          ))}
        </div>
      )}

      {unresolved.length > 0 && (
        <div className="properties-alert properties-hint">
          {t('relationships.unresolvedCount', { count: unresolved.length })}
        </div>
      )}
    </section>
  )
}

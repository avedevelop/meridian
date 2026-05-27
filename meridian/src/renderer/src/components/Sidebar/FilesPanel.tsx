import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useVaultStore } from '../../store/useVaultStore'
import { useVaultBridge, uniqueFileName } from '../../hooks/useVaultBridge'
import { useSettingsStore } from '../../store/useSettingsStore'
import { FileTree } from './FileTree'
import { FolderOpenBtnIcon, CollapseAllIcon } from '../Icons'
import { FileIcon } from './FileIcon'
import { VaultSwitcherDropdown } from './VaultSwitcherDropdown'
import { sortAndFilterFiles } from './sidebarUtils'
import type { NoteTypeDefinition, VaultFile } from '@shared/types'

export function FilesPanel() {
  const { t } = useTranslation()
  const { vault, files, activeTabPath } = useVaultStore()
  const {
    openFile,
    createFile,
    createTypedNote,
    createCanvas,
    createDrawing,
    createFolder,
    openVault,
    openVaultByPath,
    createNewVault,
    renameFile,
    moveFile,
    deleteFile,
    revealFile
  } = useVaultBridge()

  const fileSortBy = useSettingsStore((s) => s.fileSortBy)
  const showHiddenFiles = useSettingsStore((s) => s.showHiddenFiles)
  const excludedFolders = useSettingsStore((s) => s.excludedFolders)

  const [filterQuery, setFilterQuery] = useState('')
  const [collapseKey, setCollapseKey] = useState(0)
  const [vaultMenuOpen, setVaultMenuOpen] = useState(false)
  const [createAsOpen, setCreateAsOpen] = useState(false)
  const [noteTypes, setNoteTypes] = useState<NoteTypeDefinition[]>([])

  const excludedList = useMemo(
    () =>
      excludedFolders
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    [excludedFolders]
  )

  const sortedFiles = useMemo(
    () => sortAndFilterFiles(files, fileSortBy, showHiddenFiles, excludedList),
    [files, fileSortBy, showHiddenFiles, excludedList]
  )

  const filteredFiles = useMemo(() => {
    if (!filterQuery.trim()) return null
    const q = filterQuery.toLowerCase()
    const result: VaultFile[] = []
    function walk(items: VaultFile[]) {
      for (const f of items) {
        if (!f.isDirectory && f.name.toLowerCase().includes(q)) result.push(f)
        if (f.isDirectory && f.children) walk(f.children)
      }
    }
    walk(files)
    return result.slice(0, 100)
  }, [files, filterQuery])

  useEffect(() => {
    if (!vault) return
    let cancelled = false
    window.vault
      .getNoteTypes()
      .then((types) => {
        if (!cancelled) setNoteTypes(types)
      })
      .catch((error) => console.error('[FilesPanel] failed to load note types', error))
    return () => {
      cancelled = true
    }
  }, [vault])

  const handleCreateTypedNote = (typeId: string, dir?: string) => {
    if (!vault) return
    setCreateAsOpen(false)
    void createTypedNote(typeId, dir ?? vault.path)
  }

  if (!vault) return null

  return (
    <>
      <div
        style={{
          position: 'relative',
          padding: '10px 10px 10px 14px',
          borderBottom: '1px solid var(--border-color)',
          color: 'var(--text-secondary)',
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'background 0.12s ease'
        }}
        onClick={() => setVaultMenuOpen((o) => !o)}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--bg-surface)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
        }}
      >
        <FolderOpenBtnIcon size={14} color="var(--accent-color)" />
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          {vault.name}
          <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.7 }}>▼</span>
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            openVault()
          }}
          title={t('sidebar.openAnotherVault')}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 16,
            padding: '4px 6px',
            borderRadius: 4,
            flexShrink: 0,
            lineHeight: 1
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >
          ⎆
        </button>
        {vaultMenuOpen && (
          <VaultSwitcherDropdown
            activeVaultPath={vault.path}
            activeVaultName={vault.name}
            onClose={() => setVaultMenuOpen(false)}
            onOpenVault={openVault}
            onOpenVaultByPath={openVaultByPath}
            onCreateNewVault={createNewVault}
          />
        )}
      </div>
      <div
        style={{
          padding: '8px 10px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}
      >
        <input
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder={t('sidebar.filterFiles')}
          style={{
            flex: 1,
            minWidth: 40,
            width: 0,
            padding: '6px 10px',
            borderRadius: 6,
            background: 'var(--bg-surface)',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: 13
          }}
        />
        {filterQuery && (
          <button
            onClick={() => setFilterQuery('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '0 4px',
              fontSize: 14,
              flexShrink: 0
            }}
          >
            ×
          </button>
        )}
        <button
          onClick={() => setCollapseKey((k) => k + 1)}
          title={t('sidebar.collapseAll')}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s, color 0.15s',
            flexShrink: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-surface)'
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
        >
          <CollapseAllIcon size={14} />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {filteredFiles ? (
          filteredFiles.length === 0 ? (
            <div style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: 12 }}>
              {t('sidebar.noFilesMatch')}
            </div>
          ) : (
            filteredFiles.map((f) => (
              <div
                key={f.path}
                onClick={() => openFile(f.path, f.name)}
                style={{
                  padding: '3px 12px',
                  cursor: 'pointer',
                  color: activeTabPath === f.path ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: activeTabPath === f.path ? 'var(--accent-glow)' : 'transparent',
                  fontWeight: activeTabPath === f.path ? '500' : 'normal',
                  borderLeft: activeTabPath === f.path ? '3px solid var(--accent-color)' : 'none',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
                onMouseEnter={(e) => {
                  if (activeTabPath !== f.path) {
                    e.currentTarget.style.background = 'var(--bg-surface)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTabPath !== f.path) {
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <FileIcon name={f.name} isDirectory={false} />
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1
                  }}
                >
                  {f.name}
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 11, flexShrink: 0 }}>
                  {f.relativePath.split('/').slice(0, -1).join('/')}
                </span>
              </div>
            ))
          )
        ) : (
          <FileTree
            files={sortedFiles}
            onFileClick={openFile}
            onRename={renameFile}
            onDelete={deleteFile}
            onNewFolder={createFolder}
            onCreateFile={createFile}
            onCreateTypedNote={handleCreateTypedNote}
            onMove={moveFile}
            onReveal={revealFile}
            noteTypes={noteTypes}
            collapseKey={collapseKey}
            vaultPath={vault.path}
            activePath={activeTabPath}
          />
        )}
      </div>
      <div
        style={{
          padding: 8,
          borderTop: '1px solid var(--border-color)',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}
      >
        <button
          onClick={() =>
            createFile(vault.path, uniqueFileName(vault.path, 'Untitled', 'md', files))
          }
          style={{
            width: '100%',
            minHeight: 40,
            padding: '6px 10px',
            borderRadius: 6,
            background: 'var(--accent-glow)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            fontSize: 12,
            cursor: 'pointer'
          }}
        >
          {t('sidebar.newNote')}
        </button>
        <div style={{ display: 'flex', gap: 6, minWidth: 0 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <button
              onClick={() => setCreateAsOpen((open) => !open)}
              title={t('noteTypes.createAs')}
              aria-label={t('noteTypes.createAs')}
              style={{
                width: '100%',
                minHeight: 38,
                padding: '6px 8px',
                borderRadius: 6,
                background: 'var(--bg-surface)',
                color: 'var(--accent-color)',
                border: '1px solid var(--border-color)',
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              {t('noteTypes.typeMenu')}
            </button>
            {createAsOpen && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 6px)',
                  left: 0,
                  width: 230,
                  maxWidth: 'calc(100vw - 24px)',
                  padding: 6,
                  borderRadius: 8,
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: '0 12px 28px rgba(0,0,0,0.28)',
                  zIndex: 30
                }}
              >
                <div
                  style={{
                    padding: '6px 8px 10px',
                    color: 'var(--text-secondary)',
                    fontSize: 11,
                    fontWeight: 600
                  }}
                >
                  {t('noteTypes.createAsHeading')}
                </div>
                {noteTypes.slice(0, 6).map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleCreateTypedNote(type.id)}
                    style={{
                      width: '100%',
                      padding: '9px 8px',
                      border: 'none',
                      borderRadius: 6,
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      textAlign: 'left',
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-surface)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    {t(`noteTypes.createAction.${type.id}`, {
                      defaultValue: t('noteTypes.createTypedNote', {
                        type: t(`noteTypes.${type.id}`, { defaultValue: type.label })
                      }),
                      type: t(`noteTypes.${type.id}`, { defaultValue: type.label })
                    })}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => createDrawing(vault.path, `Drawing ${Date.now()}`)}
            title={t('sidebar.newDrawing')}
            style={{
              width: 42,
              minHeight: 38,
              borderRadius: 6,
              background: 'var(--bg-surface)',
              color: 'var(--accent-color)',
              border: '1px solid var(--border-color)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M8 2a6 6 0 1 0 6 6c0-.8-.6-1.5-1.5-1.5h-1c-.8 0-1.5-.7-1.5-1.5v-1C10 3 9 2 8 2z" />
              <circle cx="5.5" cy="6.5" r="1" fill="currentColor" />
              <circle cx="8" cy="5" r="1" fill="currentColor" />
              <circle cx="10.5" cy="8.5" r="1" fill="currentColor" />
            </svg>
          </button>
          <button
            onClick={() => createCanvas(vault.path, `Canvas ${Date.now()}`)}
            title={t('sidebar.newCanvas')}
            style={{
              width: 42,
              minHeight: 38,
              borderRadius: 6,
              background: 'var(--bg-surface)',
              color: 'var(--accent-color)',
              border: '1px solid var(--border-color)',
              fontSize: 12,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            ⊞
          </button>
        </div>
      </div>
    </>
  )
}

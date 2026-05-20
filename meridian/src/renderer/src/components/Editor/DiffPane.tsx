import { useEffect, useRef, useState } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { MergeView } from '@codemirror/merge'
import { useVaultStore } from '../../store/useVaultStore'
import { createMarkdownExtensions } from './extensions/markdownExtensions'

interface DiffPaneProps {
  filePath: string
  fileName: string
}

export function DiffPane({ filePath, fileName }: DiffPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mergeViewRef = useRef<MergeView | null>(null)
  const vault = useVaultStore((s) => s.vault)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadContent() {
      try {
        setLoading(true)
        setError(null)

        // Read current local file content
        const localContent = await window.vault.readFile(filePath)

        // Compute relative path for Git
        let relativePath = filePath
        if (vault && filePath.startsWith(vault.path)) {
          relativePath = filePath.slice(vault.path.length).replace(/^\/+/, '')
        }

        // Read HEAD original content
        const originalRes = await window.vault.gitShowHead(relativePath)
        const gitContent = originalRes.success ? originalRes.content : ''

        if (!active) return

        // Initialize CodeMirror MergeView
        if (containerRef.current) {
          // Clear any existing children
          containerRef.current.innerHTML = ''

          const baseExtensions = [
            EditorState.readOnly.of(true),
            EditorView.editable.of(false),
            EditorView.baseTheme({
              '.cm-merge-a': {
                borderRight: '1px solid var(--border-color)'
              },
              '.cm-deletedChunk': {
                backgroundColor: 'rgba(239, 68, 68, 0.15) !important',
                textDecoration: 'line-through'
              },
              '.cm-insertedChunk': {
                backgroundColor: 'rgba(34, 197, 94, 0.15) !important'
              },
              '.cm-deletedLine': {
                backgroundColor: 'rgba(239, 68, 68, 0.08) !important'
              },
              '.cm-insertedLine': {
                backgroundColor: 'rgba(34, 197, 94, 0.08) !important'
              },
              '.cm-scroller': {
                fontSize: '13px',
                lineHeight: '1.6'
              }
            })
          ]

          // Extensions for Left Pane (Original HEAD)
          const leftExtensions = [
            ...baseExtensions,
            createMarkdownExtensions(
              undefined,
              undefined,
              undefined,
              13,
              720,
              false,
              undefined,
              true,
              true,
              false,
              false
            )
          ]

          // Extensions for Right Pane (Modified Local)
          const rightExtensions = [
            ...baseExtensions,
            createMarkdownExtensions(
              undefined,
              undefined,
              undefined,
              13,
              720,
              false,
              undefined,
              true,
              true,
              false,
              false
            )
          ]

          const mergeView = new MergeView({
            parent: containerRef.current,
            a: {
              doc: gitContent,
              extensions: leftExtensions
            },
            b: {
              doc: localContent,
              extensions: rightExtensions
            }
          })

          mergeViewRef.current = mergeView
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || String(err))
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadContent()

    return () => {
      active = false
      if (mergeViewRef.current) {
        mergeViewRef.current.destroy()
        mergeViewRef.current = null
      }
    }
  }, [filePath, vault])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-tertiary)' }}>
      {/* Header bar */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--text-secondary)' }}>
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="M12 6v6l4 2" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            Comparing Changes: {fileName.replace(/^Diff:\s*/, '')}
          </span>
          <span style={{ fontSize: 10, background: 'var(--accent-glow)', color: 'var(--accent-color)', padding: '2px 6px', borderRadius: 10, fontWeight: 600 }}>
            Git Diff (HEAD vs Local)
          </span>
        </div>
        <div style={{ display: 'flex', gap: 20, fontSize: 11, color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, background: 'rgba(239, 68, 68, 0.4)', borderRadius: 2 }} />
            <span>HEAD version (Original)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, background: 'rgba(34, 197, 94, 0.4)', borderRadius: 2 }} />
            <span>Local version (Modified)</span>
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
          Loading git diff view...
        </div>
      )}

      {error && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', fontSize: 13, padding: 24, textAlign: 'center' }}>
          Failed to load diff: {error}
        </div>
      )}

      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: loading || error ? 'none' : 'block',
          height: '100%',
          overflow: 'hidden'
        }}
      />
    </div>
  )
}

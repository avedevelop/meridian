import React from 'react'
import { useTranslation } from 'react-i18next'
import { TrashIcon, NoteConvertIcon } from '../../Icons'
import { CanvasData } from '../canvasTypes'
import { useLinkStore } from '../../../store/useLinkStore'

interface CanvasNodeToolbarProps {
  selectedNodeId: string
  canvasData: CanvasData
  stageScale: number
  stagePos: { x: number; y: number }
  spaceHeld: boolean
  shiftHeld: boolean
  vault: any
  refreshFiles: () => Promise<void>
  mutate: (updater: (prev: CanvasData) => CanvasData) => void
  setSelectedNodeId: React.Dispatch<React.SetStateAction<string | null>>
  editingNodeId: string | null
}

export function CanvasNodeToolbar({
  selectedNodeId,
  canvasData,
  stageScale,
  stagePos,
  spaceHeld,
  shiftHeld,
  vault,
  refreshFiles,
  mutate,
  setSelectedNodeId,
  editingNodeId
}: CanvasNodeToolbarProps) {
  const { t } = useTranslation()

  if (editingNodeId || spaceHeld || shiftHeld) return null

  const node = canvasData.nodes.find((n) => n.id === selectedNodeId)
  if (!node) return null

  // Position slightly above the node
  const screenX = node.x * stageScale + stagePos.x
  const screenY = node.y * stageScale + stagePos.y
  const toolbarHeight = 36
  const gap = 8
  const topPos = screenY - toolbarHeight - gap

  // If the node is too close to the top of the container, place toolbar below it
  const finalTop = topPos < 10 ? screenY + node.height * stageScale + gap : topPos

  const colors = [
    '#1e1e2e', // Default dark
    '#7c6af7', // Purple
    '#38bdf8', // Blue
    '#34d399', // Green
    '#facc15', // Yellow
    '#f472b6', // Pink
    '#f87171' // Red
  ]

  return (
    <div
      style={{
        position: 'absolute',
        left: screenX,
        top: finalTop,
        height: toolbarHeight,
        background: '#2a2a3a',
        border: '1px solid #444',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        gap: 8,
        zIndex: 1100,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      }}
      // Prevent clicks from reaching the canvas and deselecting
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {colors.map((c) => (
        <button
          key={c}
          onClick={() => {
            mutate((prev) => ({
              ...prev,
              nodes: prev.nodes.map((n) =>
                n.id === node.id ? { ...n, color: c === '#1e1e2e' ? undefined : c } : n
              )
            }))
          }}
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: c,
            border:
              node.color === c || (!node.color && c === '#1e1e2e')
                ? '2px solid #fff'
                : '2px solid transparent',
            cursor: 'pointer',
            padding: 0
          }}
          title={t('canvas.nodeToolbar.changeColor')}
        />
      ))}
      {node.type === 'text' && !node.text.trim().match(/^(https?:\/\/|www\.)/i) && (
        <>
          <button
            onClick={async () => {
              const name = prompt(
                t('canvas.nodeToolbar.enterFilename'),
                t('canvas.nodeToolbar.defaultFilename')
              )
              if (!name) return
              const fileName = name.endsWith('.md') ? name : `${name}.md`
              if (!vault) return
              try {
                const filePath = await window.vault.createFile(vault.path, fileName)
                await window.vault.writeFile(filePath, node.text)
                const relativePath = filePath.replace(vault.path + '/', '').replace(vault.path, '')

                mutate((prev) => ({
                  ...prev,
                  nodes: prev.nodes.map((n) =>
                    n.id === node.id
                      ? {
                          ...n,
                          type: 'file',
                          file: relativePath,
                          text: fileName.replace(/\.md$/, '')
                        }
                      : n
                  )
                }))

                useLinkStore.getState().indexFile(filePath, fileName, node.text, vault.path)
                await refreshFiles()
              } catch (err: any) {
                alert(t('canvas.nodeToolbar.failedToCreateFile', { message: err.message }))
              }
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#7c6af7',
              cursor: 'pointer',
              fontSize: 14,
              padding: '2px 6px',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600
            }}
            title={t('canvas.nodeToolbar.createNoteFromText')}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(124, 106, 247, 0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <NoteConvertIcon size={14} />
          </button>
          <div style={{ width: 1, height: 20, background: '#444' }} />
        </>
      )}
      <button
        onClick={() => {
          mutate((prev) => ({
            nodes: prev.nodes.filter((n) => n.id !== node.id),
            edges: prev.edges.filter((ed) => ed.fromNode !== node.id && ed.toNode !== node.id)
          }))
          setSelectedNodeId(null)
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#f87171',
          cursor: 'pointer',
          fontSize: 16,
          padding: '2px 6px',
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title={t('canvas.nodeToolbar.deleteCard')}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(248, 113, 113, 0.1)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <TrashIcon size={14} />
      </button>
    </div>
  )
}

import React from 'react'
import { Group, Rect, Text } from 'react-konva'
import { Html } from 'react-konva-utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useTranslation } from 'react-i18next'
import { CanvasNodeData, CanvasData } from '../canvasTypes'
import {
  FONT_FAMILY,
  NODE_FILL,
  NODE_STROKE,
  NODE_SELECTED_STROKE,
  isUrl,
  getContrastColor
} from '../canvasTools'

interface CanvasNodeProps {
  node: CanvasNodeData
  selectedNodeId: string | null
  spaceHeld: boolean
  shiftHeld: boolean
  canvasData: CanvasData
  setCanvasData: React.Dispatch<React.SetStateAction<CanvasData>>
  mutateWithUndo: (updater: (prev: CanvasData) => CanvasData) => void
  setSelectedNodeId: React.Dispatch<React.SetStateAction<string | null>>
  setSelectedEdgeId: React.Dispatch<React.SetStateAction<string | null>>
  setEditingNodeId: React.Dispatch<React.SetStateAction<string | null>>
  setEditText: React.Dispatch<React.SetStateAction<string>>
  setInitialEditingHeight: React.Dispatch<React.SetStateAction<number>>
  fileContents: Record<string, string>
  urlMetadata: Record<string, any>
  openFile: (path: string, name: string) => void
  handleNodeDragStart: (id: string) => void
  handleNodeDragEnd: (id: string, e: any) => void
  handleNodeDragMove: (id: string, e: any) => void
  handleNodeMouseDown: (id: string, e: any) => void
  nodeMinHeights: React.MutableRefObject<Record<string, number>>
  nodeRefs: React.MutableRefObject<Record<string, any>>
}

export function CanvasNode({
  node,
  selectedNodeId,
  spaceHeld,
  shiftHeld,
  canvasData,
  setCanvasData,
  mutateWithUndo,
  setSelectedNodeId,
  setSelectedEdgeId,
  setEditingNodeId,
  setEditText,
  setInitialEditingHeight,
  fileContents,
  urlMetadata,
  openFile,
  handleNodeDragStart,
  handleNodeDragEnd,
  handleNodeDragMove,
  handleNodeMouseDown,
  nodeMinHeights,
  nodeRefs
}: CanvasNodeProps) {
  const { t } = useTranslation()
  const isSelected = node.id === selectedNodeId
  const displayText =
    node.type === 'file' && node.file ? (node.file.split('/').pop() ?? node.text) : node.text

  return (
    <Group
      ref={(el) => {
        nodeRefs.current[node.id] = el
      }}
      x={node.x}
      y={node.y}
      draggable={!spaceHeld && !shiftHeld}
      onDragStart={() => handleNodeDragStart(node.id)}
      onDragEnd={(e) => handleNodeDragEnd(node.id, e)}
      onDragMove={(e) => handleNodeDragMove(node.id, e)}
      onClick={() => {
        setSelectedNodeId(node.id)
        setSelectedEdgeId(null)
      }}
      onDblClick={() => {
        if (node.type === 'text') {
          if (isUrl(node.text)) {
            window.vault.openExternal(node.text.trim())
          } else {
            setEditingNodeId(node.id)
            setEditText(node.text)
            setInitialEditingHeight(node.height)
          }
        } else if (node.type === 'file' && node.file) {
          const fileName = node.file.split('/').pop() ?? ''
          openFile(node.file, fileName)
        }
      }}
      onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
      onTransform={(e) => {
        const el = e.target
        const scaleX = el.scaleX()
        const scaleY = el.scaleY()
        el.scaleX(1)
        el.scaleY(1)
        setCanvasData((prev) => ({
          ...prev,
          nodes: prev.nodes.map((n) =>
            n.id === node.id
              ? {
                  ...n,
                  x: el.x(),
                  y: el.y(),
                  width: Math.max(150, n.width * scaleX),
                  height: Math.max(60, n.height * scaleY)
                }
              : n
          )
        }))
      }}
      onTransformEnd={(e) => {
        const el = e.target
        mutateWithUndo((prev) => ({
          ...prev,
          nodes: prev.nodes.map((n) =>
            n.id === node.id
              ? {
                  ...n,
                  x: el.x(),
                  y: el.y(),
                  width: n.width,
                  height: n.height
                }
              : n
          )
        }))
      }}
    >
      <Rect
        width={node.width}
        height={node.height}
        fill={
          node.type === 'frame'
            ? node.color
              ? `${node.color}33`
              : 'rgba(255,255,255,0.05)'
            : (node.color ?? NODE_FILL)
        }
        stroke={
          isSelected
            ? NODE_SELECTED_STROKE
            : node.type === 'frame'
              ? (node.color ?? '#555')
              : NODE_STROKE
        }
        strokeWidth={isSelected ? 2 : node.type === 'frame' ? 2 : 1}
        cornerRadius={8}
        shadowColor="#000"
        shadowBlur={isSelected ? 12 : 4}
        shadowOpacity={isSelected ? 0.4 : 0.2}
        shadowOffsetY={2}
      />
      {node.type === 'frame' && (
        <Text
          text={displayText}
          fill={node.color ?? '#ccc'}
          fontFamily={FONT_FAMILY}
          fontSize={18}
          fontStyle="bold"
          y={-28}
          listening={false}
        />
      )}
      {node.type !== 'frame' && (
        <Html
          divProps={{
            style: {
              pointerEvents: 'none',
              width: `${node.width}px`,
              height: `${node.height}px`,
              overflow: 'hidden',
              boxSizing: 'border-box',
              zIndex: canvasData.nodes.findIndex((n) => n.id === node.id)
            }
          }}
        >
          {node.type === 'text' && isUrl(node.text) ? (
            (() => {
              const trimmed = node.text.trim()
              const meta = urlMetadata[trimmed]
              return (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    height: '100%',
                    width: '100%',
                    background: node.color ? `${node.color}55` : 'rgba(25, 25, 30, 0.75)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                    fontFamily: FONT_FAMILY
                  }}
                >
                  {meta?.image && (
                    <div
                      style={{
                        width: '30%',
                        minWidth: 70,
                        height: '100%',
                        background: `url(${meta.image}) center/cover no-repeat`,
                        borderRight: '1px solid rgba(255,255,255,0.08)'
                      }}
                    />
                  )}
                  <div
                    style={{
                      flex: 1,
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ overflow: 'hidden' }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 13,
                          color: '#fff',
                          marginBottom: 4,
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden'
                        }}
                      >
                        {meta?.title || trimmed}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: '#aaa',
                          lineHeight: '1.4em',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {meta?.description || t('canvas.noDescription')}
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 10,
                        color: '#7c6af7',
                        fontWeight: 500,
                        marginTop: 4
                      }}
                    >
                      <span
                        style={{
                          opacity: 0.8,
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          maxWidth: '65%'
                        }}
                      >
                        {(() => {
                          try {
                            return new URL(trimmed).hostname
                          } catch {
                            return trimmed
                          }
                        })()}
                      </span>
                      <button
                        style={{
                          background: 'rgba(124, 106, 247, 0.2)',
                          border: 'none',
                          borderRadius: 4,
                          color: '#a395ff',
                          padding: '2px 8px',
                          fontSize: 10,
                          cursor: 'pointer',
                          pointerEvents: 'auto',
                          fontWeight: 600
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          window.vault.openExternal(trimmed)
                        }}
                      >
                        {t('canvas.openLink')}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })()
          ) : (
            <div
              className="markdown-preview canvas-card-content"
              style={{
                color: getContrastColor(node.color),
                fontFamily: FONT_FAMILY,
                fontSize: 13,
                margin: 0,
                padding: '16px 20px',
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                overflowY: 'auto',
                overflowX: 'hidden',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                background: node.color ?? NODE_FILL,
                border: isSelected
                  ? `2px solid ${NODE_SELECTED_STROKE}`
                  : `1px solid ${NODE_STROKE}`,
                borderRadius: '8px',
                boxShadow: isSelected ? '0 6px 12px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.2)'
              }}
            >
              <div
                ref={(el) => {
                  if (el) {
                    const contentHeight = el.offsetHeight + 32
                    nodeMinHeights.current[node.id] = contentHeight
                    if (node.height < contentHeight) {
                      setTimeout(() => {
                        setCanvasData((prev) => ({
                          ...prev,
                          nodes: prev.nodes.map((n) =>
                            n.id === node.id && n.height < contentHeight
                              ? { ...n, height: contentHeight }
                              : n
                          )
                        }))
                      }, 0)
                    }
                  }
                }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {node.type === 'file' && node.file
                    ? fileContents[node.file] !== undefined
                      ? `### ${t('canvas.notePrefix', { name: node.file.split('/').pop()?.replace(/\.md$/, '') })}\n\n${fileContents[node.file]}`
                      : `### ${t('canvas.notePrefix', { name: displayText })}\n${t('canvas.loading')}`
                    : displayText}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </Html>
      )}
    </Group>
  )
}

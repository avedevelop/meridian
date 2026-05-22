import React, { useMemo, useRef, useEffect } from 'react'
import { Stage, Layer, Rect, Text, Group, Line, Circle, Transformer } from 'react-konva'
import type Konva from 'konva'
import { Html } from 'react-konva-utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useVaultStore } from '../../store/useVaultStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import { useLinkStore } from '../../store/useLinkStore'
import { TrashIcon, NoteConvertIcon } from '../Icons'
import { CanvasData, CanvasNodeData } from './canvasTypes'
import { useCanvasDrawing } from './useCanvasDrawing'
import {
  BG,
  NODE_FILL,
  NODE_STROKE,
  NODE_SELECTED_STROKE,
  EDGE_COLOR,
  DOT_COLOR,
  DOT_SPACING,
  DOT_RADIUS,
  FONT_FAMILY,
  nodeCenter,
  getContrastColor,
  isUrl,
  getEdgePoints
} from './canvasTools'

interface DotGridProps {
  stageX: number
  stageY: number
  stageScale: number
  width: number
  height: number
}

function DotGrid({ stageX, stageY, stageScale, width, height }: DotGridProps) {
  const dots = useMemo(() => {
    const spacing = DOT_SPACING
    const startX = Math.floor(-stageX / stageScale / spacing) * spacing - spacing
    const startY = Math.floor(-stageY / stageScale / spacing) * spacing - spacing
    const endX = startX + width / stageScale + spacing * 2
    const endY = startY + height / stageScale + spacing * 2
    const result: { x: number; y: number }[] = []
    for (let x = startX; x <= endX; x += spacing) {
      for (let y = startY; y <= endY; y += spacing) {
        result.push({ x, y })
      }
    }
    return result
  }, [stageX, stageY, stageScale, width, height])

  return (
    <>
      {dots.map((d, i) => (
        <Circle key={i} x={d.x} y={d.y} radius={DOT_RADIUS} fill={DOT_COLOR} listening={false} />
      ))}
    </>
  )
}

interface CanvasStageProps {
  stageRef: React.RefObject<Konva.Stage | null>
  size: { width: number; height: number }
  stagePos: { x: number; y: number }
  setStagePos: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>
  stageScale: number
  setStageScale: React.Dispatch<React.SetStateAction<number>>
  spaceHeld: boolean
  shiftHeld: boolean
  canvasData: CanvasData
  setCanvasData: React.Dispatch<React.SetStateAction<CanvasData>>
  mutate: (updater: (prev: CanvasData) => CanvasData) => void
  mutateWithUndo: (updater: (prev: CanvasData) => CanvasData) => void
  selectedNodeId: string | null
  setSelectedNodeId: React.Dispatch<React.SetStateAction<string | null>>
  selectedEdgeId: string | null
  setSelectedEdgeId: React.Dispatch<React.SetStateAction<string | null>>
  editingNodeId: string | null
  setEditingNodeId: React.Dispatch<React.SetStateAction<string | null>>
  editText: string
  setEditText: React.Dispatch<React.SetStateAction<string>>
  initialEditingHeight: number
  setInitialEditingHeight: React.Dispatch<React.SetStateAction<number>>
  fileContents: Record<string, string>
  urlMetadata: Record<string, any>
  openFile: (path: string, name: string) => void
}

export function CanvasStage({
  stageRef,
  size,
  stagePos,
  setStagePos,
  stageScale,
  setStageScale,
  spaceHeld,
  shiftHeld,
  canvasData,
  setCanvasData,
  mutate,
  mutateWithUndo,
  selectedNodeId,
  setSelectedNodeId,
  selectedEdgeId,
  setSelectedEdgeId,
  editingNodeId,
  setEditingNodeId,
  editText,
  setEditText,
  initialEditingHeight,
  setInitialEditingHeight,
  fileContents,
  urlMetadata,
  openFile
}: CanvasStageProps) {
  const { t } = useTranslation()
  const connectionLineStyle = useSettingsStore((s) => s.connectionLineStyle) || 'curved'
  const vault = useVaultStore((s) => s.vault)
  const { refreshFiles } = useVaultBridge()

  const trRef = useRef<Konva.Transformer>(null)
  const nodeRefs = useRef<Record<string, Konva.Group | null>>({})
  const nodeMinHeights = useRef<Record<string, number>>({})

  const {
    tempLineEnd,
    shiftDragOriginRef,
    handleWheel,
    handleDragEnd,
    handleDblClick,
    handleStageClick,
    handleNodeDragStart,
    handleNodeDragMove,
    handleNodeDragEnd,
    handleNodeMouseDown,
    handleStageMouseMove,
    handleStageMouseUp
  } = useCanvasDrawing({
    stageRef,
    canvasData,
    setCanvasData,
    mutate,
    mutateWithUndo,
    stagePos,
    setStagePos,
    stageScale,
    setStageScale,
    setSelectedNodeId,
    setSelectedEdgeId,
    t
  })

  useEffect(() => {
    if (selectedNodeId && trRef.current) {
      const node = nodeRefs.current[selectedNodeId]
      if (node) {
        trRef.current.nodes([node])
        trRef.current.getLayer()?.batchDraw()
      }
    } else if (trRef.current) {
      trRef.current.nodes([])
    }
  }, [selectedNodeId, canvasData.nodes])

  const edgeLines = useMemo(() => {
    const nodeMap = new Map(canvasData.nodes.map((n) => [n.id, n]))
    return canvasData.edges
      .map((edge) => {
        const from = nodeMap.get(edge.fromNode)
        const to = nodeMap.get(edge.toNode)
        if (!from || !to) return null
        const res = getEdgePoints(from, to, connectionLineStyle)
        return {
          id: edge.id,
          points: res.points,
          bezier: res.bezier ?? false
        }
      })
      .filter(Boolean) as { id: string; points: number[]; bezier: boolean }[]
  }, [canvasData, connectionLineStyle])

  const renderNode = (node: CanvasNodeData) => {
    const isSelected = node.id === selectedNodeId
    const displayText =
      node.type === 'file' && node.file ? (node.file.split('/').pop() ?? node.text) : node.text

    return (
      <Group
        key={node.id}
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
                  boxShadow: isSelected
                    ? '0 6px 12px rgba(0,0,0,0.4)'
                    : '0 2px 4px rgba(0,0,0,0.2)'
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

  return (
    <>
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        x={stagePos.x}
        y={stagePos.y}
        scaleX={stageScale}
        scaleY={stageScale}
        draggable={!shiftHeld}
        onWheel={handleWheel}
        onDragEnd={handleDragEnd}
        onDblClick={handleDblClick}
        onClick={handleStageClick}
        onMouseUp={handleStageMouseUp}
        onMouseMove={handleStageMouseMove}
        style={{ cursor: shiftHeld ? 'crosshair' : spaceHeld ? 'grab' : 'default' }}
      >
        {/* Background layer */}
        <Layer listening={false}>
          <Rect
            x={-stagePos.x / stageScale}
            y={-stagePos.y / stageScale}
            width={size.width / stageScale}
            height={size.height / stageScale}
            fill={BG}
            listening={false}
          />
          <DotGrid
            stageX={stagePos.x}
            stageY={stagePos.y}
            stageScale={stageScale}
            width={size.width}
            height={size.height}
          />
        </Layer>

        {/* Layer 2: Frames */}
        <Layer>
          {canvasData.nodes.filter((node) => node.type === 'frame').map((node) => renderNode(node))}
        </Layer>

        {/* Layer 3: Edges */}
        <Layer>
          {edgeLines.map((edge) => {
            const isEdgeSelected = edge.id === selectedEdgeId
            return (
              <Line
                key={edge.id}
                points={edge.points}
                bezier={edge.bezier}
                stroke={isEdgeSelected ? '#a78bfa' : EDGE_COLOR}
                strokeWidth={isEdgeSelected ? 3 : 2}
                opacity={isEdgeSelected ? 1 : 0.6}
                lineCap="round"
                hitStrokeWidth={16}
                onClick={() => {
                  setSelectedEdgeId(edge.id)
                  setSelectedNodeId(null)
                }}
              />
            )
          })}
          {/* Temporary line while shift-dragging */}
          {shiftDragOriginRef.current &&
            tempLineEnd &&
            (() => {
              const originNode = canvasData.nodes.find((n) => n.id === shiftDragOriginRef.current)
              if (!originNode) return null
              const oc = nodeCenter(originNode)
              return (
                <Line
                  points={[oc.x, oc.y, tempLineEnd.x, tempLineEnd.y]}
                  stroke={EDGE_COLOR}
                  strokeWidth={2}
                  opacity={0.8}
                  dash={[8, 4]}
                  lineCap="round"
                  listening={false}
                />
              )
            })()}
        </Layer>

        {/* Layer 4: Cards & Transformer */}
        <Layer>
          {canvasData.nodes.filter((node) => node.type !== 'frame').map((node) => renderNode(node))}
          <Transformer
            ref={trRef}
            boundBoxFunc={(oldBox, newBox) => {
              const minH = Math.max(
                60,
                (selectedNodeId && nodeMinHeights.current[selectedNodeId]) || 60
              )
              if (newBox.width < 150 || newBox.height < minH) return oldBox
              return newBox
            }}
            padding={4}
            anchorSize={8}
            anchorCornerRadius={4}
            borderStroke="#7c6af7"
            anchorStroke="#7c6af7"
            anchorFill="#fff"
            rotateEnabled={false}
            keepRatio={false}
            shiftBehavior="none"
          />
        </Layer>
      </Stage>

      {/* Inline text editing overlay */}
      {editingNodeId &&
        (() => {
          const node = canvasData.nodes.find((n) => n.id === editingNodeId)
          if (!node) return null
          const screenX = node.x * stageScale + stagePos.x
          const screenY = node.y * stageScale + stagePos.y
          const screenW = node.width * stageScale
          const screenH = node.height * stageScale
          return (
            <textarea
              autoFocus
              value={editText}
              onChange={(e) => {
                setEditText(e.target.value)
                const el = e.target
                const oldH = el.style.height
                el.style.height = '1px'
                const intrinsicH = el.scrollHeight / stageScale
                el.style.height = oldH

                const targetH = Math.max(initialEditingHeight, intrinsicH)
                if (targetH !== node.height) {
                  setCanvasData((prev) => ({
                    ...prev,
                    nodes: prev.nodes.map((n) => (n.id === node.id ? { ...n, height: targetH } : n))
                  }))
                }
              }}
              onBlur={(e) => {
                const el = e.target
                const trimmedText = editText.trimEnd()
                const oldVal = el.value
                el.value = trimmedText
                const oldH = el.style.height
                el.style.height = '1px'
                const trimmedH = el.scrollHeight / stageScale
                el.style.height = oldH
                el.value = oldVal

                const finalH = Math.max(initialEditingHeight, trimmedH)

                mutate((prev) => ({
                  ...prev,
                  nodes: prev.nodes.map((n) =>
                    n.id === editingNodeId ? { ...n, text: trimmedText, height: finalH } : n
                  )
                }))
                setEditingNodeId(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  const el = e.currentTarget
                  const trimmedText = editText.trimEnd()
                  const oldVal = el.value
                  el.value = trimmedText
                  const oldH = el.style.height
                  el.style.height = '1px'
                  const trimmedH = el.scrollHeight / stageScale
                  el.style.height = oldH
                  el.value = oldVal

                  const finalH = Math.max(initialEditingHeight, trimmedH)

                  mutate((prev) => ({
                    ...prev,
                    nodes: prev.nodes.map((n) =>
                      n.id === editingNodeId ? { ...n, text: trimmedText, height: finalH } : n
                    )
                  }))
                  setEditingNodeId(null)
                }
                e.stopPropagation()
              }}
              style={{
                position: 'absolute',
                left: screenX,
                top: screenY,
                width: screenW,
                height: screenH,
                background: '#1e1e2e',
                border: '2px solid #7c6af7',
                borderRadius: 8 * stageScale,
                color: '#ccc',
                fontFamily: FONT_FAMILY,
                fontSize: 13 * stageScale,
                padding: `${16 * stageScale}px ${20 * stageScale}px`,
                resize: 'none',
                outline: 'none',
                zIndex: 1200,
                boxSizing: 'border-box'
              }}
            />
          )
        })()}

      {/* Floating Node Toolbar (Color Picker & Delete) */}
      {selectedNodeId &&
        !editingNodeId &&
        !spaceHeld &&
        !shiftHeld &&
        (() => {
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
              {node.type === 'text' && !isUrl(node.text) && (
                <>
                  <button
                    onClick={async () => {
                      const name = prompt(t('canvas.nodeToolbar.enterFilename'), t('canvas.nodeToolbar.defaultFilename'))
                      if (!name) return
                      const fileName = name.endsWith('.md') ? name : `${name}.md`
                      if (!vault) return
                      try {
                        const filePath = await window.vault.createFile(vault.path, fileName)
                        await window.vault.writeFile(filePath, node.text)
                        const relativePath = filePath
                          .replace(vault.path + '/', '')
                          .replace(vault.path, '')

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
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = 'rgba(124, 106, 247, 0.1)')
                    }
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
                    edges: prev.edges.filter(
                      (ed) => ed.fromNode !== node.id && ed.toNode !== node.id
                    )
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
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'rgba(248, 113, 113, 0.1)')
                }
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <TrashIcon size={14} />
              </button>
            </div>
          )
        })()}
    </>
  )
}

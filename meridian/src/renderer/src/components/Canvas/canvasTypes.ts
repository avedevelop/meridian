export interface CanvasNodeData {
  id: string
  type: 'text' | 'file' | 'frame'
  x: number
  y: number
  width: number
  height: number
  text: string
  file?: string
  color?: string
}

export interface CanvasEdgeData {
  id: string
  fromNode: string
  toNode: string
  fromSide: 'top' | 'right' | 'bottom' | 'left'
  toSide: 'top' | 'right' | 'bottom' | 'left'
}

export interface CanvasData {
  nodes: CanvasNodeData[]
  edges: CanvasEdgeData[]
}

export interface CanvasViewProps {
  filePath: string
  content: string
  onSave: (path: string, content: string) => void
}

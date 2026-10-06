import { useEffect, useState } from 'react'
import type { GroupMode } from './graphGroups'

const GLOW_KEY = 'meridian:graph-show-glow'
const GROUP_KEY = 'meridian:graph-group-mode'
const LABEL_KEY = 'meridian:graph-label-mode'

export type LabelMode = 'auto' | 'hover' | 'all'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // private window or blocked storage: the choice just is not remembered
  }
}

/** Purely visual graph options. Remembered between launches. */
export function useGraphLook() {
  const [showGlow, setShowGlow] = useState<boolean>(() => read(GLOW_KEY) === 'true')
  const [labelMode, setLabelMode] = useState<LabelMode>(() => {
    const v = read(LABEL_KEY)
    return v === 'hover' || v === 'all' ? v : 'auto'
  })
  const [groupMode, setGroupMode] = useState<GroupMode>(() =>
    read(GROUP_KEY) === 'folder' ? 'folder' : read(GROUP_KEY) === 'tag' ? 'tag' : 'type'
  )

  useEffect(() => write(GLOW_KEY, String(showGlow)), [showGlow])
  useEffect(() => write(LABEL_KEY, labelMode), [labelMode])
  useEffect(() => write(GROUP_KEY, groupMode), [groupMode])

  return { labelMode, setLabelMode, showGlow, setShowGlow, groupMode, setGroupMode }
}

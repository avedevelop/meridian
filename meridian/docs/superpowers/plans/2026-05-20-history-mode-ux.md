# History Mode UX Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the History mode timeline bar being hidden behind the GRAPH ANALYSIS sidebar, and improve the overall History playback UX with date ticks, keyboard shortcuts, and a minimap of note activity.

**Architecture:** All changes are self-contained in `src/renderer/src/components/Graph/GraphView.tsx`. The timeline bar is a flex row rendered below the graph canvas when `viewMode === 'history'`. The GRAPH ANALYSIS sidebar is an absolute-positioned panel (left: 12, width: 320). The fix moves the timeline bar out of the flow so it can be offset, or pads it based on `isSettingsOpen`.

**Tech Stack:** React 18, TypeScript, inline styles (no CSS modules), D3 for graph, all in one large TSX component.

---

### Task 1: Fix timeline bar left offset when sidebar is open

**Files:**

- Modify: `src/renderer/src/components/Graph/GraphView.tsx:1608-1719`

The timeline bar at line 1608 uses `padding: '0 16px'`. When `isSettingsOpen` is true, the GRAPH ANALYSIS sidebar (width 320, left 12) overlaps the left side of the bar and hides the date label (minWidth 136). Fix: add `paddingLeft` dynamically based on `isSettingsOpen`.

- [ ] **Step 1: Add paddingLeft to timeline bar**

Find this block (line ~1618):

```tsx
padding: '0 16px',
```

Replace with:

```tsx
padding: '0 16px',
paddingLeft: isSettingsOpen ? 348 : 16,
transition: 'padding-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
```

The value `348` = sidebar left (12) + sidebar width (320) + gap (16).

- [ ] **Step 2: Verify the fix looks right**

Open the app, switch to History mode with the sidebar open — the date label should now be visible to the right of the sidebar. Toggle the sidebar closed — padding should smoothly animate back to 16px.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/Graph/GraphView.tsx
git commit -m "fix: offset history timeline bar when graph analysis sidebar is open"
```

---

### Task 2: Add date tick marks above the timeline scrubber

**Files:**

- Modify: `src/renderer/src/components/Graph/GraphView.tsx:1608-1719`

Display ~5–7 evenly-spaced year labels above the scrubber so users can see the temporal scale at a glance. These are absolutely-positioned inside the timeline bar container (make the bar `position: relative`).

- [ ] **Step 1: Compute tick positions**

Inside the component (after the `formattedDate` computation at line ~291), add:

```tsx
const historyTicks = useMemo(() => {
  if (maxTime === minTime) return []
  const count = 6
  return Array.from({ length: count + 1 }, (_, i) => {
    const frac = i / count
    const ts = minTime + (maxTime - minTime) * frac
    const year = new Date(ts).getFullYear()
    return { frac, year }
  }).filter((t, i, arr) => i === 0 || t.year !== arr[i - 1].year)
}, [minTime, maxTime])
```

- [ ] **Step 2: Render ticks above the scrubber**

The timeline bar div (line ~1609) needs `position: 'relative'`. Then add ticks as absolutely-positioned elements inside it, overlaid above the range input. Insert after the opening `<div style={{ height: 60, ... }}>`:

```tsx
{
  /* Date ticks */
}
{
  historyTicks.map(({ frac, year }) => (
    <div
      key={year}
      style={{
        position: 'absolute',
        left: `calc(${isSettingsOpen ? 348 : 16}px + (100% - ${isSettingsOpen ? 348 : 16}px - 16px) * ${frac})`,
        top: 6,
        fontSize: 10,
        color: 'rgba(255,255,255,0.3)',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        userSelect: 'none',
        whiteSpace: 'nowrap'
      }}
    >
      {year}
    </div>
  ))
}
```

- [ ] **Step 3: Verify ticks are visible and positioned correctly**

Open History mode. Tick labels (years) should appear near the top of the timeline bar, evenly spaced across the range. They should shift right when the sidebar is open.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/components/Graph/GraphView.tsx
git commit -m "feat: add year tick marks to history timeline bar"
```

---

### Task 3: Keyboard shortcuts for playback (Space, ←, →)

**Files:**

- Modify: `src/renderer/src/components/Graph/GraphView.tsx` — add a `useEffect` for `keydown` events near line ~993 (after the play animation effect)

- [ ] **Step 1: Add keyboard handler effect**

After the `useEffect` that handles `isPlaying` (around line 978), add:

```tsx
useEffect(() => {
  if (viewMode !== 'history') return
  const handleKey = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
    if (e.code === 'Space') {
      e.preventDefault()
      if (progress >= 1) setProgress(0)
      setIsPlaying((p) => !p)
    } else if (e.code === 'ArrowRight') {
      e.preventDefault()
      setIsPlaying(false)
      setProgress((p) => Math.min(p + 0.01, 1))
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault()
      setIsPlaying(false)
      setProgress((p) => Math.max(p - 0.01, 0))
    }
  }
  window.addEventListener('keydown', handleKey)
  return () => window.removeEventListener('keydown', handleKey)
}, [viewMode, progress])
```

- [ ] **Step 2: Add keyboard hint to the timeline bar**

After the Record button in the timeline bar (line ~1717), add a subtle hint:

```tsx
<span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', flexShrink: 0, marginLeft: 4 }}>
  Space · ←→
</span>
```

- [ ] **Step 3: Test keyboard shortcuts**

Switch to History mode. Press Space to toggle play/pause. Press ← and → to step through the timeline. Make sure focus on the range input or select doesn't interfere.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/components/Graph/GraphView.tsx
git commit -m "feat: add Space/ArrowLeft/ArrowRight keyboard shortcuts in History mode"
```

---

### Task 4: Note activity minimap above the scrubber

**Files:**

- Modify: `src/renderer/src/components/Graph/GraphView.tsx:1608-1719`

Show a small bar chart (sparkline) above the scrubber that visualises how many notes were created in each time bucket. This gives users a sense of activity density before they scrub.

- [ ] **Step 1: Compute activity buckets**

After the `historyTicks` memo, add:

```tsx
const activityBuckets = useMemo(() => {
  const BUCKETS = 80
  const counts = new Array<number>(BUCKETS).fill(0)
  birthtimes.forEach((ts) => {
    const frac = (ts - minTime) / (maxTime - minTime)
    const idx = Math.min(Math.floor(frac * BUCKETS), BUCKETS - 1)
    counts[idx]++
  })
  const maxCount = Math.max(...counts, 1)
  return counts.map((c) => c / maxCount)
}, [birthtimes, minTime, maxTime])
```

- [ ] **Step 2: Render the minimap as an SVG inside the timeline bar**

The minimap should sit above the range input. Make the timeline bar container `position: relative` (already done in Task 2). Add the SVG inside the timeline bar div, before the date label:

```tsx
{
  /* Activity minimap — rendered as absolute overlay above scrubber */
}
;<svg
  style={{
    position: 'absolute',
    left: isSettingsOpen ? 348 : 16,
    right: 16,
    top: 4,
    height: 18,
    pointerEvents: 'none',
    opacity: 0.45
  }}
  preserveAspectRatio="none"
  viewBox={`0 0 ${activityBuckets.length} 1`}
>
  {activityBuckets.map((h, i) => (
    <rect key={i} x={i} y={1 - h} width={0.85} height={h} fill="var(--accent-color)" />
  ))}
  {/* Playhead indicator */}
  <line
    x1={progress * activityBuckets.length}
    y1={0}
    x2={progress * activityBuckets.length}
    y2={1}
    stroke="#fff"
    strokeWidth={0.4}
    opacity={0.7}
  />
</svg>
```

- [ ] **Step 3: Adjust timeline bar height to accommodate minimap**

Change `height: 60` to `height: 72` on the timeline bar container so there's room for the minimap above the controls row. Shift the controls row to the bottom by wrapping the existing controls (date span, range, buttons) in a flex div with `alignItems: 'center'` and `marginTop: 'auto'`.

Before (the timeline bar's inner contents start directly):

```tsx
<span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 136, flexShrink: 0 }}>
```

Wrap all controls in:

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', marginTop: 'auto' }}>
  {/* ... all existing controls: date span, range input, play button, select, record button, hint ... */}
</div>
```

Also update the bottom offset for legend/HUD from `80` to `96`:

```tsx
bottom: viewMode === 'history' ? 96 : 24,
```

- [ ] **Step 4: Verify minimap renders correctly**

Open History mode. A faint bar chart should appear at the top of the timeline bar. Scrubbing should move the white playhead line. Dense periods should show taller bars.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/components/Graph/GraphView.tsx
git commit -m "feat: add note activity minimap to history timeline bar"
```

---

## Self-Review

**Spec coverage:**

- ✅ Sidebar overlapping timeline bar → Task 1 (paddingLeft offset)
- ✅ Date context while scrubbing → Task 2 (year tick marks)
- ✅ Better playback UX → Task 3 (keyboard shortcuts)
- ✅ Visualize activity density → Task 4 (minimap sparkline)

**Placeholder scan:** No TBDs or TODOs. All code is complete.

**Type consistency:** `setProgress`, `setIsPlaying`, `progress`, `isSettingsOpen`, `isPlaying`, `viewMode`, `minTime`, `maxTime`, `birthtimes` — all used consistently with their existing types (`number`, `boolean`, `string`).

**Potential edge case:** If `birthtimes` is empty (no files), `activityBuckets` will be all zeros — the minimap renders as flat, which is fine.

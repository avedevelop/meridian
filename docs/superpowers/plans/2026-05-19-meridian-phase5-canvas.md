# Meridian Phase 5: Infinite Canvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an Obsidian-compatible infinite spatial canvas (`.canvas` file format) using `react-konva` and `konva`. Users can open `.canvas` files as editor tabs, double-click to create text cards, drag-and-drop notes from the file tree onto the canvas, and link cards together with customizable edges.

**Architecture:** 
1. **JSON Serialization**: Canvas state is saved as UTF-8 JSON in `.canvas` files. The existing `vault:read-file` and `vault:write-file` IPC handlers are fully compatible.
2. **Editor Integration**: `EditorArea` (`src/renderer/src/components/Editor/EditorPane.tsx`) detects if `activeTabPath` ends with `.canvas`. If so, it renders `<CanvasView>` instead of the CodeMirror editor.
3. **Konva Stage**: The canvas utilizes a `<Stage>` and `<Layer>` from `react-konva`. Pan is handled via Stage dragging (`draggable={true}` on Stage with custom buttons or mouse middle-click), and zoom via scroll wheel scaling.
4. **Card Types**: Support for two node types:
   - `text`: Editable markdown/plain-text cards.
   - `file`: Cards linked to a vault note, displaying the note's name and partial content.
5. **Connections (Edges)**: Drawn as dynamic Bezier curves/lines between card boundary connection points.

**Tech Stack:** `konva`, `react-konva`, canvas-drag-drop events, existing Zustand vault stores.

---

## File Structure

```
src/
  renderer/src/
    components/
      Canvas/
        CanvasView.tsx      — [NEW] Infinite Konva canvas viewport, toolbar, Stage events
        CanvasNode.tsx      — [NEW] Renders Text/File cards with borders, title, resize anchors
        CanvasEdge.tsx      — [NEW] Renders connecting arrows/lines between nodes
      Editor/
        EditorPane.tsx      — [MODIFY] Render CanvasView if file is .canvas
      Sidebar/
        FileTree.tsx        — [MODIFY] Support dragstart for files to drop onto Canvas
        Sidebar.tsx         — [MODIFY] Allow creating a new .canvas file
```

---

## Task 1: Package Installation & Editor Area Integration

**Files:**
- Modify: `meridian/package.json`
- Modify: `meridian/src/renderer/src/components/Editor/EditorPane.tsx`
- Modify: `meridian/src/renderer/src/components/Sidebar/Sidebar.tsx`

- [ ] **Step 1: Install Konva and React-Konva**
Run the npm install command to add canvas dependencies:
```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm install konva react-konva --save
```

- [ ] **Step 2: Add New Canvas option in Sidebar header**
In `src/renderer/src/components/Sidebar/Sidebar.tsx`, add a button next to "New Note" to create a new Canvas (`.canvas` format). It creates an empty JSON:
```json
{
  "nodes": [],
  "edges": []
}
```
And writes it to a file, refreshing the file tree and opening the new tab.

- [ ] **Step 3: Modify EditorPane.tsx to route to CanvasView**
In `src/renderer/src/components/Editor/EditorPane.tsx`, check `activeTabPath.endsWith('.canvas')`. If true, bypass CodeMirror and instead render `<CanvasView path={activeTabPath} content={activeTab.content} />`.

---

## Task 2: Canvas Core Viewport (Pan, Zoom, Grid)

**Files:**
- Create: `meridian/src/renderer/src/components/Canvas/CanvasView.tsx`

- [ ] **Step 1: Implement Konva Stage with Pan & Zoom**
Create the Stage with dimensions tracking the viewport size.
- Implement pan by enabling `draggable` on Stage when space is held down or middle-click is pressed.
- Implement scroll wheel zoom targeting the cursor coordinate:
```typescript
const stage = e.target.getStage();
const oldScale = stage.scaleX();
const pointer = stage.getPointerPosition();
const scaleBy = 1.1;
const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
stage.scale({ x: newScale, y: newScale });
```

- [ ] **Step 2: Add Dot-grid Background**
Render a background layer that draws a pattern of dots. Update grid coordinates dynamically based on stage transforms so the grid feels infinite and scrolls with the viewport.

---

## Task 3: Node Operations (Cards, Drag & Drop, Resizing)

**Files:**
- Create: `meridian/src/renderer/src/components/Canvas/CanvasNode.tsx`
- Modify: `meridian/src/renderer/src/components/Sidebar/FileTree.tsx`

- [ ] **Step 1: Double-click to create Text Node**
Listen for double clicks on the Stage background. When triggered, open a text input or create a default text card at the canvas coordinates:
```typescript
const stage = stageRef.current;
const transform = stage.getAbsoluteTransform().copy().invert();
const pos = transform.point(stage.getPointerPosition());
```

- [ ] **Step 2: Drag and Drop notes from FileTree**
- In `FileTree.tsx`, add `draggable={!file.isDirectory}` to file tree items and write the file path into the dataTransfer payload on `onDragStart`.
- In `CanvasView.tsx`, handle `onDragOver` (prevent default) and `onDrop`. Parse the file path, compute target coordinates, and insert a new `file` type node pointing to the note.

- [ ] **Step 3: Inline Text Editing & Resizing**
Create the node rendering component. Use Konva transformer or custom rect handles to allow resizing nodes (changing width and height properties). Support double clicking the node to show a HTML textarea overlays for editing text.

---

## Task 4: Connective Edges & Auto-Saving

**Files:**
- Create: `meridian/src/renderer/src/components/Canvas/CanvasEdge.tsx`
- Modify: `meridian/src/renderer/src/components/Canvas/CanvasView.tsx`

- [ ] **Step 1: Connection Handles**
Draw 4 small circle handles at the borders (top, right, bottom, left) of the active node. Clicking and dragging from a handle starts drawing a temporary line. Releasing the mouse over another node creates a connection edge in the JSON.

- [ ] **Step 2: Draw Curves**
Draw Bezier connections (`d3.linkHorizontal` style or cubic Bezier curves in Konva) between connected nodes using their coordinates. Update edge anchors dynamically as nodes are dragged.

- [ ] **Step 3: Save on modification**
Whenever a node is added, moved, resized, or an edge is created/removed, serialize the canvas state back to JSON and invoke `window.vault.writeFile(path, jsonString)` to auto-save progress.

---

## Task 5: Verification & Styling

- [ ] **Step 1: Run build and lint checks**
Ensure Typescript compilation runs cleanly:
```bash
npm run typecheck
```

- [ ] **Step 2: Verify in the application**
Create a new canvas `MyBoard.canvas`, drop notes, drag them around, draw links, and reopen the canvas to verify persistent saving.

import { useEffect, useState, useMemo } from 'react'
import { useSettingsStore, SettingsState } from '../../store/useSettingsStore'
import { useVaultStore } from '../../store/useVaultStore'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

function getCategoryIcon(id: string, color: string) {
  const size = 15
  switch (id) {
    case 'editor':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      )
    case 'files':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      )
    case 'appearance':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.02984 19.1713 5.28151 19.2312 5.51139 19.1553C6.48002 18.8354 7.23558 18 8.5 18C9.5 18 10 18.5 10.5 19.5C11 20.5 11 22 12 22Z" />
          <circle cx="7.5" cy="10.5" r="1" fill={color} />
          <circle cx="11.5" cy="7.5" r="1" fill={color} />
          <circle cx="16.5" cy="9.5" r="1" fill={color} />
        </svg>
      )
    case 'canvas':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeDasharray="3 2" />
          <path d="M9 3v18M3 9h18" strokeWidth="1" opacity="0.4" />
        </svg>
      )
    case 'plugins':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <path d="M6 3v7M3 6h6" />
        </svg>
      )
    case 'hotkeys':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
          <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M18 12h.01M7 16h10" />
        </svg>
      )
    case 'about':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" strokeWidth="2.5" />
        </svg>
      )
    default:
      return null
  }
}

// ----------------------------------------------------
// UI COMPONENTS
// ----------------------------------------------------

function Toggle({
  label,
  description,
  checked,
  onChange
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (b: boolean) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: '#161616',
        borderRadius: 8,
        border: '1px solid #252525'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingRight: 16 }}>
        <span style={{ color: '#eee', fontSize: 13, fontWeight: 500 }}>{label}</span>
        {description && (
          <span style={{ color: '#777', fontSize: 11, lineHeight: '1.4' }}>{description}</span>
        )}
      </div>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 38,
          height: 20,
          borderRadius: 10,
          background: checked ? '#7c6af7' : '#333',
          position: 'relative',
          cursor: 'pointer',
          transition: 'background 0.2s ease',
          flexShrink: 0
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: '#fff',
            position: 'absolute',
            top: 3,
            left: checked ? 21 : 3,
            transition: 'left 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
          }}
        />
      </div>
    </div>
  )
}

function Slider({
  label,
  description,
  value,
  min,
  max,
  unit,
  onChange
}: {
  label: string
  description?: string
  value: number
  min: number
  max: number
  unit: string
  onChange: (n: number) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '12px 16px',
        background: '#161616',
        borderRadius: 8,
        border: '1px solid #252525'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ color: '#eee', fontSize: 13, fontWeight: 500 }}>{label}</span>
          {description && <span style={{ color: '#777', fontSize: 11 }}>{description}</span>}
        </div>
        <span
          style={{
            color: '#7c6af7',
            fontWeight: 600,
            fontSize: 13,
            background: 'rgba(124, 106, 247, 0.1)',
            padding: '2px 8px',
            borderRadius: 4
          }}
        >
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        step={unit === '' ? 0.1 : 1}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#7c6af7', cursor: 'pointer', margin: '4px 0' }}
      />
    </div>
  )
}

function Dropdown<T extends string | number>({
  label,
  description,
  value,
  options,
  onChange
}: {
  label: string
  description?: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: '#161616',
        borderRadius: 8,
        border: '1px solid #252525'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingRight: 16 }}>
        <span style={{ color: '#eee', fontSize: 13, fontWeight: 500 }}>{label}</span>
        {description && <span style={{ color: '#777', fontSize: 11 }}>{description}</span>}
      </div>
      <select
        value={value}
        onChange={(e) => {
          const val = e.target.value
          const parsed = typeof options[0].value === 'number' ? (Number(val) as any) : val
          onChange(parsed)
        }}
        style={{
          background: '#222',
          border: '1px solid #3c3c3c',
          borderRadius: 6,
          color: '#eee',
          fontSize: 12,
          padding: '6px 12px',
          outline: 'none',
          cursor: 'pointer',
          minWidth: 120
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function TextInput({
  label,
  description,
  value,
  placeholder,
  onChange
}: {
  label: string
  description?: string
  value: string
  placeholder: string
  onChange: (s: string) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '12px 16px',
        background: '#161616',
        borderRadius: 8,
        border: '1px solid #252525'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ color: '#eee', fontSize: 13, fontWeight: 500 }}>{label}</span>
        {description && <span style={{ color: '#777', fontSize: 11 }}>{description}</span>}
      </div>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: '#222',
          border: '1px solid #3c3c3c',
          borderRadius: 6,
          color: '#eee',
          fontSize: 12,
          padding: '8px 12px',
          outline: 'none',
          fontFamily: 'monospace'
        }}
      />
    </div>
  )
}

function ColorPicker({
  label,
  description,
  value,
  options,
  onChange
}: {
  label: string
  description?: string
  value: string
  options: { color: string; name: string }[]
  onChange: (color: string) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: '#161616',
        borderRadius: 8,
        border: '1px solid #252525'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ color: '#eee', fontSize: 13, fontWeight: 500 }}>{label}</span>
        {description && <span style={{ color: '#777', fontSize: 11 }}>{description}</span>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {options.map((o) => {
          const isSelected = value.toLowerCase() === o.color.toLowerCase()
          return (
            <div
              key={o.color}
              onClick={() => onChange(o.color)}
              title={o.name}
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: o.color,
                cursor: 'pointer',
                border: isSelected ? '2px solid #fff' : '2px solid transparent',
                boxShadow: isSelected ? '0 0 8px rgba(255,255,255,0.4)' : 'none',
                transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                transition: 'all 0.15s ease'
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

// ----------------------------------------------------
// SETTINGS ITEMS SCHEMA (For Searchability)
// ----------------------------------------------------

type SettingCategory =
  | 'editor'
  | 'files'
  | 'appearance'
  | 'canvas'
  | 'hotkeys'
  | 'plugins'
  | 'about'

interface SettingDefinition {
  id: string
  label: string
  description: string
  category: SettingCategory
  render: (store: SettingsState) => React.ReactNode
}

// ----------------------------------------------------
// MAIN SETTINGS MODAL
// ----------------------------------------------------

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const store = useSettingsStore()
  const vault = useVaultStore((s) => s.vault)
  const [activeCategory, setActiveCategory] = useState<SettingCategory>('editor')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      setActiveCategory('editor')
      setSearchQuery('')
    }
  }, [isOpen])

  // Definitions for all settings for search and tab rendering
  const settingsDefinitions = useMemo<SettingDefinition[]>(
    () => [
      // EDITOR
      {
        id: 'defaultViewMode',
        label: 'Default view mode',
        description: 'Choose between Source mode (raw markdown) and Live Preview (rendered inline).',
        category: 'editor',
        render: (s) => (
          <Dropdown
            label="Default view mode"
            description="Source mode shows raw markdown syntax. Live Preview hides markup and renders it inline."
            value={s.defaultViewMode}
            options={[
              { value: 'source', label: 'Source Mode' },
              { value: 'live-preview', label: 'Live Preview' }
            ]}
            onChange={(v) => s.updateSetting('defaultViewMode', v)}
          />
        )
      },
      {
        id: 'showPreviewPane',
        label: 'Show split preview',
        description: 'Show a side-by-side HTML preview panel when editing markdown files.',
        category: 'editor',
        render: (s) => (
          <Toggle
            label="Show split preview"
            description="Display the side-by-side HTML preview pane next to the markdown editor."
            checked={s.showPreviewPane}
            onChange={(v) => s.updateSetting('showPreviewPane', v)}
          />
        )
      },
      {
        id: 'fontSize',
        label: 'Font size',
        description: 'Adjust the text font size of both the markdown editor and preview text.',
        category: 'editor',
        render: (s) => (
          <Slider
            label="Font size"
            description="Adjust the text font size of both the editor and preview."
            value={s.fontSize}
            min={13}
            max={22}
            unit="px"
            onChange={s.setFontSize}
          />
        )
      },
      {
        id: 'lineWidth',
        label: 'Line width',
        description: 'Set the maximum content column width for the writing area.',
        category: 'editor',
        render: (s) => (
          <Slider
            label="Line width"
            description="Set the maximum content column width for the writing area."
            value={s.lineWidth}
            min={600}
            max={960}
            unit="px"
            onChange={s.setLineWidth}
          />
        )
      },
      {
        id: 'readableLineLength',
        label: 'Readable line length',
        description: 'Limit the width of the editor/preview area to a readable size.',
        category: 'editor',
        render: (s) => (
          <Toggle
            label="Readable line length"
            description="Limit the width of the editor/preview area to a readable size."
            checked={s.readableLineLength}
            onChange={(v) => s.updateSetting('readableLineLength', v)}
          />
        )
      },
      {
        id: 'fontFamily',
        label: 'Font family',
        description: 'Set the font family family face used inside the editor workspace.',
        category: 'editor',
        render: (s) => (
          <Dropdown
            label="Font family"
            description="Select typography styles for composing notes."
            value={s.fontFamily}
            options={[
              { value: 'Georgia', label: 'Georgia (Elegant Serif)' },
              { value: 'Inter', label: 'Inter (Modern Sans)' },
              { value: 'Fira Code', label: 'Fira Code (Code Monospace)' },
              { value: 'JetBrains Mono', label: 'JetBrains Mono' },
              { value: 'system-ui', label: 'System UI Default' }
            ]}
            onChange={(v) => s.updateSetting('fontFamily', v)}
          />
        )
      },
      {
        id: 'fontWeight',
        label: 'Font weight',
        description: 'Define the font thickness weight in the editor.',
        category: 'editor',
        render: (s) => (
          <Dropdown
            label="Font weight"
            description="Thickness level of active text characters."
            value={s.fontWeight}
            options={[
              { value: '300', label: 'Light (300)' },
              { value: '400', label: 'Regular (400)' },
              { value: '500', label: 'Medium (500)' },
              { value: '700', label: 'Bold (700)' }
            ]}
            onChange={(v) => s.updateSetting('fontWeight', v)}
          />
        )
      },
      {
        id: 'lineHeight',
        label: 'Line height spacing',
        description: 'Configure vertical line heights spacing of editor texts.',
        category: 'editor',
        render: (s) => (
          <Slider
            label="Line height spacing"
            description="Scale vertical spacing height factor."
            value={s.lineHeight}
            min={1.2}
            max={2.4}
            unit=""
            onChange={(v) => s.updateSetting('lineHeight', v)}
          />
        )
      },
      {
        id: 'lineWrapping',
        label: 'Line wrapping',
        description: 'Wrap long text lines automatically at the column boundaries.',
        category: 'editor',
        render: (s) => (
          <Toggle
            label="Line wrapping"
            description="Wrap long text lines automatically at the column boundaries."
            checked={s.lineWrapping}
            onChange={(v) => s.updateSetting('lineWrapping', v)}
          />
        )
      },
      {
        id: 'lineNumbers',
        label: 'Show line numbers',
        description: 'Display vertical line numbers in the gutter of the markdown editor.',
        category: 'editor',
        render: (s) => (
          <Toggle
            label="Show line numbers"
            description="Display vertical line numbers in the gutter."
            checked={s.lineNumbers}
            onChange={(v) => s.updateSetting('lineNumbers', v)}
          />
        )
      },
      {
        id: 'tabSize',
        label: 'Tab size',
        description: 'Set the number of spaces to insert when pressing the Tab key.',
        category: 'editor',
        render: (s) => (
          <Dropdown
            label="Tab size"
            description="Choose the number of spaces used for indentation."
            value={s.tabSize}
            options={[
              { value: 2, label: '2 spaces' },
              { value: 4, label: '4 spaces' },
              { value: 8, label: '8 spaces' }
            ]}
            onChange={(v) => s.updateSetting('tabSize', v)}
          />
        )
      },
      {
        id: 'bracketMatching',
        label: 'Bracket matching',
        description: 'Highlight matching brackets when placing the cursor near one.',
        category: 'editor',
        render: (s) => (
          <Toggle
            label="Bracket matching"
            description="Highlight matching parentheses, brackets, and braces."
            checked={s.bracketMatching}
            onChange={(v) => s.updateSetting('bracketMatching', v)}
          />
        )
      },
      {
        id: 'closeBrackets',
        label: 'Auto close brackets',
        description: 'Automatically insert closing brackets, parentheses, and quotes.',
        category: 'editor',
        render: (s) => (
          <Toggle
            label="Auto close brackets"
            description="Automatically insert closing parentheses and brackets."
            checked={s.closeBrackets}
            onChange={(v) => s.updateSetting('closeBrackets', v)}
          />
        )
      },

      // AUTO-SAVE & FILES
      {
        id: 'autoSaveTrigger',
        label: 'Auto-save trigger policy',
        description: 'Define when modified notes should automatically write changes to disk.',
        category: 'files',
        render: (s) => (
          <Dropdown
            label="Auto-save trigger policy"
            description="Trigger saving after a delay, on focus change, or window blur."
            value={s.autoSaveTrigger}
            options={[
              { value: 'off', label: 'Off (Manual save ⌘S only)' },
              { value: 'afterDelay', label: 'After Inactivity Delay' },
              { value: 'onFocusChange', label: 'On Editor Focus Change' },
              { value: 'onWindowBlur', label: 'On Window Lost Focus (Alt-Tab)' }
            ]}
            onChange={(v) => s.updateSetting('autoSaveTrigger', v as any)}
          />
        )
      },
      {
        id: 'autoSaveDelay',
        label: 'Auto-save inactivity delay',
        description:
          'Set duration in seconds to wait before writing changes to disk (for delay policy).',
        category: 'files',
        render: (s) => (
          <Dropdown
            label="Auto-save inactivity delay"
            description="Time in seconds of editor inactivity before auto-saving."
            value={s.autoSaveDelay}
            options={[
              { value: 1, label: '1 second' },
              { value: 5, label: '5 seconds' },
              { value: 10, label: '10 seconds' },
              { value: 30, label: '30 seconds' }
            ]}
            onChange={(v) => s.updateSetting('autoSaveDelay', v)}
          />
        )
      },
      {
        id: 'closeBehavior',
        label: 'App exit behavior with unsaved files',
        description: 'Choose policy on close if files contain unsaved changes.',
        category: 'files',
        render: (s) => (
          <Dropdown
            label="App exit behavior"
            description="Save, discard, or ask confirmation prompt on app exit."
            value={s.closeBehavior}
            options={[
              { value: 'ask', label: 'Ask Confirmation (Recommended)' },
              { value: 'save', label: 'Save Automatically' },
              { value: 'discard', label: 'Discard Unsaved Changes' }
            ]}
            onChange={(v) => s.updateSetting('closeBehavior', v as any)}
          />
        )
      },
      {
        id: 'linkFormat',
        label: 'Note link format style',
        description: 'Set the format used when creating internal links or dropping notes.',
        category: 'files',
        render: (s) => (
          <Dropdown
            label="Note link format style"
            description="Choose link style when dropping or autocompleting connections."
            value={s.linkFormat}
            options={[
              { value: 'wiki', label: 'Wiki-Links [[Note Name]]' },
              { value: 'markdown', label: 'Markdown Links [Note](path.md)' }
            ]}
            onChange={(v) => s.updateSetting('linkFormat', v)}
          />
        )
      },
      {
        id: 'newNotesFolder',
        label: 'Default folder path for new notes',
        description: 'Specify the relative path folder where newly created notes will be placed.',
        category: 'files',
        render: (s) => (
          <TextInput
            label="Default folder path for new notes"
            description="Folder inside the vault where new notes are created by default."
            value={s.newNotesFolder}
            placeholder="e.g. Daily or root"
            onChange={(v) => s.updateSetting('newNotesFolder', v)}
          />
        )
      },

      // APPEARANCE
      {
        id: 'accentColor',
        label: 'Accent color theme',
        description: 'Change the highlight/brand color theme of the user interface.',
        category: 'appearance',
        render: (s) => (
          <ColorPicker
            label="Accent color theme"
            description="Select a color scheme used for links, active states, and buttons."
            value={s.accentColor}
            options={[
              { color: 'purple', name: 'Purple (#7c6af7)' },
              { color: 'blue', name: 'Blue (#2196f3)' },
              { color: 'green', name: 'Green (#4caf50)' },
              { color: 'orange', name: 'Orange (#ff9800)' },
              { color: 'red', name: 'Red (#f44336)' }
            ]}
            onChange={(v) => s.updateSetting('accentColor', v as any)}
          />
        )
      },
      {
        id: 'theme',
        label: 'Workspace theme variant',
        description: 'Choose the background and visual theme of the editor workspace.',
        category: 'appearance',
        render: (s) => (
          <Dropdown
            label="Workspace theme variant"
            description="Select visual styling for background and sidebars."
            value={s.theme}
            options={[
              { value: 'dark', label: 'Deep Charcoal (Standard)' },
              { value: 'midnight', label: 'Pitch Midnight Black' },
              { value: 'indigo', label: 'Indigo Space Dark' },
              { value: 'cyberpunk', label: 'Cyberpunk Neon Dark' },
              { value: 'forest', label: 'Forest Moss Green' },
              { value: 'nord', label: 'Nordic Frost Blue' },
              { value: 'dracula', label: 'Dracula Purple Dark' },
              { value: 'obsidian', label: 'Obsidian Pitch Contrast' }
            ]}
            onChange={(v) => s.updateSetting('theme', v as any)}
          />
        )
      },
      {
        id: 'sidebarSide',
        label: 'Primary sidebar position',
        description: 'Place the workspace navigation panel on the left or right side.',
        category: 'appearance',
        render: (s) => (
          <Dropdown
            label="Primary sidebar position"
            description="Set whether the File tree explorer sits on the left or right."
            value={s.sidebarSide}
            options={[
              { value: 'left', label: 'Left Sidebar' },
              { value: 'right', label: 'Right Sidebar' }
            ]}
            onChange={(v) => s.updateSetting('sidebarSide', v)}
          />
        )
      },

      // CANVAS
      {
        id: 'snapToGrid',
        label: 'Snap cards to grid',
        description: 'Enable snapping canvas cards and items to grid coordinates on drag.',
        category: 'canvas',
        render: (s) => (
          <Toggle
            label="Snap cards to grid"
            description="Align notes and groups to grid coordinates when moving them."
            checked={s.snapToGrid}
            onChange={(v) => s.updateSetting('snapToGrid', v)}
          />
        )
      },
      {
        id: 'gridSize',
        label: 'Grid spacing cell size',
        description: 'Set the size of grid cells in pixels for alignment snapping.',
        category: 'canvas',
        render: (s) => (
          <Slider
            label="Grid spacing cell size"
            description="Set snapping alignment step distance in pixels."
            value={s.gridSize}
            min={5}
            max={30}
            unit="px"
            onChange={(v) => s.updateSetting('gridSize', v)}
          />
        )
      },
      {
        id: 'connectionLineStyle',
        label: 'Connection line connection style',
        description: 'Set rendering style for lines drawn between linked canvas items.',
        category: 'canvas',
        render: (s) => (
          <Dropdown
            label="Connection line style"
            description="Choose aesthetic style of link path lines on canvas."
            value={s.connectionLineStyle}
            options={[
              { value: 'curved', label: 'Curved Bezier Lines' },
              { value: 'straight', label: 'Straight Lines' },
              { value: 'orthogonal', label: 'Orthogonal Right-angle Lines' }
            ]}
            onChange={(v) => s.updateSetting('connectionLineStyle', v)}
          />
        )
      },
      {
        id: 'defaultCardColor',
        label: 'Default card background color',
        description: 'Set default tint color for newly created canvas notes.',
        category: 'canvas',
        render: (s) => (
          <ColorPicker
            label="Default card background color"
            description="Color applied to new card nodes when dropped onto spatial workspace."
            value={s.defaultCardColor}
            options={[
              { color: '#7c6af7', name: 'Meridian Purple' },
              { color: '#e0c068', name: 'Sand Yellow' },
              { color: '#68c098', name: 'Sage Green' },
              { color: '#6898c0', name: 'Sky Blue' },
              { color: '#c06868', name: 'Clay Red' }
            ]}
            onChange={(v) => s.updateSetting('defaultCardColor', v)}
          />
        )
      }
    ],
    []
  )

  const categoriesList = [
    { id: 'editor', label: 'Editor' },
    { id: 'files', label: 'Files & Saving' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'canvas', label: 'Canvas' },
    { id: 'plugins', label: 'Core Plugins' },
    { id: 'hotkeys', label: 'Hotkeys' },
    { id: 'about', label: 'About & Developer' }
  ] as const

  // Filtered settings based on search query
  const filteredSettings = useMemo(() => {
    if (!searchQuery) return []
    const query = searchQuery.toLowerCase().trim()
    return settingsDefinitions.filter(
      (s) =>
        s.label.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.category.toLowerCase().includes(query)
    )
  }, [searchQuery, settingsDefinitions])

  // Custom link opener using window.vault.openExternal
  const handleOpenLink = (url: string) => {
    if (window.vault?.openExternal) {
      window.vault.openExternal(url)
    } else {
      window.open(url, '_blank')
    }
  }

  // Plugins list
  const pluginsList = [
    {
      id: 'dailyNotes',
      name: 'Daily Notes',
      desc: 'Create and open a daily note based on current date automatically.',
      author: 'ave'
    },
    {
      id: 'wordCounter',
      name: 'Word Counter',
      desc: 'Count and display the total number of words in the status bar.',
      author: 'ave'
    },
    {
      id: 'slashCommands',
      name: 'Slash Commands',
      desc: 'Trigger formatting actions and note insertions using / key triggers.',
      author: 'ave'
    },
    {
      id: 'tagsPanel',
      name: 'Tag Index Panel',
      desc: 'Show an index of all hashtag elements parsed in note contents.',
      author: 'ave'
    },
    {
      id: 'backlinksPanel',
      name: 'Backlinks Explorer',
      desc: 'List notes referencing the current active tab note.',
      author: 'ave'
    },
    {
      id: 'tocPanel',
      name: 'Table of Contents',
      desc: 'Generate dynamic layout heading navigators for markdown documents.',
      author: 'ave'
    },
    {
      id: 'gitBackup',
      name: 'Git Autocommit Backups',
      desc: 'Periodically git commit changes inside the vault automatically.',
      author: 'ave'
    },
    {
      id: 'excalidraw',
      name: 'Excalidraw Sketchpad',
      desc: 'Integrate dynamic hand-drawn diagrams inside notes.',
      author: 'ave'
    }
  ] as const

  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 900,
          height: 600,
          background: 'var(--bg-primary)',
          borderRadius: 14,
          border: '1px solid var(--border-color)',
          boxShadow: '0 24px 72px rgba(0,0,0,0.9)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        }}
      >
        {/* TOP BAR */}
        <div
          style={{
            height: 48,
            padding: '0 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-secondary)'
          }}
        >
          <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, letterSpacing: '0.02em' }}>
            System Settings
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 22,
              lineHeight: 1,
              transition: 'color 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            ×
          </button>
        </div>

        {/* CONTAINER */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* SIDEBAR */}
          <div
            style={{
              width: 240,
              background: 'var(--bg-tertiary)',
              borderRight: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              padding: '16px 8px'
            }}
          >
            {/* Search Input */}
            <div style={{ padding: '0 8px 12px 8px' }}>
              <input
                type="text"
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  padding: '6px 10px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Category Navigation */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                flex: 1,
                overflowY: 'auto'
              }}
            >
              {categoriesList.map((cat) => {
                const isSelected = !searchQuery && activeCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSearchQuery('')
                      setActiveCategory(cat.id)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      borderRadius: 6,
                      background: isSelected ? 'var(--accent-glow)' : 'transparent',
                      border: 'none',
                      color: isSelected ? 'var(--accent-color)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: 12,
                      fontWeight: isSelected ? 600 : 500,
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                        e.currentTarget.style.color = 'var(--text-primary)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--text-secondary)'
                      }
                    }}
                  >
                    <span
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {getCategoryIcon(cat.id, isSelected ? 'var(--accent-color)' : 'var(--text-secondary)')}
                    </span>
                    <span>{cat.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Reset Defaults button */}
            <div style={{ padding: '8px 8px 0 8px', borderTop: '1px solid var(--border-color)' }}>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to reset all settings to defaults?')) {
                    store.resetToDefault()
                  }
                }}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: '1px dashed var(--border-color)',
                  borderRadius: 6,
                  color: 'var(--text-secondary)',
                  fontSize: 11,
                  padding: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#c06868'
                  e.currentTarget.style.color = '#c06868'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }}
              >
                Reset Defaults
              </button>
            </div>
          </div>

          {/* MAIN SETTINGS PANE */}
          <div
            style={{
              flex: 1,
              background: 'var(--bg-primary)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Scroll Container */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
              {/* SEARCH RESULTS MODE */}
              {searchQuery ? (
                <div>
                  <div style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                    Search Results
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginBottom: 20 }}>
                    Showing results matching "{searchQuery}"
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {filteredSettings.length > 0 ? (
                      filteredSettings.map((item) => (
                        <div key={item.id}>
                          <div
                            style={{
                              color: 'var(--text-secondary)',
                              fontSize: 9,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              marginBottom: 4
                            }}
                          >
                            {item.category}
                          </div>
                          {item.render(store)}
                        </div>
                      ))
                    ) : (
                      <div
                        style={{
                          textAlign: 'center',
                          color: 'var(--text-secondary)',
                          padding: '48px 0',
                          fontSize: 13
                        }}
                      >
                        No settings found matching your query
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* CATEGORY TAB MODE */
                <div>
                  {activeCategory === 'editor' && (
                    <div>
                      <h3
                        style={{
                          margin: '0 0 4px 0',
                          color: 'var(--text-primary)',
                          fontSize: 16,
                          fontWeight: 600
                        }}
                      >
                        Editor
                      </h3>
                      <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)', fontSize: 12 }}>
                        Customize your markdown writing environment, tab options, and editor
                        indicators.
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {settingsDefinitions
                          .filter((s) => s.category === 'editor')
                          .map((s) => (
                            <div key={s.id}>{s.render(store)}</div>
                          ))}
                      </div>
                    </div>
                  )}

                  {activeCategory === 'files' && (
                    <div>
                      <h3
                        style={{
                          margin: '0 0 4px 0',
                          color: '#fff',
                          fontSize: 16,
                          fontWeight: 600
                        }}
                      >
                        Files & Auto-Saving
                      </h3>
                      <p style={{ margin: '0 0 20px 0', color: '#777', fontSize: 12 }}>
                        Configure internal links generation, auto-save triggers, and folder paths.
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {settingsDefinitions
                          .filter((s) => s.category === 'files')
                          .map((s) => (
                            <div key={s.id}>{s.render(store)}</div>
                          ))}
                      </div>
                    </div>
                  )}

                  {activeCategory === 'appearance' && (
                    <div>
                      <h3
                        style={{
                          margin: '0 0 4px 0',
                          color: '#fff',
                          fontSize: 16,
                          fontWeight: 600
                        }}
                      >
                        Appearance
                      </h3>
                      <p style={{ margin: '0 0 20px 0', color: '#777', fontSize: 12 }}>
                        Style your workspace layout, accent coloring, and overall window elements.
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {settingsDefinitions
                          .filter((s) => s.category === 'appearance')
                          .map((s) => (
                            <div key={s.id}>{s.render(store)}</div>
                          ))}
                      </div>
                    </div>
                  )}

                  {activeCategory === 'canvas' && (
                    <div>
                      <h3
                        style={{
                          margin: '0 0 4px 0',
                          color: '#fff',
                          fontSize: 16,
                          fontWeight: 600
                        }}
                      >
                        Canvas
                      </h3>
                      <p style={{ margin: '0 0 20px 0', color: '#777', fontSize: 12 }}>
                        Adjust behaviors, snappings, lines, and cards customization on Spatial
                        Canvas.
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {settingsDefinitions
                          .filter((s) => s.category === 'canvas')
                          .map((s) => (
                            <div key={s.id}>{s.render(store)}</div>
                          ))}
                      </div>
                    </div>
                  )}

                  {activeCategory === 'plugins' && (
                    <div>
                      <h3
                        style={{
                          margin: '0 0 4px 0',
                          color: '#fff',
                          fontSize: 16,
                          fontWeight: 600
                        }}
                      >
                        Core Plugins
                      </h3>
                      <p style={{ margin: '0 0 20px 0', color: '#777', fontSize: 12 }}>
                        Extend Meridian functionality by enabling or disabling modular community
                        plugins.
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {pluginsList.map((p) => {
                          const isEnabled = store.pluginsEnabled[p.id]
                          return (
                            <div
                              key={p.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '14px 18px',
                                background: '#161616',
                                borderRadius: 8,
                                border: '1px solid #252525'
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 3,
                                  paddingRight: 16
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ color: '#eee', fontSize: 13, fontWeight: 600 }}>
                                    {p.name}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 9,
                                      color: '#555',
                                      background: '#222',
                                      padding: '1px 5px',
                                      borderRadius: 4
                                    }}
                                  >
                                    v{(window as any).appInfo?.version ?? '1.0.0'}
                                  </span>
                                </div>
                                <span style={{ color: '#777', fontSize: 11, lineHeight: '1.4' }}>
                                  {p.desc}
                                </span>
                                <div
                                  style={{
                                    display: 'flex',
                                    gap: 4,
                                    fontSize: 10,
                                    color: '#555',
                                    marginTop: 4
                                  }}
                                >
                                  <span>by</span>
                                  <span
                                    onClick={() => handleOpenLink('https://github.com/bvsmma')}
                                    style={{
                                      color: '#7c6af7',
                                      cursor: 'pointer',
                                      textDecoration: 'underline'
                                    }}
                                  >
                                    {p.author}
                                  </span>
                                </div>
                              </div>
                              <div
                                onClick={() => store.togglePlugin(p.id)}
                                style={{
                                  width: 38,
                                  height: 20,
                                  borderRadius: 10,
                                  background: isEnabled ? '#7c6af7' : '#333',
                                  position: 'relative',
                                  cursor: 'pointer',
                                  transition: 'background 0.2s ease',
                                  flexShrink: 0
                                }}
                              >
                                <div
                                  style={{
                                    width: 14,
                                    height: 14,
                                    borderRadius: '50%',
                                    background: '#fff',
                                    position: 'absolute',
                                    top: 3,
                                    left: isEnabled ? 21 : 3,
                                    transition: 'left 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
                                  }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {activeCategory === 'hotkeys' && (
                    <div>
                      <h3
                        style={{
                          margin: '0 0 4px 0',
                          color: '#fff',
                          fontSize: 16,
                          fontWeight: 600
                        }}
                      >
                        Keyboard Shortcuts
                      </h3>
                      <p style={{ margin: '0 0 20px 0', color: '#777', fontSize: 12 }}>
                        Review keybindings and shortcuts used to control the app navigation.
                      </p>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1,
                          background: '#252525',
                          borderRadius: 8,
                          overflow: 'hidden',
                          border: '1px solid #252525'
                        }}
                      >
                        {[
                          { group: 'General' },
                          { action: 'Command Palette', keys: ['⌘', 'K'] },
                          { action: 'Settings', keys: ['⌘', ','] },
                          { action: 'Open Vault', keys: ['⌘', 'O'] },
                          { group: 'Files' },
                          { action: 'New Note', keys: ['⌘', 'N'] },
                          { action: 'New Daily Note', keys: ['⌘', 'D'] },
                          { action: 'Save', keys: ['⌘', 'S'] },
                          { action: 'Export to HTML', keys: ['⌘', 'E'] },
                          { action: 'Close Tab', keys: ['⌘', 'W'] },
                          { group: 'View' },
                          { action: 'Graph View', keys: ['⌘', '⇧', 'G'] },
                          { group: 'Sketchpad' },
                          { action: 'Undo stroke', keys: ['⌘', 'Z'] },
                          { action: 'Redo stroke', keys: ['⌘', '⇧', 'Z'] },
                        ].map((hk, idx) => {
                          if ('group' in hk) {
                            return (
                              <div key={idx} style={{
                                padding: '8px 16px 4px',
                                background: '#161616',
                                color: '#555',
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                borderTop: idx > 0 ? '1px solid #252525' : 'none',
                              }}>
                                {hk.group}
                              </div>
                            )
                          }
                          return (
                            <div
                              key={hk.action}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 16px',
                                background: '#161616',
                              }}
                            >
                              <span style={{ color: '#ddd', fontSize: 13 }}>{hk.action}</span>
                              <div style={{ display: 'flex', gap: 4 }}>
                                {hk.keys.map((k, i) => (
                                  <kbd key={i} style={{
                                    background: '#222', border: '1px solid #3c3c3c',
                                    borderRadius: 4, color: '#aaa', fontSize: 11,
                                    padding: '2px 6px', fontFamily: 'monospace',
                                    boxShadow: '0 2px 0 #111',
                                  }}>
                                    {k}
                                  </kbd>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {activeCategory === 'about' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                      <div>
                        <h3
                          style={{
                            margin: '0 0 4px 0',
                            color: '#fff',
                            fontSize: 16,
                            fontWeight: 600
                          }}
                        >
                          Active Vault
                        </h3>
                        <p style={{ margin: '0 0 16px 0', color: '#777', fontSize: 12 }}>
                          Details and current settings for the opened workspace vault directory.
                        </p>
                        <div
                          style={{
                            padding: '16px',
                            background: '#161616',
                            borderRadius: 8,
                            border: '1px solid #252525',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            fontSize: 12
                          }}
                        >
                          <div style={{ display: 'flex' }}>
                            <span style={{ color: '#555', width: 100, fontWeight: 600 }}>
                              Vault Name:
                            </span>
                            <span style={{ color: '#eee', fontFamily: 'monospace' }}>
                              {vault?.name || 'No Vault'}
                            </span>
                          </div>
                          <div style={{ display: 'flex' }}>
                            <span style={{ color: '#555', width: 100, fontWeight: 600 }}>
                              Vault Path:
                            </span>
                            <span
                              style={{
                                color: '#aaa',
                                fontFamily: 'monospace',
                                wordBreak: 'break-all'
                              }}
                            >
                              {vault?.path || 'No Path'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3
                          style={{
                            margin: '0 0 4px 0',
                            color: '#fff',
                            fontSize: 16,
                            fontWeight: 600
                          }}
                        >
                          About Meridian
                        </h3>
                        <p style={{ margin: '0 0 16px 0', color: '#777', fontSize: 12 }}>
                          System environment statistics and versions.
                        </p>
                        <div
                          style={{
                            padding: '16px',
                            background: '#161616',
                            borderRadius: 8,
                            border: '1px solid #252525',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            fontSize: 12
                          }}
                        >
                          <div style={{ display: 'flex' }}>
                            <span style={{ color: '#555', width: 100, fontWeight: 600 }}>
                              Version:
                            </span>
                            <span style={{ color: '#eee' }}>v{(window as any).appInfo?.version ?? '1.0.0'}</span>
                          </div>
                          <div style={{ display: 'flex' }}>
                            <span style={{ color: '#555', width: 100, fontWeight: 600 }}>
                              Engine:
                            </span>
                            <span style={{ color: '#aaa' }}>Electron / React / TypeScript</span>
                          </div>
                          <div style={{ display: 'flex' }}>
                            <span style={{ color: '#555', width: 100, fontWeight: 600 }}>
                              Developer:
                            </span>
                            <span
                              onClick={() => handleOpenLink('https://github.com/bvsmma')}
                              style={{
                                color: '#7c6af7',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textDecoration: 'underline'
                              }}
                            >
                              ave
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

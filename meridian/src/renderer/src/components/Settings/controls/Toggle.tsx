interface ToggleProps {
  label: string
  description?: string
  checked: boolean
  onChange: (b: boolean) => void
}

export function Toggle({ label, description, checked, onChange }: ToggleProps) {
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

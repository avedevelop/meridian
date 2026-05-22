interface ColorPickerProps {
  label: string
  description?: string
  value: string
  options: { color: string; name: string }[]
  onChange: (color: string) => void
}

export function ColorPicker({
  label,
  description,
  value,
  options,
  onChange
}: ColorPickerProps) {
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

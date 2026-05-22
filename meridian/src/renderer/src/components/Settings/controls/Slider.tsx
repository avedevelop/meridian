interface SliderProps {
  label: string
  description?: string
  value: number
  min: number
  max: number
  unit: string
  onChange: (n: number) => void
}

export function Slider({
  label,
  description,
  value,
  min,
  max,
  unit,
  onChange
}: SliderProps) {
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

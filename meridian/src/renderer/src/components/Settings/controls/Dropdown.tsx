interface DropdownProps<T extends string | number> {
  label: string
  description?: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}

export function Dropdown<T extends string | number>({
  label,
  description,
  value,
  options,
  onChange
}: DropdownProps<T>) {
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

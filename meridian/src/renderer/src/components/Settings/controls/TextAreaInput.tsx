interface TextAreaInputProps {
  label: string
  description?: string
  value: string
  placeholder: string
  onChange: (s: string) => void
}

export function TextAreaInput({
  label,
  description,
  value,
  placeholder,
  onChange
}: TextAreaInputProps) {
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
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        style={{
          background: '#222',
          border: '1px solid #3c3c3c',
          borderRadius: 6,
          color: '#eee',
          fontSize: 12,
          padding: '8px 12px',
          outline: 'none',
          fontFamily: 'monospace',
          resize: 'vertical'
        }}
      />
    </div>
  )
}

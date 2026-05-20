import React from 'react'

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number
  color?: string
}

// 1. Sleek, premium wireframe/gradient Folder Icon
export function FolderIcon({
  size = 14,
  color = '#dcb67a',
  open = false,
  ...props
}: IconProps & { open?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, transition: 'transform 0.2s ease' }}
      {...props}
    >
      {open ? (
        <>
          <path d="M6 19L2 10h20l-4 9H6z" fill="rgba(220, 182, 122, 0.15)" />
          <path d="M2 10V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v2" />
        </>
      ) : (
        <>
          <path
            d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
            fill="rgba(220, 182, 122, 0.08)"
          />
        </>
      )}
    </svg>
  )
}

// 2. High-tech document file icon with dog-ear fold and internal text lines
export function FileIcon({ size = 14, color = '#7c6af7', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      {...props}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill={`${color}08`} />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" strokeWidth="1.5" opacity="0.6" />
      <line x1="16" y1="17" x2="8" y2="17" strokeWidth="1.5" opacity="0.6" />
      <polyline points="10 9 9 9 8 9" strokeWidth="1.5" opacity="0.6" />
    </svg>
  )
}

// 3. Sleek, custom search lens icon
export function SearchIcon({ size = 14, color = 'currentColor', ...props }: IconProps) {
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
      style={{ flexShrink: 0 }}
      {...props}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

// 4. Custom geometric settings cog wheel
export function SettingsIcon({ size = 14, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      {...props}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

// 5. Clean, futuristic Warning icon
export function WarningIcon({ size = 24, color = '#f87171', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      {...props}
    >
      <path
        d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
        fill={`${color}12`}
      />
      <line x1="12" y1="9" x2="12" y2="13" strokeWidth="2.5" />
      <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3" />
    </svg>
  )
}

// 6. Futuristic wireframe Trash/Bin icon
export function TrashIcon({ size = 14, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      {...props}
    >
      <polyline points="3 6 5 6 21 6" />
      <path
        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
        fill={`${color}08`}
      />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

// 7. Custom "Convert/Promote Text to Note" Transformation Icon (replaces Rocket)
export function NoteConvertIcon({ size = 14, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      {...props}
    >
      {/* Document boundary */}
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      {/* Transformation upward flash / energy node */}
      <path d="M12 18v-6M9 15l3-3 3 3" strokeWidth="2" stroke={color} />
      <circle cx="12" cy="9" r="1" fill={color} />
    </svg>
  )
}

// 8. Custom interactive nodes Web/Graph icon
export function WebIcon({ size = 14, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      {...props}
    >
      <circle cx="12" cy="5" r="2.5" fill={color} />
      <circle cx="5" cy="18" r="2.5" fill={color} />
      <circle cx="19" cy="18" r="2.5" fill={color} />
      <line x1="12" y1="7.5" x2="5" y2="15.5" strokeWidth="1.5" />
      <line x1="12" y1="7.5" x2="19" y2="15.5" strokeWidth="1.5" />
      <line
        x1="7.5"
        y1="18"
        x2="16.5"
        y2="18"
        strokeWidth="1.5"
        strokeDasharray="3 3"
        opacity="0.6"
      />
    </svg>
  )
}

// 9. Modern Edit/Pencil icon
export function EditNoteIcon({ size = 14, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      {...props}
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}

// 10. Modern, premium Folder Open Button Icon
export function FolderOpenBtnIcon({ size = 14, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      {...props}
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
  )
}

// 11. Modern Collapse/Expand icon (minimizes/groups all folders)
export function CollapseAllIcon({ size = 14, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="9" y1="12" x2="15" y2="12" strokeWidth="2.5" />
    </svg>
  )
}

// 12. Open External Link / Popout Icon
export function OpenExternalIcon({ size = 10, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      {...props}
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

// 13. Custom premium Frame / Group container icon
export function FrameIcon({ size = 14, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      {...props}
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="2"
        ry="2"
        strokeDasharray="3 2"
        fill={`${color}04`}
      />
      <path d="M9 3v18M3 9h18" strokeWidth="1" opacity="0.3" />
    </svg>
  )
}

// 14. Modern, premium Git Branch/Source Control Icon
export function GitIcon({ size = 14, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      {...props}
    >
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" fill={`${color}12`} />
      <circle cx="6" cy="6" r="3" fill={`${color}12`} />
      <circle cx="6" cy="18" r="3" fill={`${color}12`} />
      <path d="M18 6v3a4 4 0 0 1-4 4H6" />
    </svg>
  )
}

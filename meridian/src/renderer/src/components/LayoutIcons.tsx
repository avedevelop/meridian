export const PlusIcon = ({
  size = 14,
  color = 'currentColor',
  ...props
}: {
  size?: number
  color?: string
  [key: string]: any
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

export const CalendarIcon = ({
  size = 14,
  color = 'currentColor',
  ...props
}: {
  size?: number
  color?: string
  [key: string]: any
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

export const CanvasIcon = ({
  size = 14,
  color = 'currentColor',
  ...props
}: {
  size?: number
  color?: string
  [key: string]: any
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
)

export const GraphIcon = ({
  size = 14,
  color = 'currentColor',
  ...props
}: {
  size?: number
  color?: string
  [key: string]: any
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
)

export const SidebarLeftIcon = ({ active }: { active: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <rect x="2" y="2" width="12" height="12" rx="1.5" />
    <path d="M6 2v12" strokeWidth="1.2" />
    {active && (
      <rect
        x="2.5"
        y="2.5"
        width="3"
        height="11"
        fill="currentColor"
        opacity="0.15"
        stroke="none"
      />
    )}
  </svg>
)

export const SidebarRightIcon = ({ active }: { active: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <rect x="2" y="2" width="12" height="12" rx="1.5" />
    <path d="M10 2v12" strokeWidth="1.2" />
    {active && (
      <rect
        x="10.5"
        y="2.5"
        width="3"
        height="11"
        fill="currentColor"
        opacity="0.15"
        stroke="none"
      />
    )}
  </svg>
)

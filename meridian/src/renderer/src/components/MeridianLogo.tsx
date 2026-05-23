interface MeridianLogoProps {
  size?: number
}

/**
 * Meridian crystal logo as an inline SVG.
 *
 * Mirrors the desktop icon (build/icon.png) so the in-app brand stays in sync
 * with macOS Dock / DMG visuals. Six facets, vertical hexagonal cut.
 */
export function MeridianLogo({ size = 64 }: MeridianLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Meridian"
    >
      <defs>
        <linearGradient id="meridianBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#15152b" />
          <stop offset="1" stopColor="#08081a" />
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" rx="220" fill="url(#meridianBg)" />
      <polygon points="512,152 192,352 512,372" fill="#a797ff" />
      <polygon points="512,152 832,352 512,372" fill="#8d7afa" />
      <polygon points="192,352 512,372 512,652 192,672" fill="#7665ee" />
      <polygon points="832,352 512,372 512,652 832,672" fill="#5946d4" />
      <polygon points="192,672 512,652 512,872" fill="#3a2c9c" />
      <polygon points="832,672 512,652 512,872" fill="#2d2280" />
      <g
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.18"
        strokeWidth="3"
        strokeLinejoin="round"
      >
        <polygon points="512,152 832,352 832,672 512,872 192,672 192,352" />
        <line x1="192" y1="352" x2="512" y2="372" />
        <line x1="832" y1="352" x2="512" y2="372" />
        <line x1="192" y1="672" x2="512" y2="652" />
        <line x1="832" y1="672" x2="512" y2="652" />
        <line x1="512" y1="372" x2="512" y2="652" />
        <line x1="512" y1="152" x2="512" y2="372" />
        <line x1="512" y1="652" x2="512" y2="872" />
      </g>
    </svg>
  )
}

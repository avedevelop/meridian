import type React from 'react'

export const bannerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 900,
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  background: 'rgba(239, 68, 68, 0.1)',
  border: '1px solid rgba(239, 68, 68, 0.25)',
  backdropFilter: 'blur(12px)',
  borderRadius: 8,
  padding: '8px 16px',
  fontSize: 12,
  color: '#eee',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
  fontFamily: 'Inter, sans-serif',
  pointerEvents: 'auto'
}

export const bannerButtonStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.08)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  color: '#fff',
  padding: '4px 8px',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 11,
  fontWeight: 500,
  outline: 'none',
  transition: 'background 0.2s ease'
}

export const openFiltersButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--accent-color, #7c6af7)',
  cursor: 'pointer',
  fontSize: 11,
  fontWeight: 500,
  outline: 'none',
  padding: '4px 0'
}

export const tooltipStyleBase: React.CSSProperties = {
  position: 'absolute',
  pointerEvents: 'none',
  zIndex: 1000,
  width: 250,
  background: 'rgba(20, 20, 26, 0.85)',
  backdropFilter: 'blur(12px)',
  borderRadius: 8,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  padding: 12,
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  fontFamily: 'Inter, sans-serif'
}

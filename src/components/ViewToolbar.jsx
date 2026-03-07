import React from 'react'
import { Icon } from './ui.jsx'

export default function ViewToolbar({ children }) {
  return (
    <div style={{
      position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center', gap: 2, zIndex: 20,
      background: 'rgba(10,6,1,0.85)', backdropFilter: 'blur(30px) saturate(1.5)',
      WebkitBackdropFilter: 'blur(30px) saturate(1.5)',
      border: '1px solid rgba(255,200,120,0.12)',
      borderRadius: 14, padding: '5px 6px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      {children}
    </div>
  )
}

export function ToolBtn({ icon, label, active, onClick, children, disabled }) {
  return (
    <button onClick={disabled ? undefined : onClick} title={label} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
      padding: children ? '5px 11px' : '7px 9px', borderRadius: 10, border: 'none',
      background: active ? 'rgba(200,160,100,0.2)' : 'transparent',
      color: active ? '#c8a064' : disabled ? '#2e2e2e' : '#8a8a8a',
      fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.12s', minWidth: 30, height: 32,
      opacity: disabled ? 0.4 : 1,
    }}
      onMouseEnter={e => { if (!active && !disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
      onMouseLeave={e => { if (!active && !disabled) e.currentTarget.style.background = 'transparent' }}
    >
      {icon && <Icon name={icon} size={14} />}
      {children}
    </button>
  )
}

export function ToolSep() {
  return <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />
}

import React, { useState, useRef, useEffect } from 'react'

// ─── SVG Icons ───────────────────────────────────────────────
const PATHS = {
  home: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
  globe: 'M12 2a10 10 0 100 20A10 10 0 0012 2z M2 12h20 M12 2a15 15 0 010 20M12 2a15 15 0 000 20',
  book: 'M4 19.5A2.5 2.5 0 016.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z',
  graph: 'M18 5a3 3 0 100-6 3 3 0 000 6z M6 12a3 3 0 100-6 3 3 0 000 6z M18 19a3 3 0 100-6 3 3 0 000 6z M8.59 13.51l6.83 3.98 M15.41 6.51L8.59 10.49',
  list: 'M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01',
  timeline: 'M3 12h18 M12 3v18 M7 7l5 5 5-5 M7 17l5-5 5 5',
  chart: 'M18 20V10 M12 20V4 M6 20v-6 M2 20h20',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z',
  plus: 'M12 5v14 M5 12h14',
  x: 'M18 6L6 18 M6 6l12 12',
  search: 'M21 21l-4.35-4.35 M17 11A6 6 0 115 11a6 6 0 0112 0z',
  trash: 'M3 6h18 M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6 M10 11v6 M14 11v6 M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2',
  edit: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
  check: 'M20 6L9 17l-5-5',
  chevron_right: 'M9 18l6-6-6-6',
  chevron_down: 'M6 9l6 6 6-6',
  link: 'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71 M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',
  image: 'M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2z M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M21 15l-5-5L5 21',
  folder: 'M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z',
  folder_open: 'M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z M2 10h20',
  drag: 'M9 3h1v18H9z M14 3h1v18h-1z',
  copy: 'M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2z M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 100 6 3 3 0 000-6z',
  pin: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z M14 10a2 2 0 11-4 0 2 2 0 014 0z',
  tag: 'M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z M7 7h.01',
  refresh: 'M1 4v6h6 M23 20v-6h-6 M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15',
  card: 'M5 2h14a2 2 0 012 2v16a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2z M8 7v0 M16 17v0 M12 12v0',
}

export function Icon({ name, size = 16, style, className, onClick }) {
  const d = PATHS[name]
  if (!d) return <span style={{ width: size, height: size, display: 'inline-block', ...style }} />
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      onClick={onClick}
      style={{ flexShrink: 0, display: 'inline-block', cursor: onClick ? 'pointer' : undefined, ...style }} className={className}>
      {d.split(' M').map((segment, i) => (
        <path key={i} d={i === 0 ? segment : 'M' + segment} />
      ))}
    </svg>
  )
}

// ─── Button ───────────────────────────────────────────────────
export function Btn({ children, onClick, variant = 'ghost', size = 'md', style, disabled, title, type = 'button' }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    border: 'none', borderRadius: 10, cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 500, transition: 'all 0.12s', opacity: disabled ? 0.4 : 1,
    whiteSpace: 'nowrap',
  }
  const sizes = {
    xs: { padding: '3px 8px', fontSize: 11 },
    sm: { padding: '5px 10px', fontSize: 12 },
    md: { padding: '7px 14px', fontSize: 13 },
    lg: { padding: '10px 18px', fontSize: 14 },
    icon: { padding: 6, width: 30, height: 30, borderRadius: 10 },
    icon_sm: { padding: 4, width: 24, height: 24, borderRadius: 7 },
  }
  const variants = {
    ghost: { background: 'transparent', color: '#7a6a58' },
    subtle: { background: 'rgba(255,255,255,0.06)', color: '#c8b89a', border: '1px solid rgba(255,255,255,0.08)' },
    primary: { background: 'rgba(200,160,100,0.14)', color: '#c8a064', border: '1px solid rgba(200,160,100,0.22)' },
    danger: { background: 'rgba(220,60,60,0.1)', color: '#e05040', border: '1px solid rgba(220,60,60,0.18)' },
    solid: { background: 'rgba(200,160,100,0.85)', color: '#1a1208', border: 'none' },
    dark: { background: 'rgba(0,0,0,0.4)', color: '#c8b89a', border: '1px solid rgba(255,255,255,0.09)' },
    active: { background: 'rgba(255,255,255,0.1)', color: '#f0e6d3', border: '1px solid rgba(255,255,255,0.12)' },
  }
  return (
    <button type={type} onClick={disabled ? undefined : onClick} title={title}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.filter = 'brightness(1.15)'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
      onMouseLeave={e => { e.currentTarget.style.filter = ''; e.currentTarget.style.transform = '' }}
    >
      {children}
    </button>
  )
}

// ─── Tag ─────────────────────────────────────────────────────
export function Tag({ label, color = '#9a8a70', onRemove, onClick, size = 'md' }) {
  const sizes = { sm: { padding: '1px 6px', fontSize: 11 }, md: { padding: '2px 8px', fontSize: 12 } }
  return (
    <span onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: color + '1c', color, border: `1px solid ${color}35`,
      borderRadius: 5, fontWeight: 500, cursor: onClick ? 'pointer' : 'default',
      ...sizes[size],
    }}>
      {label}
      {onRemove && (
        <span onClick={e => { e.stopPropagation(); onRemove() }}
          style={{ cursor: 'pointer', opacity: 0.5, fontSize: 9, marginLeft: 1, lineHeight: 1 }}>✕</span>
      )}
    </span>
  )
}

// ─── Input ────────────────────────────────────────────────────
export function Input({ value, onChange, placeholder, style, autoFocus, onKeyDown, type = 'text', onBlur }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} autoFocus={autoFocus} onKeyDown={onKeyDown}
      style={{
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 10, padding: '8px 12px', color: '#e2d9c8', fontSize: 13,
        outline: 'none', width: '100%', transition: 'border-color 0.12s', ...style,
      }}
      onFocus={e => e.target.style.borderColor = 'rgba(200,160,100,0.45)'}
      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; if (onBlur) onBlur() }}
    />
  )
}

// ─── Textarea ─────────────────────────────────────────────────
export function Textarea({ value, onChange, placeholder, rows = 4, style }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      style={{
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 10, padding: '9px 12px', color: '#e2d9c8', fontSize: 13,
        lineHeight: 1.75, outline: 'none', width: '100%', resize: 'vertical',
        transition: 'border-color 0.12s', fontFamily: "'DM Sans', sans-serif", ...style,
      }}
      onFocus={e => e.target.style.borderColor = 'rgba(200,160,100,0.45)'}
      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.09)'}
    />
  )
}

// ─── Dropdown ─────────────────────────────────────────────────
export function Dropdown({ value, options, onChange, placeholder = 'Sélectionner', style, renderOption }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const selected = options.find(o => (typeof o === 'string' ? o : o.value) === value)
  const label = selected ? (typeof selected === 'string' ? selected : (renderOption ? renderOption(selected) : selected.label)) : placeholder

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <div onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        padding: '7px 12px', borderRadius: 10, cursor: 'pointer',
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid ${open ? 'rgba(200,160,100,0.4)' : 'rgba(255,255,255,0.09)'}`,
        fontSize: 13, color: selected ? '#e2d9c8' : '#4a4030',
      }}>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <Icon name="chevron_down" size={12} style={{ opacity: 0.4, flexShrink: 0 }} />
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 600,
          background: 'rgba(14,10,4,0.9)', backdropFilter: 'blur(40px) saturate(1.5)', WebkitBackdropFilter: 'blur(40px) saturate(1.5)', border: '1px solid rgba(255,200,120,0.12)',
          borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
          maxHeight: 220, overflowY: 'auto',
        }}>
          {options.map((opt, i) => {
            const val = typeof opt === 'string' ? opt : opt.value
            const lbl = typeof opt === 'string' ? opt : (renderOption ? renderOption(opt) : opt.label)
            const isSelected = val === value
            return (
              <div key={i} onClick={() => { onChange(val); setOpen(false) }}
                style={{
                  padding: '8px 13px', fontSize: 13, cursor: 'pointer',
                  color: isSelected ? '#c8a064' : '#c8b89a',
                  background: isSelected ? 'rgba(200,160,100,0.1)' : 'transparent',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
              >
                {typeof opt === 'object' && opt.icon && <span>{opt.icon}</span>}
                {lbl}
                {isSelected && <Icon name="check" size={12} style={{ marginLeft: 'auto', color: '#c8a064' }} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────
export function Modal({ title, children, onClose, width = 520, noPad = false }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="anim-fadein" onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 800,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
      <div className="anim-scalein" style={{
        width: '90%', maxWidth: width, maxHeight: '90vh',
        background: 'rgba(14,10,4,0.85)', backdropFilter: 'blur(40px) saturate(1.5)', WebkitBackdropFilter: 'blur(40px) saturate(1.5)', border: '1px solid rgba(255,200,120,0.12)',
        borderRadius: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {title && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
            flexShrink: 0,
          }}>
            <span style={{ fontFamily: "'Lora', serif", fontSize: 16, color: '#f0e6d3' }}>{title}</span>
            <Btn size="icon" variant="ghost" onClick={onClose}><Icon name="x" size={14} /></Btn>
          </div>
        )}
        <div style={{ flex: 1, overflow: 'auto', padding: noPad ? 0 : '20px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── ColorPicker ──────────────────────────────────────────────
export function ColorPicker({ value, onChange }) {
  const colors = ['#c8a064','#c084fc','#f59e0b','#ef4444','#06b6d4','#22c55e','#a78bfa','#f97316','#84cc16','#e879f9','#60a5fa','#fb923c','#94a3b8','#f43f5e']
  return (
    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
      {colors.map(c => (
        <div key={c} onClick={() => onChange(c)} style={{
          width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer',
          border: value === c ? '2px solid #fff' : '2px solid transparent',
          boxShadow: value === c ? `0 0 0 2px ${c}` : 'none',
          transition: 'transform 0.1s',
        }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.25)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        />
      ))}
    </div>
  )
}

// ─── PropRow ──────────────────────────────────────────────────
export function PropRow({ label, icon, children, style }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', minHeight: 34,
      borderBottom: '1px solid rgba(255,255,255,0.05)', ...style,
    }}>
      <div style={{
        width: 160, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7,
        padding: '7px 10px 7px 0', color: '#5a4a38', fontSize: 12,
      }}>
        {icon && <span style={{ fontSize: 13 }}>{icon}</span>}
        <span>{label}</span>
      </div>
      <div style={{ flex: 1, padding: '4px 0', minWidth: 0 }}>{children}</div>
    </div>
  )
}

// ─── Inline editable text ─────────────────────────────────────
export function InlineEdit({ value, onChange, placeholder, style, multiline = false, fontSize = 13 }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => { setDraft(value) }, [value])

  const commit = () => { onChange(draft); setEditing(false) }

  if (editing) {
    if (multiline) {
      return (
        <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Escape') { setDraft(value); setEditing(false) } }}
          style={{
            background: 'transparent', border: 'none', borderBottom: '1px solid rgba(200,160,100,0.4)',
            color: '#e2d9c8', fontSize, width: '100%', outline: 'none', resize: 'none',
            fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7, ...style,
          }}
          rows={3}
        />
      )
    }
    return (
      <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false) } }}
        style={{
          background: 'transparent', border: 'none', borderBottom: '1px solid rgba(200,160,100,0.4)',
          color: '#e2d9c8', fontSize, width: '100%', outline: 'none', ...style,
        }}
      />
    )
  }
  return (
    <span onClick={() => setEditing(true)}
      style={{ cursor: 'text', color: value ? '#e2d9c8' : '#4a4030', fontSize, ...style }}>
      {value || placeholder || '—'}
    </span>
  )
}

export default Icon

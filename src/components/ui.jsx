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
  eye_off: 'M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94 M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19 M1 1l22 22',
  pin: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z M14 10a2 2 0 11-4 0 2 2 0 014 0z',
  tag: 'M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z M7 7h.01',
  refresh: 'M1 4v6h6 M23 20v-6h-6 M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15',
  card: 'M5 2h14a2 2 0 012 2v16a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2z M8 7v0 M16 17v0 M12 12v0',
  cursor: 'M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z M13 13l6 6',
  polygon: 'M12 2l9 7-3.5 10h-11L3 9z',
  text_icon: 'M4 7V4h16v3 M9 20h6 M12 4v16',
  move: 'M5 9l-3 3 3 3 M9 5l3-3 3 3 M15 19l3-3-3-3 M19 9l-3 3 3 3 M2 12h20 M12 2v20',
  layers: 'M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5',
  zoom_in: 'M11 8v6 M8 11h6 M21 21l-4.35-4.35 M17 11A6 6 0 115 11a6 6 0 0112 0z',
  zoom_out: 'M8 11h6 M21 21l-4.35-4.35 M17 11A6 6 0 115 11a6 6 0 0112 0z',
  group: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  auto_layout: 'M4 4h6v6H4z M14 4h6v6h-6z M9 14h6v6H9z M7 10v2h0 M17 10v4h-2 M9 17h-2v-3',
  upload: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M17 8l-5-5-5 5 M12 3v12',
  connect: 'M18 8a3 3 0 100-6 3 3 0 000 6z M6 21a3 3 0 100-6 3 3 0 000 6z M15.35 6.35L8.65 16.65',
  filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  sort: 'M3 6h18 M6 12h12 M9 18h6',
  fullscreen: 'M3 8V3h5 M16 3h5v5 M21 16v5h-5 M8 21H3v-5',
  history: 'M12 21a9 9 0 100-18 9 9 0 000 18z M12 7v5l3 3',
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
    ghost:   { background: 'transparent',                         color: 'var(--text-dim,#8a8a8a)' },
    subtle:  { background: 'rgba(255,255,255,0.06)',              color: 'var(--text-secondary,#c0c0c0)', border: '1px solid rgba(255,255,255,0.08)' },
    primary: { background: 'var(--accent-15)', color: 'var(--accent,#c8a064)', border: '1px solid var(--accent-22)' },
    danger:  { background: 'var(--danger-10)',                     color: 'var(--danger,#e05040)', border: '1px solid var(--danger-18)' },
    solid:   { background: 'var(--accent,#c8a064)',               color: 'var(--bg-deep,#1a1208)', border: 'none' },
    dark:    { background: 'rgba(0,0,0,0.4)',                     color: 'var(--text-secondary,#c0c0c0)', border: '1px solid rgba(255,255,255,0.09)' },
    active:  { background: 'var(--accent-18)', color: 'var(--text-primary,#f0f0f0)', border: '1px solid var(--accent-22)' },
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
export function Tag({ label, color = '#8a8a8a', onRemove, onClick, size = 'md' }) {
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
        borderRadius: 10, padding: '8px 12px', color: 'var(--text-primary,#f0f0f0)', fontSize: 13,
        outline: 'none', width: '100%', transition: 'border-color 0.12s', ...style,
      }}
      onFocus={e => e.target.style.borderColor = 'var(--accent-60)'}
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
        borderRadius: 10, padding: '9px 12px', color: 'var(--text-primary,#f0f0f0)', fontSize: 13,
        lineHeight: 1.75, outline: 'none', width: '100%', resize: 'vertical',
        transition: 'border-color 0.12s', fontFamily: "var(--font-body)", ...style,
      }}
      onFocus={e => e.target.style.borderColor = 'var(--accent-60)'}
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
        border: open ? '1px solid var(--accent-40)' : '1px solid rgba(255,255,255,0.09)',
        fontSize: 13, color: selected ? 'var(--text-primary,#f0f0f0)' : 'var(--text-dark,#444444)',
      }}>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <Icon name="chevron_down" size={12} style={{ opacity: 0.4, flexShrink: 0 }} />
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 600,
          background: 'var(--bg-panel-92,rgba(14,10,4,0.9))', backdropFilter: 'blur(40px) saturate(1.5)', WebkitBackdropFilter: 'blur(40px) saturate(1.5)', border: '1px solid var(--border-14,rgba(255,200,120,0.12))',
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
                  color: isSelected ? 'var(--accent,#c8a064)' : 'var(--text-secondary,#c0c0c0)',
                  background: isSelected ? 'var(--accent-10)' : 'transparent',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
              >
                {typeof opt === 'object' && opt.icon && <span>{opt.icon}</span>}
                {lbl}
                {isSelected && <Icon name="check" size={12} style={{ marginLeft: 'auto', color: 'var(--accent,#c8a064)' }} />}
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
        background: 'var(--bg-panel-85,rgba(14,10,4,0.85))', backdropFilter: 'blur(40px) saturate(1.5)', WebkitBackdropFilter: 'blur(40px) saturate(1.5)', border: '1px solid var(--border-14,rgba(255,200,120,0.12))',
        borderRadius: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {title && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
            flexShrink: 0,
          }}>
            <span style={{ fontFamily: "var(--font)", fontSize: 16, color: 'var(--text-primary,#f0f0f0)' }}>{title}</span>
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

// ─── ConfirmModal ─────────────────────────────────────────────
export function ConfirmModal({ title, message, confirmLabel = 'Supprimer', onConfirm, onCancel }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onCancel])
  return (
    <div className="anim-fadein" onClick={e => { if (e.target === e.currentTarget) onCancel() }}
      style={{ position: 'fixed', inset: 0, zIndex: 850, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="anim-scalein" style={{ width: '90%', maxWidth: 360, background: 'var(--bg-panel-95,rgba(14,10,4,0.95))', backdropFilter: 'blur(40px) saturate(1.5)', WebkitBackdropFilter: 'blur(40px) saturate(1.5)', border: '1px solid var(--border-14,rgba(255,200,120,0.14))', borderRadius: 16, padding: '24px 28px', boxShadow: '0 16px 48px rgba(0,0,0,0.7)' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary,#f0f0f0)', marginBottom: 10, fontFamily: 'var(--font)' }}>{title}</div>
        <p style={{ fontSize: 13, color: 'var(--text-dim,#5a5a5a)', lineHeight: 1.5, marginBottom: 20 }}>{message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn variant="subtle" size="sm" onClick={onCancel}>Annuler</Btn>
          <Btn variant="danger" size="sm" onClick={onConfirm}>{confirmLabel}</Btn>
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
        padding: '7px 10px 7px 0', color: 'var(--text-dim,#5a5a5a)', fontSize: 12,
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
            background: 'transparent', border: 'none', borderBottom: '1px solid var(--accent-40)',
            color: 'var(--text-primary,#f0f0f0)', fontSize, width: '100%', outline: 'none', resize: 'none',
            fontFamily: "var(--font-body)", lineHeight: 1.7, ...style,
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
          background: 'transparent', border: 'none', borderBottom: '1px solid var(--accent-40)',
          color: 'var(--text-primary,#f0f0f0)', fontSize, width: '100%', outline: 'none', ...style,
        }}
      />
    )
  }
  return (
    <span onClick={() => setEditing(true)}
      style={{ cursor: 'text', color: value ? 'var(--text-primary,#f0f0f0)' : 'var(--text-dark,#4a4030)', fontSize, ...style }}>
      {value || placeholder || '—'}
    </span>
  )
}

// ─── Icon Grid & Picker (monochrome Unicode symbols) ─────────
export const ICON_CATEGORIES = [
  { id: 'all', icon: '☰', label: 'Tout' },
  { id: 'people', icon: '♟', label: 'Personnages' },
  { id: 'combat', icon: '⚔', label: 'Combat' },
  { id: 'places', icon: '♜', label: 'Lieux' },
  { id: 'nature', icon: '❀', label: 'Nature' },
  { id: 'magic', icon: '✦', label: 'Magie' },
  { id: 'objects', icon: '⚙', label: 'Objets' },
  { id: 'symbols', icon: '◆', label: 'Symboles' },
]

export const ICON_GRID = [
  // ── Personnages ──
  { c:'♔', n:'roi king couronne crown', cat:'people' },
  { c:'♕', n:'reine queen couronne', cat:'people' },
  { c:'♚', n:'roi king noir black', cat:'people' },
  { c:'♛', n:'reine queen noire black', cat:'people' },
  { c:'♟', n:'pion pawn soldat soldier', cat:'people' },
  { c:'♗', n:'fou bishop clerc pretre', cat:'people' },
  { c:'♘', n:'cavalier knight cheval horse', cat:'people' },
  { c:'☠', n:'mort death crane skull pirate', cat:'people' },
  { c:'☻', n:'visage face sombre dark', cat:'people' },
  { c:'☺', n:'visage face sourire smile', cat:'people' },
  // ── Combat ──
  { c:'⚔', n:'epee sword combat battle arme weapon', cat:'combat' },
  { c:'⚒', n:'marteau hammer pioche outils tools', cat:'combat' },
  { c:'☩', n:'croix cross croisade crusade', cat:'combat' },
  { c:'†', n:'dague dagger croix cross', cat:'combat' },
  { c:'‡', n:'double dague dagger', cat:'combat' },
  { c:'⛨', n:'bouclier shield defense', cat:'combat' },
  { c:'⚓', n:'ancre anchor marine naval', cat:'combat' },
  { c:'⛏', n:'pioche pickaxe mine', cat:'combat' },
  { c:'⛓', n:'chaine chain prison lien', cat:'combat' },
  { c:'⚑', n:'drapeau flag banniere banner', cat:'combat' },
  // ── Lieux ──
  { c:'♜', n:'tour tower chateau castle forteresse', cat:'places' },
  { c:'⛪', n:'eglise church temple religion', cat:'places' },
  { c:'⛩', n:'torii temple shrine japonais', cat:'places' },
  { c:'⌂', n:'maison house home habitation', cat:'places' },
  { c:'⛫', n:'chateau castle forteresse fortress', cat:'places' },
  { c:'⛰', n:'montagne mountain pic peak', cat:'places' },
  { c:'⛲', n:'fontaine fountain place', cat:'places' },
  { c:'⛺', n:'tente tent camp bivouac', cat:'places' },
  { c:'⛵', n:'bateau boat voilier navire ship', cat:'places' },
  { c:'☸', n:'roue wheel dharma gouvernail', cat:'places' },
  // ── Nature ──
  { c:'☀', n:'soleil sun lumiere light jour', cat:'nature' },
  { c:'☾', n:'lune moon croissant nuit night', cat:'nature' },
  { c:'☁', n:'nuage cloud ciel sky', cat:'nature' },
  { c:'❄', n:'neige snow flocon hiver winter froid', cat:'nature' },
  { c:'⚡', n:'eclair lightning foudre orage storm', cat:'nature' },
  { c:'☂', n:'parapluie umbrella pluie rain', cat:'nature' },
  { c:'❀', n:'fleur flower rose', cat:'nature' },
  { c:'✿', n:'fleur flower lotus', cat:'nature' },
  { c:'☘', n:'trefle shamrock plante nature', cat:'nature' },
  { c:'⚘', n:'fleur flower rose plante', cat:'nature' },
  // ── Magie ──
  { c:'⚜', n:'fleur lys royaute noble heraldique', cat:'magic' },
  { c:'✦', n:'etoile star magie magic brillant', cat:'magic' },
  { c:'✧', n:'etoile star magie magic vide', cat:'magic' },
  { c:'⊛', n:'cercle etoile circle star', cat:'magic' },
  { c:'☯', n:'yin yang equilibre balance', cat:'magic' },
  { c:'⚗', n:'alambic alchemie potion fiole', cat:'magic' },
  { c:'⚛', n:'atome atom science energie', cat:'magic' },
  { c:'☤', n:'caducee medecine sante health', cat:'magic' },
  { c:'☥', n:'ankh egypte vie life eternel', cat:'magic' },
  { c:'✡', n:'hexagramme etoile david', cat:'magic' },
  // ── Objets ──
  { c:'⚖', n:'balance justice scales loi law', cat:'objects' },
  { c:'⚙', n:'engrenage gear mecanique machine', cat:'objects' },
  { c:'✎', n:'crayon pencil ecrire plume write', cat:'objects' },
  { c:'⚐', n:'drapeau blanc white flag paix', cat:'objects' },
  { c:'✂', n:'ciseaux scissors couper cut', cat:'objects' },
  { c:'♨', n:'source chaude hot spring vapeur steam', cat:'objects' },
  { c:'⚱', n:'urne urn vase recipient', cat:'objects' },
  { c:'♫', n:'musique music note melodie', cat:'objects' },
  { c:'♪', n:'musique music note son', cat:'objects' },
  { c:'⌛', n:'sablier hourglass temps time', cat:'objects' },
  // ── Symboles ──
  { c:'☆', n:'etoile star vide empty', cat:'symbols' },
  { c:'★', n:'etoile star plein full', cat:'symbols' },
  { c:'◇', n:'losange diamond vide', cat:'symbols' },
  { c:'◆', n:'losange diamond plein', cat:'symbols' },
  { c:'△', n:'triangle vide haut up', cat:'symbols' },
  { c:'▽', n:'triangle vide bas down', cat:'symbols' },
  { c:'○', n:'cercle circle vide rond', cat:'symbols' },
  { c:'●', n:'cercle circle plein rond', cat:'symbols' },
  { c:'□', n:'carre square vide', cat:'symbols' },
  { c:'■', n:'carre square plein', cat:'symbols' },
  { c:'▲', n:'triangle plein haut up', cat:'symbols' },
  { c:'▼', n:'triangle plein bas down', cat:'symbols' },
  { c:'◈', n:'losange diamond decoratif', cat:'symbols' },
  { c:'⊕', n:'cercle plus croix positif', cat:'symbols' },
  { c:'⊗', n:'cercle croix cancel annuler', cat:'symbols' },
  { c:'⬡', n:'hexagone hexagon', cat:'symbols' },
  { c:'❖', n:'losange decoratif diamond ornement', cat:'symbols' },
  { c:'❋', n:'asterisque star decoratif', cat:'symbols' },
  { c:'❊', n:'fleur decoratif ornement', cat:'symbols' },
  { c:'❈', n:'flocon decoratif ornement', cat:'symbols' },
  { c:'♥', n:'coeur heart amour love plein', cat:'symbols' },
  { c:'♡', n:'coeur heart vide empty', cat:'symbols' },
  { c:'♠', n:'pique spade carte card', cat:'symbols' },
  { c:'♤', n:'pique spade vide', cat:'symbols' },
  { c:'♦', n:'carreau diamond carte card', cat:'symbols' },
  { c:'♢', n:'carreau diamond vide', cat:'symbols' },
  { c:'♣', n:'trefle club carte card', cat:'symbols' },
  { c:'♧', n:'trefle club vide', cat:'symbols' },
  { c:'☰', n:'menu hamburger trigram liste', cat:'symbols' },
  { c:'#', n:'diese hash number nombre', cat:'symbols' },
]

const ICO_STYLE = { fontVariantEmoji: 'text', color: 'var(--text-primary,#e8e0d4)' }

export function EmojiPicker({ value, onChange, style }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('all')
  const ref = useRef()

  useEffect(() => {
    if (!open) return
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const filtered = ICON_GRID.filter(ic => {
    if (search) return ic.n.includes(search.toLowerCase()) || ic.c === search
    if (cat !== 'all') return ic.cat === cat
    return true
  })

  return (
    <div ref={ref} style={{ position:'relative', display:'inline-block', ...style }}>
      <button onClick={() => setOpen(v => !v)}
        style={{
          width:44, height:44, borderRadius:10,
          border: open ? '1px solid var(--accent-40)' : '1px solid rgba(255,255,255,0.09)',
          background: open ? 'var(--accent-10)' : 'rgba(255,255,255,0.05)',
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', fontSize:22, transition:'all 0.12s', ...ICO_STYLE,
        }}>
        {value || '☰'}
      </button>
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 6px)', left:0, zIndex:600,
          background:'var(--bg-panel-92,rgba(10,6,1,0.92))',
          border:'1px solid var(--border-14,rgba(255,200,120,0.14))', borderRadius:12, overflow:'hidden',
          boxShadow:'0 8px 32px rgba(0,0,0,0.7)', width:280, padding:'8px',
        }}>
          {/* Category tabs */}
          <div style={{ display:'flex', gap:2, marginBottom:6, padding:'0 2px' }}>
            {ICON_CATEGORIES.map(c => (
              <button key={c.id} onClick={() => { setCat(c.id); setSearch('') }}
                title={c.label}
                style={{
                  flex:1, aspectRatio:'1', display:'flex', alignItems:'center', justifyContent:'center',
                  background: cat === c.id ? 'var(--accent-20)' : 'transparent',
                  border:'none', borderRadius:4, cursor:'pointer', fontSize:13, padding:2,
                  color: cat === c.id ? 'var(--accent,#c8a064)' : 'var(--text-dim,#5a5a5a)',
                  transition:'all 0.1s', ...ICO_STYLE,
                }}
                onMouseEnter={e => { if(cat!==c.id) e.currentTarget.style.background='rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { if(cat!==c.id) e.currentTarget.style.background='transparent' }}>
                {c.icon}
              </button>
            ))}
          </div>
          {/* Search */}
          <input autoFocus value={search} onChange={e => { setSearch(e.target.value); if(e.target.value) setCat('all') }}
            placeholder="Rechercher des icônes..."
            style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'5px 8px', color:'var(--text-secondary,#c0c0c0)', fontSize:11, outline:'none', marginBottom:6, boxSizing:'border-box' }}
          />
          {/* Grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(8, 1fr)', gap:2, maxHeight:200, overflowY:'auto' }}>
            {filtered.map((ic, i) => (
              <button key={i} onClick={() => { onChange(ic.c); setOpen(false); setSearch(''); setCat('all') }}
                title={ic.n.split(' ').slice(0,2).join(' ')}
                style={{
                  width:'100%', aspectRatio:'1', display:'flex', alignItems:'center', justifyContent:'center',
                  background: value===ic.c ? 'var(--accent-20)' : 'transparent',
                  border:'none', borderRadius:4, cursor:'pointer', fontSize:16, padding:0,
                  transition:'background 0.08s', ...ICO_STYLE,
                }}
                onMouseEnter={e => { if(value!==ic.c) e.currentTarget.style.background='rgba(255,255,255,0.08)' }}
                onMouseLeave={e => { if(value!==ic.c) e.currentTarget.style.background='transparent' }}>
                {ic.c}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Icon

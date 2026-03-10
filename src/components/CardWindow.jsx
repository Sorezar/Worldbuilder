import React, { useState, useRef, useEffect } from 'react'
import { Icon, ConfirmModal } from './ui.jsx'
import { getType } from '../data/types.js'
import WidgetGrid from './widgets/WidgetGrid.jsx'
import { resolveLayout } from '../data/widgetDefaults.js'

export default function CardWindow({ card, cards, customTypes, onUpdate, onDelete, onClose, onOpenCard, onCreateCard, allTypes, calendars }) {
  const type = getType(card.typeId, customTypes)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showTypePicker, setShowTypePicker] = useState(false)
  const [editLayout, setEditLayout] = useState(false)
  const typePickerRef = useRef()

  const upd = patch => onUpdate(card.id, patch)

  const layout = resolveLayout(card, type)
  const onUpdateLayout = newLayout => upd({ layout: newLayout })
  const resetLayout = () => upd({ layout: null })

  const ancestors = getAncestors(card.typeId, allTypes)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7, padding: '0 15px',
        height: 42, borderBottom: '1px solid var(--border-14,rgba(255,200,120,0.08))', flexShrink: 0,
        background: 'var(--accent-03,rgba(255,200,100,0.02))', borderRadius: '16px 16px 0 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, overflow: 'hidden', minWidth: 0 }}>
          {ancestors.map(a => (
            <React.Fragment key={a.id}>
              <span style={{ fontSize: 10, color: 'var(--text-darker,#2e2e2e)' }}>{a.icon} {a.name}</span>
              <Icon name="chevron_right" size={9} style={{ color: 'var(--text-darker,#2e2e2e)', flexShrink: 0 }} />
            </React.Fragment>
          ))}
          <span style={{ fontSize: 11, color: 'var(--text-dim,#5a5a5a)' }}>{type?.icon} {type?.name}</span>
        </div>
        {/* Edit layout toggle */}
        <button onClick={() => setEditLayout(v => !v)}
          style={{ background: editLayout ? 'var(--accent-12)' : 'none', border: editLayout ? '1px solid var(--accent-30)' : 'none', color: editLayout ? 'var(--accent,#c8a064)' : 'var(--text-darker,#2e2e2e)', cursor: 'pointer', padding: '3px 5px', borderRadius: 4, fontSize: 11, display: 'flex', alignItems: 'center' }}
          onMouseEnter={e => { if (!editLayout) e.currentTarget.style.color = 'var(--accent,#c8a064)' }}
          onMouseLeave={e => { if (!editLayout) e.currentTarget.style.color = 'var(--text-darker,#2e2e2e)' }}
          title={editLayout ? 'Terminer' : 'Modifier le layout'}
        >
          <Icon name="group" size={11} />
        </button>
        {card.layout && editLayout && (
          <button onClick={resetLayout}
            style={{ background: 'none', border: 'none', color: 'var(--text-darker,#2e2e2e)', cursor: 'pointer', padding: '3px 5px', borderRadius: 4, fontSize: 11, display: 'flex', alignItems: 'center' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent,#c8a064)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-darker,#2e2e2e)'}
            title="Réinitialiser le layout par défaut"
          >
            <Icon name="refresh" size={11} />
          </button>
        )}
        <button onClick={() => setShowDeleteConfirm(true)}
          style={{ background: 'none', border: 'none', color: 'var(--text-darker,#2e2e2e)', cursor: 'pointer', padding: '3px 5px', borderRadius: 4, fontSize: 11, display: 'flex', alignItems: 'center' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--danger,#ef4444)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-darker,#2e2e2e)'}
        >
          <Icon name="trash" size={11} />
        </button>
        <button onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-dark,#444444)', cursor: 'pointer', padding: '3px 5px', borderRadius: 4, fontSize: 11, display: 'flex', alignItems: 'center' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary,#c0c0c0)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dark,#444444)'}
        >
          <Icon name="x" size={12} />
        </button>
      </div>

      {/* Name + type badge */}
      <div style={{ padding: '14px 20px 0', flexShrink: 0 }}>
        <input
          value={card.name}
          onChange={e => upd({ name: e.target.value })}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-primary,#f0f0f0)', fontSize: 22, fontFamily: "var(--font)", fontWeight: 600, width: '100%', outline: 'none', marginBottom: 8, letterSpacing: '-0.01em' }}
        />
        {type && (
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
            <span onClick={() => setShowTypePicker(v => !v)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', background: (type.color || '#5a5040') + '18', border: `1px solid ${type.color || '#5a5040'}28`, borderRadius: 20, fontSize: 11, color: type.color || '#8a8a8a', fontFamily: "var(--font-body)", cursor: 'pointer', transition: 'filter 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.2)'}
              onMouseLeave={e => e.currentTarget.style.filter = ''}>
              {type.icon} {type.name} <Icon name="chevron_down" size={8} style={{ opacity: 0.5 }} />
            </span>
            {showTypePicker && <CardTypePicker ref={typePickerRef} currentTypeId={card.typeId} allTypes={allTypes} onSelect={typeId => { upd({ typeId }); setShowTypePicker(false) }} onClose={() => setShowTypePicker(false)} />}
          </div>
        )}
      </div>

      {/* Widget Grid */}
      <WidgetGrid
        layout={layout} card={card} cards={cards}
        customTypes={customTypes} allTypes={allTypes} calendars={calendars}
        onUpdateCard={onUpdate} onUpdateLayout={onUpdateLayout}
        editMode={editLayout}
        onOpenCard={onOpenCard} onCreateCard={onCreateCard}
      />

      {showDeleteConfirm && (
        <ConfirmModal
          title="Supprimer cette carte ?"
          message={`"${card.name}" sera supprimé définitivement.`}
          onConfirm={() => { onDelete(card.id); onClose() }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  )
}

// ─── CardTypePicker ───────────────────────────────────────────
const CardTypePicker = React.forwardRef(function CardTypePicker({ currentTypeId, allTypes, onSelect, onClose }, fwdRef) {
  const ref = useRef()
  React.useImperativeHandle(fwdRef, () => ref.current)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const creatableTypes = (allTypes || []).filter(t => !t.virtual)
  const roots = creatableTypes.filter(t => !t.parentId)
  const filtered = search ? creatableTypes.filter(t => t.name.toLowerCase().includes(search.toLowerCase())) : null

  return (
    <div ref={ref} style={{
      position: 'absolute', top: '100%', left: 0, zIndex: 500, marginTop: 4,
      background: 'var(--bg-panel-92,rgba(10,6,1,0.92))', backdropFilter: 'blur(40px) saturate(1.5)', WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
      border: '1px solid var(--border-14)', borderRadius: 10,
      width: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.8)', overflow: 'hidden',
    }}>
      <div style={{ padding: '8px 8px 4px' }}>
        <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
          style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '5px 8px', color: 'var(--text-secondary,#c0c0c0)', fontSize: 11, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ maxHeight: 260, overflowY: 'auto', padding: '2px 0 4px' }}>
        {(filtered || roots).map(t => {
          const children = !filtered ? creatableTypes.filter(c => c.parentId === t.id) : []
          return (
            <React.Fragment key={t.id}>
              <TypeMenuItem icon={t.icon} label={t.name} color={t.color}
                active={currentTypeId === t.id} onClick={() => onSelect(t.id)} />
              {children.map(child => (
                <TypeMenuItem key={child.id} icon={child.icon} label={child.name} color={child.color}
                  active={currentTypeId === child.id} onClick={() => onSelect(child.id)} indent />
              ))}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
})

function TypeMenuItem({ icon, label, active, onClick, color, indent }) {
  return (
    <div onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: `7px 11px 7px ${indent ? 25 : 11}px`, cursor: 'pointer', fontSize: indent ? 11 : 12,
        color: active ? 'var(--accent,#c8a064)' : (color || 'var(--text-muted,#8a8a8a)'),
        background: active ? 'var(--accent-10)' : 'transparent',
        transition: 'background 0.08s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
      <span style={{ width: 18, textAlign: 'center', fontSize: 13 }}>{icon}</span>
      <span style={{ fontFamily: "var(--font-body)", flex: 1 }}>{label}</span>
      {active && <Icon name="check" size={11} style={{ color: 'var(--accent,#c8a064)', flexShrink: 0 }} />}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────
function getAncestors(typeId, allTypes) {
  const typeMap = Object.fromEntries(allTypes.map(t => [t.id, t]))
  const chain = []
  let current = typeMap[typeId]
  while (current?.parentId) {
    current = typeMap[current.parentId]
    if (current) chain.unshift(current)
  }
  return chain
}

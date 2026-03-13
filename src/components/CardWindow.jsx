import React, { useState, useRef, useEffect } from 'react'
import { Icon } from './ui.jsx'
import { getType, getEffectiveProps } from '../data/types.js'
import WidgetGrid from './widgets/WidgetGrid.jsx'
import PropertiesWidget from './widgets/PropertiesWidget.jsx'
import { resolveLayout } from '../data/widgetDefaults.js'

const HEADER_IMG_H = 260

export default function CardWindow({ card, cards, customTypes, onUpdate, onDelete, onClose, onOpenCard, onCreateCard, allTypes, calendars, getCardHistory, restoreCardRevision }) {
  const type = getType(card.typeId, customTypes)
  const [showTypePicker, setShowTypePicker] = useState(false)
  const [addingAlias, setAddingAlias] = useState(false)
  const [newAlias, setNewAlias] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const typePickerRef = useRef()
  const aliasInputRef = useRef()
  const fileRef = useRef()

  const upd = patch => onUpdate(card.id, patch)

  const layout = resolveLayout(card, type)
  const onUpdateLayout = newLayout => upd({ layout: newLayout })

  // Image layout: 'side' (default) or 'banner'
  const imageMode = card.imageLayout || 'side'
  const setImageMode = mode => upd({ imageLayout: mode })

  // Aliases
  const effectiveProps = getEffectiveProps(card.typeId, customTypes)
  const hasAliasesProp = effectiveProps.some(p => p.id === 'aliases')
  const aliases = hasAliasesProp ? (Array.isArray(card.props?.aliases) ? card.props.aliases : []) : null

  const addAlias = () => {
    const val = newAlias.trim()
    if (!val) return
    upd({ props: { ...card.props, aliases: [...(aliases || []), val] } })
    setNewAlias('')
  }
  const removeAlias = idx => {
    upd({ props: { ...card.props, aliases: aliases.filter((_, i) => i !== idx) } })
  }

  // Image upload
  const handleUpload = e => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => upd({ image: ev.target.result })
    reader.readAsDataURL(file)
  }

  // Filter out properties and image widgets from the grid — they live in the header
  const gridLayout = layout.filter(w => w.type !== 'properties' && w.type !== 'image')
  const propsWidget = layout.find(w => w.type === 'properties') || { id: '_props', type: 'properties', row: 0, config: { propIds: 'all' } }

  // ─── Header info block (name, type, aliases, properties) ───
  const infoBlock = (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden', height: imageMode === 'side' ? HEADER_IMG_H : undefined }}>
      {/* Name + Type on same line */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <input
          value={card.name}
          onChange={e => upd({ name: e.target.value })}
          style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 22, fontFamily: "var(--font)", fontWeight: 600, outline: 'none', letterSpacing: '-0.01em', flex: 1, minWidth: 60 }}
        />
        {type && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <span onClick={() => setShowTypePicker(v => !v)}
              style={{ fontSize: 13, color: '#bbb', cursor: 'pointer', transition: 'opacity 0.1s', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              {type.icon} {type.name}
            </span>
            {showTypePicker && <CardTypePicker ref={typePickerRef} currentTypeId={card.typeId} allTypes={allTypes} onSelect={typeId => { upd({ typeId }); setShowTypePicker(false) }} onClose={() => setShowTypePicker(false)} />}
          </div>
        )}
      </div>

      {/* Aliases — tag style */}
      {aliases !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#aaa', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon name="tag" size={12} /> Aliases
          </span>
          {aliases.map((a, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'rgba(255,255,255,0.07)', borderRadius: 4, fontSize: 12, color: '#ddd' }}>
              {a}
              <span onClick={() => removeAlias(i)} style={{ fontSize: 9, cursor: 'pointer', color: '#999', transition: 'color 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = '#999'}>✕</span>
            </span>
          ))}
          {addingAlias ? (
            <input ref={aliasInputRef} autoFocus value={newAlias} onChange={e => setNewAlias(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { addAlias(); } if (e.key === 'Escape') { setAddingAlias(false); setNewAlias('') } }}
              onBlur={() => { if (newAlias.trim()) addAlias(); setAddingAlias(false); setNewAlias('') }}
              placeholder="Alias…"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '2px 8px', fontSize: 12, color: '#ddd', outline: 'none', width: 80 }}
            />
          ) : (
            <span onClick={() => setAddingAlias(true)}
              style={{ fontSize: 12, color: '#666', cursor: 'pointer', padding: '2px 8px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, transition: 'color 0.1s, border-color 0.1s', display: 'inline-flex', alignItems: 'center', gap: 3 }}
              onMouseEnter={e => { e.currentTarget.style.color = '#bbb'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#666'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}>+ Ajouter</span>
          )}
        </div>
      )}

      {/* Properties */}
      <div style={{ flex: 1, marginTop: 4, minHeight: 0, overflow: 'auto' }}>
        <PropertiesWidget
          widget={propsWidget} card={card} cards={cards}
          customTypes={customTypes} allTypes={allTypes} calendars={calendars}
          onUpdateCard={onUpdate} onOpenCard={onOpenCard} onCreateCard={onCreateCard}
          layout={layout}
        />
      </div>
    </div>
  )

  // ─── Image block ───────────────────────────────────────────
  const imageBlock = (isBanner) => {
    const h = isBanner ? 200 : HEADER_IMG_H
    return (
      <div style={{ position: 'relative', flexShrink: 0, ...(isBanner ? { width: '100%', height: h } : { width: HEADER_IMG_H, height: h }), borderRadius: 10, overflow: 'hidden', background: 'rgba(0,0,0,0.3)' }}>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
        {card.image ? (
          <>
            <img src={card.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {/* Image controls overlay */}
            <div style={{ position: 'absolute', bottom: 6, right: 6, display: 'flex', gap: 4 }}>
              <ImgBtn icon="refresh" label="Rotation" onClick={() => setImageMode(imageMode === 'side' ? 'banner' : 'side')} />
              <ImgBtn icon="image" label="Changer" onClick={() => fileRef.current?.click()} />
              <ImgBtn icon="x" label="" onClick={() => upd({ image: '' })} small />
            </div>
          </>
        ) : (
          <div onClick={() => fileRef.current?.click()}
            style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', color: 'var(--text-dim,#5a5a5a)', fontSize: 10 }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent,#c8a064)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim,#5a5a5a)' }}>
            <Icon name="image" size={22} />
            <span>Image</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Top bar: history + close */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2, padding: '8px 10px 0', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <HeaderBtn icon="history" title="Historique" onClick={() => setShowHistory(v => !v)} active={showHistory} />
          {showHistory && (
            <HistoryDropdown
              card={card}
              getCardHistory={getCardHistory}
              onRestore={snapshot => { restoreCardRevision(card.id, snapshot); setShowHistory(false) }}
              onClose={() => setShowHistory(false)}
            />
          )}
        </div>
        <HeaderBtn icon="x" title="Fermer" onClick={onClose} />
      </div>

      {/* Header section */}
      {imageMode === 'banner' ? (
        <div style={{ flexShrink: 0, padding: '2px 16px 8px' }}>
          {imageBlock(true)}
          <div style={{ marginTop: 8 }}>{infoBlock}</div>
        </div>
      ) : (
        <div style={{ flexShrink: 0, padding: '2px 16px 8px', display: 'flex', gap: 12, height: HEADER_IMG_H }}>
          {infoBlock}
          {imageBlock(false)}
        </div>
      )}

      {/* Remaining widgets + add button */}
      <WidgetGrid
        layout={gridLayout} card={card} cards={cards}
        customTypes={customTypes} allTypes={allTypes} calendars={calendars}
        onUpdateCard={onUpdate} onUpdateLayout={newGridLayout => {
          const fixed = layout.filter(w => w.type === 'properties' || w.type === 'image')
          onUpdateLayout([...fixed, ...newGridLayout])
        }}
        onOpenCard={onOpenCard} onCreateCard={onCreateCard}
        editMode
      />
    </div>
  )
}

// ─── Small header button ──────────────────────────────────────
function HeaderBtn({ icon, title, onClick, active }) {
  return (
    <button onClick={onClick} title={title}
      style={{ background: active ? 'var(--accent-15,rgba(200,160,100,0.15))' : 'none', border: 'none', color: active ? 'var(--accent,#c8a064)' : 'var(--text-dim,#5a5a5a)', cursor: 'pointer', padding: '3px 5px', borderRadius: 4, fontSize: 11, display: 'flex', alignItems: 'center' }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text-primary,#e0e0e0)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--text-dim,#5a5a5a)' }}>
      <Icon name={icon} size={14} />
    </button>
  )
}

// ─── Image overlay button ─────────────────────────────────────
function ImgBtn({ icon, label, onClick, small }) {
  return (
    <button onClick={e => { e.stopPropagation(); onClick() }}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: small ? '3px 5px' : '4px 8px',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6,
        color: 'var(--text-secondary,#c0c0c0)', cursor: 'pointer', fontSize: 10,
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.9)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}>
      <Icon name={icon} size={11} />
      {label && <span>{label}</span>}
    </button>
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
      position: 'absolute', top: '100%', right: 0, zIndex: 500, marginTop: 4,
      background: 'var(--bg-panel-92,rgba(10,6,1,0.92))', backdropFilter: 'blur(40px) saturate(1.5)', WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
      border: '1px solid var(--border-14)', borderRadius: 10,
      width: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.8)', overflow: 'hidden',
    }}>
      <div style={{ padding: '8px 8px 4px' }}>
        <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
          style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '5px 8px', color: 'var(--text-primary,#e0e0e0)', fontSize: 11, outline: 'none', boxSizing: 'border-box' }}
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

// ─── History Dropdown ────────────────────────────────────────
function HistoryDropdown({ card, getCardHistory, onRestore, onClose }) {
  const ref = useRef()
  const history = getCardHistory ? getCardHistory(card.id) : []
  const sorted = [...history].reverse()

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const fmtDate = ts => {
    const d = new Date(ts)
    const pad = n => String(n).padStart(2, '0')
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const describeDiff = (snapshot) => {
    const parts = []
    if (snapshot.name !== card.name) parts.push('Nom')
    if (snapshot.text !== card.text) parts.push('Texte')
    if (snapshot.typeId !== card.typeId) parts.push('Type')
    if (JSON.stringify(snapshot.props) !== JSON.stringify(card.props)) parts.push('Propriétés')
    return parts.length > 0 ? parts.join(', ') : 'Modification'
  }

  return (
    <div ref={ref} style={{
      position: 'absolute', top: '100%', right: 0, zIndex: 500, marginTop: 4,
      background: 'var(--bg-panel-92,rgba(10,6,1,0.92))', backdropFilter: 'blur(40px) saturate(1.5)', WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
      border: '1px solid var(--border-14,rgba(255,255,255,0.14))', borderRadius: 10,
      width: 300, maxHeight: 340, display: 'flex', flexDirection: 'column',
      boxShadow: '0 8px 32px rgba(0,0,0,0.8)', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <Icon name="history" size={13} style={{ color: 'var(--accent,#c8a064)' }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent,#c8a064)', fontFamily: 'var(--font)', flex: 1 }}>Historique</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {sorted.length === 0 ? (
          <div style={{ color: '#555', fontSize: 11, padding: '20px 12px', textAlign: 'center' }}>
            Aucun historique pour l'instant.
          </div>
        ) : (
          sorted.map((entry, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
              transition: 'background 0.08s', cursor: 'default',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent,#c8a064)', flexShrink: 0, opacity: i === 0 ? 1 : 0.3 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: '#ccc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.snapshot.name || 'Sans nom'}</div>
                <div style={{ fontSize: 10, color: '#666', marginTop: 1 }}>
                  {fmtDate(entry.ts)} — {describeDiff(entry.snapshot)}
                </div>
              </div>
              <span onClick={() => onRestore(entry.snapshot)}
                style={{ fontSize: 10, color: '#888', cursor: 'pointer', padding: '2px 7px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 5, transition: 'all 0.1s', flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent,#c8a064)'; e.currentTarget.style.borderColor = 'var(--accent-30,rgba(200,160,100,0.3))' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}>
                Restaurer
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

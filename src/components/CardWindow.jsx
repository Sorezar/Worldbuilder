import React, { useState, useRef, useEffect } from 'react'
import { Icon, Btn, Tag, InlineEdit, Modal } from './ui.jsx'
import { getEffectiveProps, getType, FIELD_TYPES, BUILTIN_TYPES } from '../data/types.js'
import { DropdownPropPicker } from '../views/CardTypesView.jsx'
import { uid } from '../store/useStore.js'

export default function CardWindow({ card, cards, customTypes, onUpdate, onDelete, onClose, onOpenCard, onCreateCard, allTypes, calendars }) {
  const type           = getType(card.typeId, customTypes)
  const effectiveProps = getEffectiveProps(card.typeId, customTypes)
  const [addingExtraProp, setAddingExtraProp] = useState(false)
  const fileRef = useRef()

  const upd          = patch => onUpdate(card.id, patch)
  const updProp      = (propId, value) => upd({ props: { ...card.props, [propId]: value } })
  const updExtraProp = (epId, value) => upd({ extraProps: (card.extraProps || []).map(ep => ep.id === epId ? { ...ep, value } : ep) })
  const removeExtra  = epId => upd({ extraProps: (card.extraProps || []).filter(ep => ep.id !== epId) })

  const handleImageUpload = e => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => upd({ image: ev.target.result })
    reader.readAsDataURL(file)
  }

  const ancestors = getAncestors(card.typeId, allTypes)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7, padding: '0 13px',
        height: 40, borderBottom: '1px solid rgba(255,200,120,0.08)', flexShrink: 0,
        background: 'rgba(255,200,100,0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, overflow: 'hidden', minWidth: 0 }}>
          {ancestors.map(a => (
            <React.Fragment key={a.id}>
              <span style={{ fontSize: 10, color: '#3a2a18' }}>{a.icon} {a.name}</span>
              <Icon name="chevron_right" size={9} style={{ color: '#2a1a08', flexShrink: 0 }} />
            </React.Fragment>
          ))}
          <span style={{ fontSize: 11, color: '#6a5a48' }}>{type?.icon} {type?.name}</span>
        </div>
        <button onClick={() => { if (confirm(`Supprimer "${card.name}" ?`)) { onDelete(card.id); onClose() } }}
          style={{ background: 'none', border: 'none', color: '#4a2a18', cursor: 'pointer', padding: '3px 5px', borderRadius: 4, fontSize: 11, display: 'flex', alignItems: 'center' }}
          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
          onMouseLeave={e => e.currentTarget.style.color = '#4a2a18'}
        >
          <Icon name="trash" size={11} />
        </button>
        <button onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#4a3a28', cursor: 'pointer', padding: '3px 5px', borderRadius: 4, fontSize: 11, display: 'flex', alignItems: 'center' }}
          onMouseEnter={e => e.currentTarget.style.color = '#c8b89a'}
          onMouseLeave={e => e.currentTarget.style.color = '#4a3a28'}
        >
          <Icon name="x" size={12} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '22px 20px 48px' }}>
        {/* Name + image */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 22 }}>
          <div style={{ flex: 1 }}>
            <input
              value={card.name}
              onChange={e => upd({ name: e.target.value })}
              style={{ background: 'transparent', border: 'none', color: '#f0e6d3', fontSize: 22, fontFamily: "'Lora', serif", fontWeight: 600, width: '100%', outline: 'none', marginBottom: 10, letterSpacing: '-0.01em' }}
            />
            {type && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', background: (type.color || '#5a5040') + '18', border: `1px solid ${type.color || '#5a5040'}28`, borderRadius: 20, fontSize: 11, color: type.color || '#9a8a70', fontFamily: "'DM Sans', sans-serif" }}>
                {type.icon} {type.name}
              </span>
            )}
          </div>
          {/* Image */}
          <div style={{ flexShrink: 0 }}>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
            {card.image ? (
              <div style={{ width: 80, height: 80, borderRadius: 9, overflow: 'hidden', border: '1px solid rgba(255,200,120,0.15)', position: 'relative', cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
                <img src={card.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={e => { e.stopPropagation(); upd({ image: '' }) }}
                  style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 3, width: 15, height: 15, cursor: 'pointer', color: '#ccc', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
            ) : (
              <div onClick={() => fileRef.current?.click()}
                style={{ width: 80, height: 80, borderRadius: 9, border: '1px dashed rgba(255,200,120,0.12)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', color: '#3a2a18', fontSize: 10 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,160,100,0.35)'; e.currentTarget.style.color = '#c8a064' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,200,120,0.12)'; e.currentTarget.style.color = '#3a2a18' }}
              >
                <Icon name="image" size={18} /><span>Image</span>
              </div>
            )}
          </div>
        </div>

        {/* Default props */}
        {effectiveProps.length > 0 && (
          <PropGroup>
            {effectiveProps.map(prop => (
              <PropField key={prop.id} prop={prop} value={card.props?.[prop.id]}
                onChange={v => updProp(prop.id, v)}
                cards={cards} customTypes={customTypes} onOpenCard={onOpenCard}
                onCreateCard={onCreateCard} allTypes={allTypes} calendars={calendars}
              />
            ))}
          </PropGroup>
        )}

        {/* Extra props */}
        {(card.extraProps || []).length > 0 && (
          <PropGroup>
            {(card.extraProps || []).map(ep => (
              <PropField key={ep.id} prop={ep} value={ep.value}
                onChange={v => updExtraProp(ep.id, v)}
                cards={cards} customTypes={customTypes} onOpenCard={onOpenCard}
                onCreateCard={onCreateCard} allTypes={allTypes} calendars={calendars}
                onRemoveProp={() => removeExtra(ep.id)}
              />
            ))}
          </PropGroup>
        )}

        {/* Add prop */}
        {addingExtraProp ? (
          <DropdownPropPicker allTypes={allTypes}
            onAdd={p => { upd({ extraProps: [...(card.extraProps || []), { ...p, id: uid(), value: p.multiple ? [] : '' }] }); setAddingExtraProp(false) }}
            onCancel={() => setAddingExtraProp(false)}
          />
        ) : (
          <button onClick={() => setAddingExtraProp(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 0', background: 'none', border: 'none', color: '#3a2a18', fontSize: 12, cursor: 'pointer', marginBottom: 18 }}
            onMouseEnter={e => e.currentTarget.style.color = '#c8a064'}
            onMouseLeave={e => e.currentTarget.style.color = '#3a2a18'}
          >
            <Icon name="plus" size={11} /> Ajouter une propriété
          </button>
        )}

        {/* Notes */}
        <div>
          <div style={{ fontSize: 10, color: '#3a2a18', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Texte</div>
          <textarea
            value={card.text || ''} onChange={e => upd({ text: e.target.value })}
            placeholder="Décrivez cet élément…" rows={5}
            style={{ width: '100%', background: 'transparent', border: 'none', color: '#9a8a78', fontSize: 13, lineHeight: 1.85, resize: 'vertical', outline: 'none', fontFamily: "'DM Sans', sans-serif" }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── PropGroup ────────────────────────────────────────────────
function PropGroup({ children }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.025)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 14, overflow: 'visible' }}>
      {children}
    </div>
  )
}

// ─── PropField ────────────────────────────────────────────────
function PropField({ prop, value, onChange, cards, customTypes, onOpenCard, onCreateCard, allTypes, onRemoveProp, calendars }) {
  const [addingRef, setAddingRef] = useState(false)

  const targetTypes   = prop.targetTypeIds || []
  const eligibleCards = targetTypes.length > 0
    ? cards.filter(c => targetTypes.some(tid => isCardOfType(c.typeId, tid, allTypes)))
    : cards

  const renderValue = () => {
    if (prop.fieldType === FIELD_TYPES.CARD_REF) {
      const refs     = prop.multiple ? (Array.isArray(value) ? value : []) : (value ? [value] : [])
      const refCards = refs.map(id => cards.find(c => c.id === id)).filter(Boolean)
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '4px 0', alignItems: 'center', position: 'relative' }}>
          {refCards.map(rc => {
            const rt = getType(rc.typeId, customTypes)
            return (
              <span key={rc.id} onClick={() => onOpenCard(rc.id)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 7px', background: (rt?.color || '#5a5040') + '18', border: `1px solid ${rt?.color || '#5a5040'}28`, borderRadius: 5, fontSize: 12, color: '#e2d9c8', cursor: 'pointer' }}>
                {rc.image
                  ? <img src={rc.image} alt="" style={{ width: 13, height: 13, borderRadius: 2, objectFit: 'cover' }} />
                  : <span style={{ fontSize: 10 }}>{rt?.icon || '📄'}</span>}
                {rc.name}
                <span onClick={e => { e.stopPropagation(); onChange(prop.multiple ? refs.filter(id => id !== rc.id) : '') }}
                  style={{ opacity: 0.4, fontSize: 9, cursor: 'pointer', marginLeft: 1 }}>✕</span>
              </span>
            )
          })}
          {addingRef ? (
            <CardRefPicker
              eligibleCards={eligibleCards.filter(c => !refs.includes(c.id))}
              targetTypeIds={targetTypes}
              customTypes={customTypes} allTypes={allTypes}
              onSelect={id => { onChange(prop.multiple ? [...refs, id] : id); setAddingRef(false) }}
              onClose={() => setAddingRef(false)}
              onCreateCard={onCreateCard}
              onCardCreated={id => { onChange(prop.multiple ? [...refs, id] : id); setAddingRef(false) }}
            />
          ) : (
            <span onClick={() => setAddingRef(true)}
              style={{ fontSize: 11, color: '#3a2a18', cursor: 'pointer', padding: '2px 6px', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 4 }}>
              + Ajouter
            </span>
          )}
        </div>
      )
    }

    if (prop.fieldType === FIELD_TYPES.TEXT || prop.fieldType === FIELD_TYPES.NUMBER) {
      if (prop.multiple) {
        const items = Array.isArray(value) ? value : []
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '4px 0', alignItems: 'center' }}>
            {items.map((item, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', background: 'rgba(255,255,255,0.05)', borderRadius: 5, fontSize: 12, color: '#c8b89a' }}>
                {item}
                <span onClick={() => onChange(items.filter((_, j) => j !== i))} style={{ opacity: 0.4, fontSize: 9, cursor: 'pointer' }}>✕</span>
              </span>
            ))}
            <InlineAddText onAdd={v => onChange([...items, v])} placeholder="+ Ajouter" />
          </div>
        )
      }
      return <InlineEdit value={value || ''} onChange={onChange} placeholder="—" style={{ display: 'block', padding: '4px 0' }} />
    }

    if (prop.fieldType === FIELD_TYPES.DATE) {
      return <DateField value={value||''} onChange={onChange} calendars={calendars||[]} />
    }    return <span style={{ color: '#3a2a18', fontSize: 12 }}>—</span>
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', minHeight: 34, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ width: 145, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '7px 9px 7px 11px', color: '#5a4a38', fontSize: 12 }}>
        <span style={{ flex: 1 }}>{prop.name}</span>
        {onRemoveProp && (
          <button onClick={onRemoveProp} style={{ background: 'none', border: 'none', color: '#3a2a18', cursor: 'pointer', fontSize: 9, padding: 0, lineHeight: 1 }}
            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
            onMouseLeave={e => e.currentTarget.style.color = '#3a2a18'}
          >✕</button>
        )}
      </div>
      <div style={{ flex: 1, padding: '4px 11px 4px 0', minWidth: 0 }}>
        {renderValue()}
      </div>
    </div>
  )
}

// ─── CardRefPicker ────────────────────────────────────────────
function CardRefPicker({ eligibleCards, targetTypeIds, customTypes, allTypes, onSelect, onClose, onCreateCard, onCardCreated }) {
  const [search, setSearch] = useState('')
  const ref = useRef()

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const filtered    = eligibleCards.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
  const searchTrim  = search.trim()

  // Determine which types can be created quickly
  const quickCreateTypes = targetTypeIds.length > 0
    ? targetTypeIds.map(tid => allTypes.find(t => t.id === tid)).filter(Boolean)
    : []

  const handleQuickCreate = (typeId) => {
    // Create a card with the typed name, then add it
    const newCard = onCreateCard(typeId)
    if (newCard) onCardCreated(newCard.id)
  }

  return (
    <div ref={ref} style={{
      position: 'absolute', top: '100%', left: 0, zIndex: 600,
      background: 'rgba(10,6,1,0.95)', backdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,200,120,0.18)', borderRadius: 10,
      width: 240, boxShadow: '0 8px 32px rgba(0,0,0,0.8)', overflow: 'hidden', marginTop: 3,
    }}>
      <div style={{ padding: '7px 9px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher…"
          style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '5px 9px', color: '#e2d9c8', fontSize: 12, outline: 'none' }}
        />
      </div>
      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
        {filtered.length === 0 && !searchTrim && (
          <div style={{ padding: '10px 14px', color: '#3a2a18', fontSize: 12 }}>Aucune carte disponible</div>
        )}
        {filtered.map(c => {
          const t = getType(c.typeId, customTypes)
          return (
            <div key={c.id} onClick={() => onSelect(c.id)}
              style={{ padding: '7px 13px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: '#c8b89a' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {c.image ? <img src={c.image} alt="" style={{ width: 16, height: 16, borderRadius: 3, objectFit: 'cover' }} /> : <span style={{ fontSize: 12 }}>{t?.icon || '📄'}</span>}
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
              {t && <span style={{ fontSize: 10, color: t.color || '#5a4a38', opacity: 0.7 }}>{t.name}</span>}
            </div>
          )
        })}
      </div>
      {/* Quick create */}
      {quickCreateTypes.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '7px 9px' }}>
          <div style={{ fontSize: 10, color: '#3a2a18', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Créer</div>
          {quickCreateTypes.map(t => (
            <button key={t.id}
              onClick={() => handleQuickCreate(t.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '5px 6px', background: 'none', border: 'none', borderRadius: 5, color: t.color || '#9a8a70', fontSize: 12, cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <Icon name="plus" size={10} />
              <span>{t.icon} Nouvelle {t.name}{searchTrim ? ` "${searchTrim}"` : ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── DateField — real date or custom calendar ─────────────────
function DateField({ value, onChange, calendars }) {
  const [open, setOpen] = useState(false)
  // Determine current mode
  const isCalDate = value && value.startsWith('cal:')
  let calId = '', dateStr = ''
  if (isCalDate) { const parts = value.split(':'); calId = parts[1]; dateStr = parts[2]||'' }

  const [mode, setMode]     = useState(isCalDate && calId ? calId : 'real')
  const [year, setYear]     = useState(() => { if(isCalDate) { const p=(dateStr||'').split('-'); return p[0]||'1' } return '' })
  const [month, setMonth]   = useState(() => { if(isCalDate) { const p=(dateStr||'').split('-'); return p[1]||'1' } return '' })
  const [day, setDay]       = useState(() => { if(isCalDate) { const p=(dateStr||'').split('-'); return p[2]||'1' } return '' })

  const selectedCal = calendars.find(c => c.id === mode)
  const monthNames  = selectedCal?.months || Array.from({length:12},(_,i)=>String(i+1))

  const applyReal = v => { onChange(v); setOpen(false) }
  const applyCalDate = () => {
    if (!year) return
    onChange(`cal:${mode}:${year}-${month||1}-${day||1}`)
    setOpen(false)
  }

  const display = () => {
    if (!value) return '—'
    if (isCalDate && calId) {
      const cal = calendars.find(c => c.id === calId)
      if (!cal) return dateStr
      const [y,m,d] = (dateStr||'1-1-1').split('-').map(Number)
      const mNames = cal.months || Array.from({length:12},(_,i)=>String(i+1))
      return `${d||1} ${mNames[(m||1)-1]||m} ${y||1} ${cal.epochName||''}`
    }
    return value
  }

  return (
    <div style={{ position:'relative' }}>
      <button onClick={() => setOpen(!open)} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'4px 10px', color:'#c8b89a', fontSize:12, cursor:'pointer', outline:'none' }}>
        {display()}
      </button>
      {open && (
        <div style={{ position:'absolute', top:'100%', left:0, zIndex:200, marginTop:4, background:'rgba(8,4,0,0.97)', border:'1px solid rgba(200,160,100,0.18)', borderRadius:10, padding:14, minWidth:260, boxShadow:'0 8px 32px rgba(0,0,0,0.7)' }}>
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, color:'#3a2a18', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Calendrier</div>
            <select value={mode} onChange={e => { setMode(e.target.value); setYear('1'); setMonth('1'); setDay('1') }}
              style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:6, padding:'5px 8px', color:'#c8b89a', fontSize:12, outline:'none' }}>
              <option value="real">Grégorien</option>
              {calendars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {mode === 'real' ? (
            <>
              <input type="date" defaultValue={isCalDate ? '' : value} onChange={e => applyReal(e.target.value)}
                style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'5px 8px', color:'#c8b89a', fontSize:12, outline:'none', colorScheme:'dark' }} />
              <button onClick={() => setOpen(false)} style={{ marginTop:8, background:'none', border:'none', color:'#4a3a28', cursor:'pointer', fontSize:11 }}>Annuler</button>
            </>
          ) : (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:10, color:'#4a3a28', marginBottom:4 }}>Jour</div>
                  <input type="number" min={1} max={30} value={day} onChange={e=>setDay(e.target.value)} style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:6, padding:'5px 7px', color:'#c8b89a', fontSize:12, outline:'none' }} />
                </div>
                <div>
                  <div style={{ fontSize:10, color:'#4a3a28', marginBottom:4 }}>Mois</div>
                  <select value={month} onChange={e=>setMonth(e.target.value)} style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:6, padding:'5px 4px', color:'#c8b89a', fontSize:12, outline:'none' }}>
                    {monthNames.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:10, color:'#4a3a28', marginBottom:4 }}>Année</div>
                  <input type="number" min={1} value={year} onChange={e=>setYear(e.target.value)} style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:6, padding:'5px 7px', color:'#c8b89a', fontSize:12, outline:'none' }} />
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={applyCalDate} style={{ flex:1, background:'rgba(200,160,100,0.12)', border:'1px solid rgba(200,160,100,0.3)', borderRadius:6, padding:'6px', color:'#c8a064', fontSize:12, cursor:'pointer' }}>Valider</button>
                <button onClick={() => setOpen(false)} style={{ background:'none', border:'none', color:'#4a3a28', cursor:'pointer', fontSize:11 }}>Annuler</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── (AddPropForm replaced by DropdownPropPicker from CardTypesView) ─────────

// ─── InlineAddText ────────────────────────────────────────────
function InlineAddText({ onAdd, placeholder }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState('')
  if (editing) return (
    <input autoFocus value={val} onChange={e => setVal(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter' && val.trim()) { onAdd(val.trim()); setVal(''); setEditing(false) } if (e.key === 'Escape') { setVal(''); setEditing(false) } }}
      onBlur={() => { if (val.trim()) onAdd(val.trim()); setVal(''); setEditing(false) }}
      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(200,160,100,0.3)', borderRadius: 5, padding: '2px 7px', color: '#e2d9c8', fontSize: 12, outline: 'none', width: 80 }}
    />
  )
  return (
    <span onClick={() => setEditing(true)} style={{ fontSize: 11, color: '#3a2a18', cursor: 'pointer', padding: '2px 6px', border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 4 }}>
      {placeholder}
    </span>
  )
}

// ─── Helpers ──────────────────────────────────────────────────
function isCardOfType(cardTypeId, targetTypeId, allTypes) {
  if (cardTypeId === targetTypeId) return true
  const typeMap = Object.fromEntries(allTypes.map(t => [t.id, t]))
  let current = typeMap[cardTypeId]
  while (current?.parentId) {
    if (current.parentId === targetTypeId) return true
    current = typeMap[current.parentId]
  }
  return false
}

function getAncestors(typeId, allTypes) {
  const typeMap = Object.fromEntries(allTypes.map(t => [t.id, t]))
  const chain   = []
  let current   = typeMap[typeId]
  while (current?.parentId) {
    current = typeMap[current.parentId]
    if (current) chain.unshift(current)
  }
  return chain
}

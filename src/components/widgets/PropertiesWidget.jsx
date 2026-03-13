import React, { useState, useRef, useEffect } from 'react'
import { Icon, InlineEdit } from '../ui.jsx'
import { getEffectiveProps, getType, FIELD_TYPES } from '../../data/types.js'
import { uid } from '../../store/useStore.js'
import { DropdownPropPicker } from '../../views/CardTypesView.jsx'

const EMOJI_GRID = [
  '😀','😂','😍','🥳','😎','🤔','😢','😡','🥺','🤩',
  '👤','👥','👑','🧙','🧝','🧛','🧟','🦸','👻','💀',
  '⚔️','🛡','🗡','🏹','🔮','✨','💎','🔥','❄️','⚡',
  '🌍','🗺','🏰','🏛','🏙','🏡','⛪','🗿','🌋','🏔',
  '📍','🌊','🌲','🌸','🍃','🌿','🦎','🐉','🦅','🐺',
  '📜','📖','📚','📝','📅','📌','🔖','🏷','📊','📈',
  '⚜️','🪶','🎭','🎪','🎉','🎵','🔔','💡','🕯','🧪',
  '⚗️','🌀','⛩','🔭','⚖️','🧭','🗝','💰','🎲','🃏',
  '❤️','💔','💜','💙','💚','💛','🧡','🤎','🖤','🤍',
  '⭐','✦','◆','●','■','▲','☰','#','☀️','🌙',
]

export default function PropertiesWidget({ widget, card, cards, customTypes, allTypes, calendars, onUpdateCard, onOpenCard, onCreateCard, layout }) {
  const [addingExtraProp, setAddingExtraProp] = useState(false)
  const [dragPropId, setDragPropId] = useState(null)
  const [dragOverInfo, setDragOverInfo] = useState(null)
  const effectiveProps = getEffectiveProps(card.typeId, customTypes)

  const upd = patch => onUpdateCard(card.id, patch)
  const updProp = (propId, value) => upd({ props: { ...card.props, [propId]: value } })
  const updExtraProp = (epId, value) => upd({ extraProps: (card.extraProps || []).map(ep => ep.id === epId ? { ...ep, value } : ep) })
  const removeExtra = epId => upd({ extraProps: (card.extraProps || []).filter(ep => ep.id !== epId) })

  const extraProps = card.extraProps || []
  const nameOverrides = card.propNameOverrides || {}
  const emojiOverrides = card.propEmojiOverrides || {}
  const typeOverrides = card.propTypeOverrides || {}

  const allProps = [
    ...effectiveProps.map(p => {
      const override = typeOverrides[p.id]
      if (override?.fieldType) return { ...p, fieldType: override.fieldType, targetTypeIds: override.targetTypeIds || p.targetTypeIds, _source: 'default' }
      return { ...p, _source: 'default' }
    }),
    ...extraProps.map(ep => ({ ...ep, _source: 'extra' })),
  ]
  const propOrder = card.propOrder || allProps.map(p => p.id)
  const orderedProps = [
    ...propOrder.map(id => allProps.find(p => p.id === id)).filter(Boolean),
    ...allProps.filter(p => !propOrder.includes(p.id)),
  ]

  const propIds = widget.config?.propIds
  let visibleProps = orderedProps.filter(p => p.id !== 'aliases')
  if (propIds && propIds !== 'all') {
    visibleProps = visibleProps.filter(p => propIds.includes(p.id))
  } else if (propIds === 'all') {
    const claimedIds = new Set()
    layout.forEach(w => {
      if (w.type === 'properties' && w.id !== widget.id && Array.isArray(w.config?.propIds)) {
        w.config.propIds.forEach(id => claimedIds.add(id))
      }
    })
    if (claimedIds.size > 0) {
      visibleProps = orderedProps.filter(p => !claimedIds.has(p.id))
    }
  }

  // Drag reorder
  const handleDragStart = (e, propId) => { setDragPropId(propId); e.dataTransfer.effectAllowed = 'move' }
  const handleDragOver = (e, propId) => {
    e.preventDefault()
    if (propId === dragPropId) { setDragOverInfo(null); return }
    const rect = e.currentTarget.getBoundingClientRect()
    const position = e.clientY < rect.top + rect.height / 2 ? 'above' : 'below'
    setDragOverInfo({ propId, position })
  }
  const handleDrop = () => {
    if (!dragPropId || !dragOverInfo || dragPropId === dragOverInfo.propId) { setDragPropId(null); setDragOverInfo(null); return }
    const currentOrder = visibleProps.map(p => p.id)
    const fromIdx = currentOrder.indexOf(dragPropId)
    let toIdx = currentOrder.indexOf(dragOverInfo.propId)
    if (fromIdx < 0 || toIdx < 0) { setDragPropId(null); setDragOverInfo(null); return }
    const newOrder = [...currentOrder]
    newOrder.splice(fromIdx, 1)
    if (fromIdx < toIdx) toIdx--
    if (dragOverInfo.position === 'below') toIdx++
    newOrder.splice(toIdx, 0, dragPropId)
    const fullOrder = [...(card.propOrder || allProps.map(p => p.id))]
    const remaining = fullOrder.filter(id => !currentOrder.includes(id))
    upd({ propOrder: [...newOrder, ...remaining] })
    setDragPropId(null); setDragOverInfo(null)
  }
  const handleDragEnd = () => { setDragPropId(null); setDragOverInfo(null) }

  const updatePropName = (propId, name) => upd({ propNameOverrides: { ...nameOverrides, [propId]: name } })
  const updatePropEmoji = (propId, emoji) => upd({ propEmojiOverrides: { ...emojiOverrides, [propId]: emoji } })

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {visibleProps.map(prop => {
          const isExtra = prop._source === 'extra'
          return (
            <PropFieldCompact key={prop.id} prop={prop}
              value={isExtra ? prop.value : card.props?.[prop.id]}
              onChange={v => isExtra ? updExtraProp(prop.id, v) : updProp(prop.id, v)}
              cards={cards} customTypes={customTypes} allTypes={allTypes} calendars={calendars}
              onOpenCard={onOpenCard} onCreateCard={onCreateCard}
              displayName={nameOverrides[prop.id]}
              emojiOverride={emojiOverrides[prop.id] || prop.emoji}
              onRemove={isExtra ? () => removeExtra(prop.id) : undefined}
              onRenameProp={name => updatePropName(prop.id, name)}
              onChangeEmoji={emoji => updatePropEmoji(prop.id, emoji)}
              draggable
              onDragStart={e => handleDragStart(e, prop.id)}
              onDragOver={e => handleDragOver(e, prop.id)}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              isDragging={dragPropId === prop.id}
              insertBefore={dragOverInfo?.propId === prop.id && dragOverInfo?.position === 'above' && dragPropId !== prop.id}
              insertAfter={dragOverInfo?.propId === prop.id && dragOverInfo?.position === 'below' && dragPropId !== prop.id}
            />
          )
        })}
        {visibleProps.length === 0 && !addingExtraProp && (
          <div style={{ padding: '10px 12px', color: 'var(--text-dim,#5a5a5a)', fontSize: 11 }}>Aucune propriete</div>
        )}
        {propIds === 'all' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 10px', borderTop: visibleProps.length > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <button onClick={() => setAddingExtraProp(true)}
              style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 11, padding: '2px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, transition: 'color 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent,#c8a064)'}
              onMouseLeave={e => e.currentTarget.style.color = '#999'}>
              <Icon name="plus" size={10} /> Ajouter une propriété
            </button>
          </div>
        )}
      </div>
      {propIds === 'all' && addingExtraProp && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100 }}>
          <DropdownPropPicker allTypes={allTypes}
            onAdd={p => { upd({ extraProps: [...(card.extraProps || []), { ...p, id: uid(), value: p.multiple ? [] : '' }] }); setAddingExtraProp(false) }}
            onCancel={() => setAddingExtraProp(false)} />
        </div>
      )}
    </div>
  )
}

// ─── PropFieldCompact with drag + editor popup ──────────────
function PropFieldCompact({ prop, value, onChange, cards, customTypes, allTypes, calendars, onOpenCard, onCreateCard, displayName, emojiOverride, onRemove, onRenameProp, onChangeEmoji, draggable, onDragStart, onDragOver, onDrop, onDragEnd, isDragging, insertBefore, insertAfter }) {
  const [addingRef, setAddingRef] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const targetTypes = prop.targetTypeIds || []
  const eligibleCards = targetTypes.length > 0
    ? cards.filter(c => targetTypes.some(tid => isCardOfType(c.typeId, tid, allTypes)))
    : cards

  const emoji = emojiOverride || (() => {
    if (prop.fieldType === FIELD_TYPES.CARD_REF) {
      const t = targetTypes[0] ? (allTypes || []).find(t => t.id === targetTypes[0]) : null
      return t?.icon || '🔗'
    }
    if (prop.fieldType === 'number') return '#'
    if (prop.fieldType === 'date') return '📅'
    return 'T'
  })()

  const renderValue = () => {
    if (prop.fieldType === FIELD_TYPES.CARD_REF) {
      const refs = prop.multiple ? (Array.isArray(value) ? value : []) : (value ? [value] : [])
      const refCards = refs.map(id => cards.find(c => c.id === id)).filter(Boolean)
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '3px 0', alignItems: 'center', position: 'relative' }}>
          {refCards.map(rc => {
            const rt = getType(rc.typeId, customTypes)
            return (
              <span key={rc.id} onClick={() => onOpenCard(rc.id)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '1px 6px', background: (rt?.color || '#5a5040') + '18', border: `1px solid ${rt?.color || '#5a5040'}28`, borderRadius: 4, fontSize: 11, color: 'var(--text-primary,#f0f0f0)', cursor: 'pointer' }}>
                {rc.image ? <img src={rc.image} alt="" style={{ width: 11, height: 11, borderRadius: 2, objectFit: 'cover' }} /> : <span style={{ fontSize: 9 }}>{rt?.icon || '📄'}</span>}
                {rc.name}
                <span onClick={e => { e.stopPropagation(); onChange(prop.multiple ? refs.filter(id => id !== rc.id) : '') }} style={{ opacity: 0.4, fontSize: 8, cursor: 'pointer' }}>✕</span>
              </span>
            )
          })}
          {addingRef ? (
            <CardRefPickerInline
              eligibleCards={eligibleCards.filter(c => !refs.includes(c.id))}
              onSelect={id => { onChange(prop.multiple ? [...refs, id] : id); setAddingRef(false) }}
              onClose={() => setAddingRef(false)}
              customTypes={customTypes}
            />
          ) : (
            <span onClick={() => setAddingRef(true)} style={{ fontSize: 10, color: 'var(--text-dim,#5a5a5a)', cursor: 'pointer', padding: '1px 5px', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 3 }}>+</span>
          )}
        </div>
      )
    }
    if (prop.fieldType === FIELD_TYPES.TEXT || prop.fieldType === FIELD_TYPES.NUMBER) {
      if (prop.multiple) {
        const items = Array.isArray(value) ? value : []
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '3px 0', alignItems: 'center' }}>
            {items.map((item, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: 4, fontSize: 11, color: 'var(--text-secondary,#c0c0c0)' }}>
                {item}
                <span onClick={() => onChange(items.filter((_, j) => j !== i))} style={{ opacity: 0.4, fontSize: 8, cursor: 'pointer' }}>✕</span>
              </span>
            ))}
          </div>
        )
      }
      const textVal = Array.isArray(value) ? '' : (value || '')
      return <InlineEdit value={textVal} onChange={onChange} placeholder="—" style={{ display: 'block', padding: '3px 0', fontSize: 12 }} />
    }
    if (prop.fieldType === FIELD_TYPES.DATE) {
      const dateVal = Array.isArray(value) ? '' : (value || '')
      return <span style={{ fontSize: 11, color: 'var(--text-muted,#8a8a8a)' }}>{dateVal || '—'}</span>
    }
    return <span style={{ color: 'var(--text-darker,#2e2e2e)', fontSize: 11 }}>—</span>
  }

  return (
    <div draggable={draggable} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd}
      style={{ display: 'flex', alignItems: 'flex-start', minHeight: 28, borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '0 10px', position: 'relative', opacity: isDragging ? 0.4 : 1, transition: 'opacity 0.1s' }}>
      {insertBefore && <div style={{ position: 'absolute', top: -1, left: 8, right: 8, height: 2, background: 'var(--accent)', borderRadius: 1, pointerEvents: 'none' }} />}
      {insertAfter && <div style={{ position: 'absolute', bottom: -1, left: 8, right: 8, height: 2, background: 'var(--accent)', borderRadius: 1, pointerEvents: 'none' }} />}
      {/* Grip handle */}
      <span style={{ fontSize: 10, color: 'var(--text-darker,#2e2e2e)', cursor: 'grab', flexShrink: 0, lineHeight: '28px', letterSpacing: 1, userSelect: 'none', width: 14, textAlign: 'center' }}>⠿</span>
      <div style={{ width: 96, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, padding: '5px 0', color: '#ccc', fontSize: 11, position: 'relative' }}>
        <span onClick={() => setShowEditor(v => !v)} title="Modifier"
          style={{ fontSize: 11, width: 14, textAlign: 'center', flexShrink: 0, cursor: 'pointer', borderRadius: 3, background: showEditor ? 'var(--accent-15)' : 'transparent', transition: 'background 0.1s' }}>{emoji}</span>
        <span onClick={() => setShowEditor(v => !v)} title="Modifier"
          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>{displayName || prop.name}</span>
        {showEditor && (
          <PropEditorMini
            prop={prop} displayName={displayName || prop.name} emoji={emoji}
            onRename={onRenameProp} onChangeEmoji={onChangeEmoji} onRemove={onRemove}
            onClose={() => setShowEditor(false)}
          />
        )}
      </div>
      <div style={{ flex: 1, padding: '2px 0', minWidth: 0 }}>
        {renderValue()}
      </div>
    </div>
  )
}

// ─── Mini prop editor popup (name + emoji) ──────────────────
function PropEditorMini({ prop, displayName, emoji, onRename, onChangeEmoji, onRemove, onClose }) {
  const [name, setName] = useState(displayName || prop.name)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiSearch, setEmojiSearch] = useState('')
  const ref = useRef()

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const commitName = () => { if (name.trim() && name.trim() !== displayName) onRename?.(name.trim()) }
  const selectEmoji = em => { onChangeEmoji?.(em); setShowEmojiPicker(false) }
  const filteredEmojis = emojiSearch ? EMOJI_GRID.filter(e => e.includes(emojiSearch)) : EMOJI_GRID

  return (
    <div ref={ref} style={{
      position: 'absolute', top: '100%', left: -8, zIndex: 500, marginTop: 2,
      background: 'var(--bg-panel-92,rgba(10,6,1,0.92))', backdropFilter: 'blur(40px) saturate(1.5)', WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
      border: '1px solid var(--border-14)', borderRadius: 10,
      width: 220, boxShadow: '0 8px 32px rgba(0,0,0,0.8)', overflow: 'visible',
    }}>
      {/* Emoji + Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={() => setShowEmojiPicker(v => !v)}
          style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--border-14)', background: showEmojiPicker ? 'var(--accent-18)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>
          {emoji}
        </button>
        <input autoFocus value={name} onChange={e => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={e => { if (e.key === 'Enter') { commitName(); onClose() } if (e.key === 'Escape') onClose() }}
          style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 5, padding: '4px 7px', color: 'var(--text-primary,#f0f0f0)', fontSize: 12, outline: 'none', fontFamily: 'var(--font-body)' }}
        />
      </div>

      {/* Emoji picker */}
      {showEmojiPicker && (
        <div style={{ padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <input value={emojiSearch} onChange={e => setEmojiSearch(e.target.value)}
            placeholder="Rechercher..."
            style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 5, padding: '3px 7px', color: 'var(--text-secondary,#c0c0c0)', fontSize: 10, outline: 'none', marginBottom: 4, boxSizing: 'border-box' }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 2, maxHeight: 120, overflowY: 'auto' }}>
            {filteredEmojis.map((em, i) => (
              <button key={i} onClick={() => selectEmoji(em)}
                style={{ width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 12, padding: 0 }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {em}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Delete */}
      {onRemove && (
        <div onClick={() => { onRemove(); onClose() }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', cursor: 'pointer', color: 'var(--danger-muted,#8a5a5a)', fontSize: 11, transition: 'background 0.1s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <Icon name="trash" size={11} /> Supprimer
        </div>
      )}
    </div>
  )
}

// ─── Minimal inline card ref picker ─────────────────────────
function CardRefPickerInline({ eligibleCards, onSelect, onClose, customTypes }) {
  const [search, setSearch] = useState('')
  const ref = useRef()

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const filtered = eligibleCards.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div ref={ref} style={{
      position: 'absolute', top: '100%', left: 0, zIndex: 600,
      background: 'var(--bg-panel-85,rgba(10,6,1,0.85))', backdropFilter: 'blur(40px) saturate(1.5)', WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
      border: '1px solid var(--border-14)', borderRadius: 10, width: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.8)', overflow: 'hidden', marginTop: 2,
    }}>
      <div style={{ padding: '6px 8px' }}>
        <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
          style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 5, padding: '4px 8px', color: 'var(--text-primary,#f0f0f0)', fontSize: 11, outline: 'none' }} />
      </div>
      <div style={{ maxHeight: 160, overflowY: 'auto' }}>
        {filtered.map(c => {
          const t = getType(c.typeId, customTypes)
          return (
            <div key={c.id} onClick={() => onSelect(c.id)}
              style={{ padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, color: 'var(--text-secondary,#c0c0c0)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontSize: 10 }}>{t?.icon || '📄'}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
            </div>
          )
        })}
        {filtered.length === 0 && <div style={{ padding: '8px 10px', color: 'var(--text-darker,#2e2e2e)', fontSize: 11 }}>Aucun resultat</div>}
      </div>
    </div>
  )
}

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

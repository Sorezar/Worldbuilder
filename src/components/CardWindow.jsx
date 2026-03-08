import React, { useState, useRef, useEffect } from 'react'
import { Icon, Btn, Tag, InlineEdit, Modal, ConfirmModal } from './ui.jsx'
import { getEffectiveProps, getType, FIELD_TYPES, BUILTIN_TYPES } from '../data/types.js'
import { DropdownPropPicker } from '../views/CardTypesView.jsx'
import { uid } from '../store/useStore.js'

export default function CardWindow({ card, cards, customTypes, onUpdate, onDelete, onClose, onOpenCard, onCreateCard, allTypes, calendars }) {
  const type           = getType(card.typeId, customTypes)
  const effectiveProps = getEffectiveProps(card.typeId, customTypes)
  const [addingExtraProp, setAddingExtraProp] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [dragPropId, setDragPropId] = useState(null)
  const [dragOverPropId, setDragOverPropId] = useState(null)
  const fileRef = useRef()

  const upd          = patch => onUpdate(card.id, patch)
  const updProp      = (propId, value) => upd({ props: { ...card.props, [propId]: value } })
  const updExtraProp = (epId, value) => upd({ extraProps: (card.extraProps || []).map(ep => ep.id === epId ? { ...ep, value } : ep) })
  const removeExtra  = epId => upd({ extraProps: (card.extraProps || []).filter(ep => ep.id !== epId) })
  const renameProp   = (propId, newName) => upd({ propNameOverrides: { ...(card.propNameOverrides || {}), [propId]: newName } })
  const nameOverrides = card.propNameOverrides || {}
  const emojiOverrides = card.propEmojiOverrides || {}

  // Merge all props into one ordered list, applying type overrides for default props
  const extraProps = card.extraProps || []
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

  const handlePropDragStart = (e, propId) => { setDragPropId(propId); e.dataTransfer.effectAllowed = 'move' }
  const handlePropDragOver = (e, propId) => { e.preventDefault(); if (propId !== dragPropId) setDragOverPropId(propId) }
  const handlePropDrop = (e, targetId) => {
    e.preventDefault()
    if (!dragPropId || dragPropId === targetId) { setDragPropId(null); setDragOverPropId(null); return }
    const ids = orderedProps.map(p => p.id)
    const fromIdx = ids.indexOf(dragPropId)
    const toIdx = ids.indexOf(targetId)
    if (fromIdx < 0 || toIdx < 0) { setDragPropId(null); setDragOverPropId(null); return }
    const newOrder = [...ids]
    newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, dragPropId)
    upd({ propOrder: newOrder })
    setDragPropId(null); setDragOverPropId(null)
  }
  const handlePropDragEnd = () => { setDragPropId(null); setDragOverPropId(null) }

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
        display: 'flex', alignItems: 'center', gap: 7, padding: '0 15px',
        height: 42, borderBottom: '1px solid rgba(255,200,120,0.08)', flexShrink: 0,
        background: 'rgba(255,200,100,0.02)', borderRadius: '16px 16px 0 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, overflow: 'hidden', minWidth: 0 }}>
          {ancestors.map(a => (
            <React.Fragment key={a.id}>
              <span style={{ fontSize: 10, color: 'var(--text-darker,#2e2e2e)' }}>{a.icon} {a.name}</span>
              <Icon name="chevron_right" size={9} style={{ color: '#2a1a08', flexShrink: 0 }} />
            </React.Fragment>
          ))}
          <span style={{ fontSize: 11, color: '#5a5a5a' }}>{type?.icon} {type?.name}</span>
        </div>
        <button onClick={() => setShowDeleteConfirm(true)}
          style={{ background: 'none', border: 'none', color: '#4a2a18', cursor: 'pointer', padding: '3px 5px', borderRadius: 4, fontSize: 11, display: 'flex', alignItems: 'center' }}
          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
          onMouseLeave={e => e.currentTarget.style.color = '#4a2a18'}
        >
          <Icon name="trash" size={11} />
        </button>
        <button onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-dark,#444444)', cursor: 'pointer', padding: '3px 5px', borderRadius: 4, fontSize: 11, display: 'flex', alignItems: 'center' }}
          onMouseEnter={e => e.currentTarget.style.color = '#c0c0c0'}
          onMouseLeave={e => e.currentTarget.style.color = '#444444'}
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
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary,#f0f0f0)', fontSize: 22, fontFamily: "var(--font)", fontWeight: 600, width: '100%', outline: 'none', marginBottom: 10, letterSpacing: '-0.01em' }}
            />
            {type && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', background: (type.color || '#5a5040') + '18', border: `1px solid ${type.color || '#5a5040'}28`, borderRadius: 20, fontSize: 11, color: type.color || '#8a8a8a', fontFamily: "var(--font-body)" }}>
                {type.icon} {type.name}
              </span>
            )}
          </div>
          {/* Image */}
          <div style={{ flexShrink: 0 }}>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
            {card.image ? (
              <div style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,200,120,0.15)', position: 'relative', cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
                <img src={card.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={e => { e.stopPropagation(); upd({ image: '' }) }}
                  style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 3, width: 15, height: 15, cursor: 'pointer', color: '#ccc', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
            ) : (
              <div onClick={() => fileRef.current?.click()}
                style={{ width: 80, height: 80, borderRadius: 12, border: '1px dashed rgba(255,200,120,0.12)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', color: 'var(--text-darker,#2e2e2e)', fontSize: 10 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,160,100,0.35)'; e.currentTarget.style.color = '#c8a064' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,200,120,0.12)'; e.currentTarget.style.color = '#2e2e2e' }}
              >
                <Icon name="image" size={18} /><span>Image</span>
              </div>
            )}
          </div>
        </div>

        {/* Aliases (fixed, not draggable) */}
        {orderedProps.some(p => p.id === 'aliases') && (() => {
          const aliasesProp = orderedProps.find(p => p.id === 'aliases')
          return (
            <PropGroup>
              <PropField prop={aliasesProp}
                value={card.props?.['aliases']}
                onChange={v => updProp('aliases', v)}
                cards={cards} customTypes={customTypes} onOpenCard={onOpenCard}
                onCreateCard={onCreateCard} allTypes={allTypes} calendars={calendars}
              />
            </PropGroup>
          )
        })()}

        {/* All other props (merged, ordered, draggable) */}
        {orderedProps.filter(p => p.id !== 'aliases').length > 0 && (
          <PropGroup>
            {orderedProps.filter(p => p.id !== 'aliases').map(prop => {
              const isExtra = prop._source === 'extra'
              const isDragOver = dragOverPropId === prop.id
              return (
                <div key={prop.id}
                  draggable
                  onDragStart={e => handlePropDragStart(e, prop.id)}
                  onDragOver={e => handlePropDragOver(e, prop.id)}
                  onDrop={e => handlePropDrop(e, prop.id)}
                  onDragEnd={handlePropDragEnd}
                  style={{ borderTop: isDragOver ? '2px solid rgba(200,160,100,0.5)' : '2px solid transparent', opacity: dragPropId === prop.id ? 0.4 : 1 }}
                >
                  <PropField prop={prop}
                    value={isExtra ? prop.value : card.props?.[prop.id]}
                    onChange={v => isExtra ? updExtraProp(prop.id, v) : updProp(prop.id, v)}
                    cards={cards} customTypes={customTypes} onOpenCard={onOpenCard}
                    onCreateCard={onCreateCard} allTypes={allTypes} calendars={calendars}
                    onRemoveProp={isExtra ? () => removeExtra(prop.id) : undefined}
                    displayName={nameOverrides[prop.id]}
                    emojiOverride={emojiOverrides[prop.id] || prop.emoji}
                    onRename={name => renameProp(prop.id, name)}
                    onEditProp={patch => {
                      if (isExtra) {
                        upd({ extraProps: (card.extraProps || []).map(ep => ep.id === prop.id ? { ...ep, ...patch } : ep) })
                      } else {
                        if (patch.emoji !== undefined) {
                          upd({ propEmojiOverrides: { ...(card.propEmojiOverrides || {}), [prop.id]: patch.emoji } })
                        }
                        if (patch.fieldType !== undefined) {
                          upd({ propTypeOverrides: { ...(card.propTypeOverrides || {}), [prop.id]: { fieldType: patch.fieldType, targetTypeIds: patch.targetTypeIds } } })
                        }
                      }
                    }}
                    isExtraProp={isExtra}
                  />
                </div>
              )
            })}
          </PropGroup>
        )}

        {/* Add prop */}
        {addingExtraProp ? (
          <DropdownPropPicker allTypes={allTypes}
            onAdd={p => { upd({ extraProps: [...(card.extraProps || []), { ...p, id: uid(), value: p.multiple ? [] : '' }] }); setAddingExtraProp(false) }}
            onCancel={() => setAddingExtraProp(false)}
          />
        ) : (
          <button onClick={() => setAddingExtraProp(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 0', background: 'none', border: 'none', color: 'var(--text-darker,#2e2e2e)', fontSize: 12, cursor: 'pointer', marginBottom: 18 }}
            onMouseEnter={e => e.currentTarget.style.color = '#c8a064'}
            onMouseLeave={e => e.currentTarget.style.color = '#2e2e2e'}
          >
            <Icon name="plus" size={11} /> Ajouter une propriété
          </button>
        )}

        {/* Notes */}
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-darker,#2e2e2e)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Texte</div>
          <textarea
            value={card.text || ''} onChange={e => upd({ text: e.target.value })}
            placeholder="Décrivez cet élément…" rows={5}
            style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-muted,#8a8a8a)', fontSize: 13, lineHeight: 1.85, resize: 'vertical', outline: 'none', fontFamily: "var(--font-body)" }}
          />
        </div>
      </div>

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

// ─── PropGroup ────────────────────────────────────────────────
function PropGroup({ children }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', marginBottom: 14, overflow: 'visible' }}>
      {children}
    </div>
  )
}

// ─── PropField ────────────────────────────────────────────────
function PropField({ prop, value, onChange, cards, customTypes, onOpenCard, onCreateCard, allTypes, onRemoveProp, calendars, displayName, emojiOverride, onRename, onEditProp, isExtraProp }) {
  const [addingRef, setAddingRef] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [showEditor, setShowEditor] = useState(false)

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
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 7px', background: (rt?.color || '#5a5040') + '18', border: `1px solid ${rt?.color || '#5a5040'}28`, borderRadius: 5, fontSize: 12, color: 'var(--text-primary,#f0f0f0)', cursor: 'pointer' }}>
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
              style={{ fontSize: 11, color: 'var(--text-darker,#2e2e2e)', cursor: 'pointer', padding: '2px 6px', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 4 }}>
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
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', background: 'rgba(255,255,255,0.05)', borderRadius: 5, fontSize: 12, color: 'var(--text-secondary,#c0c0c0)' }}>
                {item}
                <span onClick={() => onChange(items.filter((_, j) => j !== i))} style={{ opacity: 0.4, fontSize: 9, cursor: 'pointer' }}>✕</span>
              </span>
            ))}
            <InlineAddText onAdd={v => onChange([...items, v])} placeholder="+ Ajouter" />
          </div>
        )
      }
      const textVal = Array.isArray(value) ? '' : (value || '')
      return <InlineEdit value={textVal} onChange={onChange} placeholder="—" style={{ display: 'block', padding: '4px 0' }} />
    }

    if (prop.fieldType === FIELD_TYPES.DATE) {
      const dateVal = Array.isArray(value) ? '' : (value || '')
      return <DateField value={dateVal} onChange={onChange} calendars={calendars||[]} />
    }
    return <span style={{ color: 'var(--text-darker,#2e2e2e)', fontSize: 12 }}>—</span>
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', minHeight: 34, borderBottom: '1px solid rgba(255,255,255,0.04)', position: 'relative' }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {/* Drag handle */}
      <div style={{ width: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', cursor: 'grab', opacity: hovered ? 0.5 : 0, transition: 'opacity 0.12s', color: 'var(--text-dim,#5a5a5a)', fontSize: 10, letterSpacing: '1px' }}>
        <Icon name="drag" size={10} />
      </div>
      <div style={{ width: 130, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '7px 4px 7px 0', color: 'var(--text-dim,#5a5a5a)', fontSize: 12, position: 'relative' }}>
        <span style={{ fontSize: 12, flexShrink: 0, width: 16, textAlign: 'center' }}>
          {emojiOverride || (() => {
            if (prop.fieldType === FIELD_TYPES.CARD_REF) {
              const targetId = prop.targetTypeIds?.[0]
              const targetType = targetId ? (allTypes || []).find(t => t.id === targetId) : null
              return targetType?.icon || '🔗'
            }
            if (prop.fieldType === 'number') return '#'
            if (prop.fieldType === 'date') return '📅'
            return 'T'
          })()}
        </span>
        <span style={{ flex: 1, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          onClick={() => { if (onRename || onRemoveProp) setShowEditor(true) }}>
          {displayName || prop.name}
        </span>
        {showEditor && (
          <PropEditorPopup
            prop={{ ...prop, emoji: emojiOverride || prop.emoji }}
            displayName={displayName || prop.name}
            onRename={onRename}
            onRemove={onRemoveProp}
            onEditProp={onEditProp}
            isExtraProp={isExtraProp}
            allTypes={allTypes}
            onClose={() => setShowEditor(false)}
          />
        )}
      </div>
      <div style={{ flex: 1, padding: '4px 11px 4px 0', minWidth: 0 }}>
        {renderValue()}
      </div>
    </div>
  )
}

// ─── Emoji grid data ─────────────────────────────────────────
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

// ─── PropEditorPopup ─────────────────────────────────────────
function PropEditorPopup({ prop, displayName, onRename, onRemove, onEditProp, isExtraProp, allTypes, onClose }) {
  const [name, setName] = useState(displayName || prop.name)
  const [emoji, setEmoji] = useState(prop.emoji || '')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiSearch, setEmojiSearch] = useState('')
  const [showTypeMenu, setShowTypeMenu] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  // Primitive field types
  const PRIMITIVE_TYPES = [
    { id: 'text', label: 'Texte', icon: '☰' },
    { id: 'number', label: 'Numérique', icon: '#' },
    { id: 'date', label: 'Date', icon: '📅' },
  ]

  // Card types (non-virtual, including subtypes) as reference options
  const cardTypes = (allTypes || []).filter(t => !t.virtual)

  // Determine current display label
  const getCurrentTypeLabel = () => {
    const prim = PRIMITIVE_TYPES.find(t => t.id === prop.fieldType)
    if (prim && prop.fieldType !== 'card_ref') return prim.label
    // It's a card_ref — find the target type
    const targetId = prop.targetTypeIds?.[0]
    if (targetId) {
      const ct = (allTypes || []).find(t => t.id === targetId)
      if (ct) return ct.name
    }
    return 'Texte'
  }

  const commitName = () => {
    if (name.trim() && name.trim() !== (displayName || prop.name)) {
      onRename?.(name.trim())
    }
  }

  const selectEmoji = em => {
    setEmoji(em)
    if (onEditProp) onEditProp({ emoji: em })
    setShowEmojiPicker(false)
  }

  const changeToPrimitive = typeId => {
    if (onEditProp) onEditProp({ fieldType: typeId, targetTypeIds: undefined })
    setShowTypeMenu(false)
  }

  const changeToCardRef = cardTypeId => {
    if (onEditProp) onEditProp({ fieldType: 'card_ref', targetTypeIds: [cardTypeId] })
    setShowTypeMenu(false)
  }

  const isCurrentPrimitive = id => prop.fieldType === id && prop.fieldType !== 'card_ref'
  const isCurrentCardRef = typeId => prop.fieldType === 'card_ref' && prop.targetTypeIds?.[0] === typeId

  const filteredEmojis = emojiSearch
    ? EMOJI_GRID.filter(e => e.includes(emojiSearch))
    : EMOJI_GRID

  return (
    <div ref={ref} style={{
      position: 'absolute', top: '100%', left: -16, zIndex: 500, marginTop: 2,
      background: 'rgba(10,6,1,0.92)', backdropFilter: 'blur(40px) saturate(1.5)', WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
      border: '1px solid rgba(255,200,120,0.14)', borderRadius: 12,
      width: 240, boxShadow: '0 8px 32px rgba(0,0,0,0.8)', overflow: 'visible',
    }}>
      {/* Emoji + Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
        <button onClick={() => { setShowEmojiPicker(v => !v); setShowTypeMenu(false) }}
          style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,200,120,0.15)', background: showEmojiPicker ? 'rgba(200,160,100,0.15)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>
          {emoji || '☰'}
        </button>
        <input autoFocus value={name} onChange={e => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={e => { if (e.key === 'Enter') { commitName(); onClose() } if (e.key === 'Escape') onClose() }}
          style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '5px 8px', color: 'var(--text-primary,#f0f0f0)', fontSize: 13, outline: 'none', fontFamily: "var(--font-body)" }}
        />
      </div>

      {/* Emoji picker panel */}
      {showEmojiPicker && (
        <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <input value={emojiSearch} onChange={e => setEmojiSearch(e.target.value)}
            placeholder="Rechercher des icônes…"
            style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '4px 8px', color: 'var(--text-secondary,#c0c0c0)', fontSize: 11, outline: 'none', marginBottom: 6, boxSizing: 'border-box' }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 2, maxHeight: 140, overflowY: 'auto' }}>
            {filteredEmojis.map((em, i) => (
              <button key={i} onClick={() => selectEmoji(em)}
                style={{ width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: emoji === em ? 'rgba(200,160,100,0.2)' : 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, padding: 0, transition: 'background 0.08s' }}
                onMouseEnter={e => { if (emoji !== em) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                onMouseLeave={e => { if (emoji !== em) e.currentTarget.style.background = 'transparent' }}>
                {em}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Type */}
      <div style={{ position: 'relative' }}>
        <div onClick={() => { setShowTypeMenu(v => !v); setShowEmojiPicker(false) }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.1s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <span style={{ fontSize: 12, color: 'var(--text-dim,#5a5a5a)' }}>Type</span>
          <span style={{ fontSize: 12, color: '#8a8a8a', display: 'flex', alignItems: 'center', gap: 4 }}>
            {getCurrentTypeLabel()}
            <Icon name="chevron_right" size={9} style={{ color: 'var(--text-dark,#444444)' }} />
          </span>
        </div>

        {/* Type selection dropdown */}
        {showTypeMenu && (
          <div style={{
            position: 'absolute', top: 0, left: '100%', marginLeft: 4, zIndex: 510,
            background: 'rgba(10,6,1,0.92)', backdropFilter: 'blur(40px) saturate(1.5)', WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
            border: '1px solid rgba(255,200,120,0.14)', borderRadius: 10,
            width: 180, boxShadow: '0 8px 32px rgba(0,0,0,0.8)', overflow: 'hidden', maxHeight: 320, overflowY: 'auto',
          }}>
            {/* Primitive types */}
            {PRIMITIVE_TYPES.map(opt => (
              <TypeMenuItem key={opt.id} icon={opt.icon} label={opt.label}
                active={isCurrentPrimitive(opt.id)} onClick={() => changeToPrimitive(opt.id)} />
            ))}

            {/* Separator */}
            {cardTypes.length > 0 && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '2px 0', padding: '4px 11px 2px' }}>
                <span style={{ fontSize: 9, color: 'var(--text-darker,#2e2e2e)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Types de cartes</span>
              </div>
            )}

            {/* Card types as reference targets — grouped by parent */}
            {cardTypes.filter(ct => !ct.parentId).map(ct => {
              const children = cardTypes.filter(c => c.parentId === ct.id)
              return (
                <React.Fragment key={ct.id}>
                  <TypeMenuItem icon={ct.icon} label={ct.name}
                    active={isCurrentCardRef(ct.id)} onClick={() => changeToCardRef(ct.id)}
                    color={ct.color} />
                  {children.map(child => (
                    <TypeMenuItem key={child.id} icon={child.icon} label={child.name}
                      active={isCurrentCardRef(child.id)} onClick={() => changeToCardRef(child.id)}
                      color={child.color} indent />
                  ))}
                </React.Fragment>
              )
            })}
          </div>
        )}
      </div>

      {/* Delete */}
      {onRemove && (
        <div onClick={() => { onRemove(); onClose() }}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', cursor: 'pointer', color: '#8a5a5a', fontSize: 12, transition: 'background 0.1s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,80,80,0.06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <Icon name="trash" size={12} />
          <span>Supprimer</span>
        </div>
      )}
    </div>
  )
}

function TypeMenuItem({ icon, label, active, onClick, color, indent }) {
  return (
    <div onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: `7px 11px 7px ${indent ? 25 : 11}px`, cursor: 'pointer', fontSize: indent ? 11 : 12,
        color: active ? '#c8a064' : (color || '#8a8a8a'),
        background: active ? 'rgba(200,160,100,0.1)' : 'transparent',
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
      background: 'rgba(10,6,1,0.85)', backdropFilter: 'blur(40px) saturate(1.5)', WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
      border: '1px solid rgba(255,200,120,0.14)', borderRadius: 14,
      width: 240, boxShadow: '0 8px 32px rgba(0,0,0,0.8)', overflow: 'hidden', marginTop: 3,
    }}>
      <div style={{ padding: '7px 9px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher…"
          style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '5px 9px', color: 'var(--text-primary,#f0f0f0)', fontSize: 12, outline: 'none' }}
        />
      </div>
      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
        {filtered.length === 0 && !searchTrim && (
          <div style={{ padding: '10px 14px', color: 'var(--text-darker,#2e2e2e)', fontSize: 12 }}>Aucune carte disponible</div>
        )}
        {filtered.map(c => {
          const t = getType(c.typeId, customTypes)
          return (
            <div key={c.id} onClick={() => onSelect(c.id)}
              style={{ padding: '7px 13px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary,#c0c0c0)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {c.image ? <img src={c.image} alt="" style={{ width: 16, height: 16, borderRadius: 3, objectFit: 'cover' }} /> : <span style={{ fontSize: 12 }}>{t?.icon || '📄'}</span>}
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
              {t && <span style={{ fontSize: 10, color: t.color || '#5a5a5a', opacity: 0.7 }}>{t.name}</span>}
            </div>
          )
        })}
      </div>
      {/* Quick create */}
      {quickCreateTypes.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '7px 9px' }}>
          <div style={{ fontSize: 10, color: 'var(--text-darker,#2e2e2e)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Créer</div>
          {quickCreateTypes.map(t => (
            <button key={t.id}
              onClick={() => handleQuickCreate(t.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '5px 6px', background: 'none', border: 'none', borderRadius: 5, color: t.color || '#8a8a8a', fontSize: 12, cursor: 'pointer', textAlign: 'left' }}
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
      <button onClick={() => setOpen(!open)} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'4px 10px', color:'#c0c0c0', fontSize:12, cursor:'pointer', outline:'none' }}>
        {display()}
      </button>
      {open && (
        <div style={{ position:'absolute', top:'100%', left:0, zIndex:200, marginTop:4, background:'rgba(8,4,0,0.85)', backdropFilter:'blur(40px) saturate(1.5)', WebkitBackdropFilter:'blur(40px) saturate(1.5)', border:'1px solid rgba(200,160,100,0.14)', borderRadius:14, padding:14, minWidth:260, boxShadow:'0 8px 32px rgba(0,0,0,0.7)' }}>
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, color:'#2e2e2e', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Calendrier</div>
            <select value={mode} onChange={e => { setMode(e.target.value); setYear('1'); setMonth('1'); setDay('1') }}
              style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:6, padding:'5px 8px', color:'#c0c0c0', fontSize:12, outline:'none' }}>
              <option value="real">Grégorien</option>
              {calendars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {mode === 'real' ? (
            <>
              <input type="date" defaultValue={isCalDate ? '' : value} onChange={e => applyReal(e.target.value)}
                style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'5px 8px', color:'#c0c0c0', fontSize:12, outline:'none', colorScheme:'dark' }} />
              <button onClick={() => setOpen(false)} style={{ marginTop:8, background:'none', border:'none', color:'#444444', cursor:'pointer', fontSize:11 }}>Annuler</button>
            </>
          ) : (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:10, color:'#444444', marginBottom:4 }}>Jour</div>
                  <input type="number" min={1} max={30} value={day} onChange={e=>setDay(e.target.value)} style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:6, padding:'5px 7px', color:'#c0c0c0', fontSize:12, outline:'none' }} />
                </div>
                <div>
                  <div style={{ fontSize:10, color:'#444444', marginBottom:4 }}>Mois</div>
                  <select value={month} onChange={e=>setMonth(e.target.value)} style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:6, padding:'5px 4px', color:'#c0c0c0', fontSize:12, outline:'none' }}>
                    {monthNames.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:10, color:'#444444', marginBottom:4 }}>Année</div>
                  <input type="number" min={1} value={year} onChange={e=>setYear(e.target.value)} style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:6, padding:'5px 7px', color:'#c0c0c0', fontSize:12, outline:'none' }} />
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={applyCalDate} style={{ flex:1, background:'rgba(200,160,100,0.12)', border:'1px solid rgba(200,160,100,0.3)', borderRadius:6, padding:'6px', color:'var(--accent,#c8a064)', fontSize:12, cursor:'pointer' }}>Valider</button>
                <button onClick={() => setOpen(false)} style={{ background:'none', border:'none', color:'#444444', cursor:'pointer', fontSize:11 }}>Annuler</button>
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
      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(200,160,100,0.3)', borderRadius: 5, padding: '2px 7px', color: 'var(--text-primary,#f0f0f0)', fontSize: 12, outline: 'none', width: 80 }}
    />
  )
  return (
    <span onClick={() => setEditing(true)} style={{ fontSize: 11, color: 'var(--text-darker,#2e2e2e)', cursor: 'pointer', padding: '2px 6px', border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 4 }}>
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

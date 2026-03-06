import React, { useState, useMemo } from 'react'
import { Icon, Btn, Tag } from '../components/ui.jsx'
import { BUILTIN_TYPES } from '../data/types.js'

const BUILTIN_COLORS = { character:'#c084fc', location:'#f59e0b', faction:'#ef4444', item:'#06b6d4', event:'#22c55e', lore:'#a78bfa', ecology:'#84cc16' }

function getTypeInfo(typeId, customTypes) {
  const t = [...BUILTIN_TYPES, ...(customTypes || [])].find(x => x.id === typeId)
  return { icon: t?.icon || '📄', color: t?.color || BUILTIN_COLORS[typeId] || '#9a8a70', name: t?.name || typeId }
}

export default function CharactersView({ cards, customTypes, onOpenCard, onCreateCard }) {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [sortBy, setSortBy] = useState('name')

  // All card types present in current cards — deduplicated (custom overrides builtin)
  const usedTypes = useMemo(() => {
    const typeIds = new Set(cards.map(c => c.typeId))
    const allTypes = [...BUILTIN_TYPES, ...(customTypes || [])]
    // Build a deduped map: last write wins (custom overrides builtin)
    const deduped = new Map()
    allTypes.forEach(t => { if (typeIds.has(t.id) && !t.virtual) deduped.set(t.id, t) })
    return [...deduped.values()]
  }, [cards, customTypes])

  // Filter and sort
  const filtered = useMemo(() => {
    let result = [...cards]
    if (search) result = result.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.text || '').toLowerCase().includes(search.toLowerCase()))
    if (filterType !== 'all') result = result.filter(c => c.typeId === filterType)
    switch (sortBy) {
      case 'name': result.sort((a, b) => a.name.localeCompare(b.name)); break
      case 'recent': result.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)); break
      case 'oldest': result.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)); break
      case 'type': result.sort((a, b) => a.typeId.localeCompare(b.typeId)); break
    }
    return result
  }, [cards, search, filterType, sortBy])

  // Get alternate forms (cards that reference another card as "forme alternative" or parent)
  const getAltForms = (parentCard) => {
    return cards.filter(c => {
      if (c.id === parentCard.id) return false
      // Check if any of this card's props references parentCard as its own kind
      const parentTypeId = parentCard.typeId
      const childTypeId = c.typeId
      // Same type family + has a relation to parent
      if (parentTypeId !== childTypeId) return false
      const allRefs = getAllRefs(c)
      return allRefs.includes(parentCard.id)
    })
  }

  const getAllRefs = (card) => {
    const refs = []
    Object.values(card.props || {}).forEach(v => {
      if (Array.isArray(v)) refs.push(...v.filter(x => typeof x === 'string'))
      else if (typeof v === 'string' && v) refs.push(v)
    });
    (card.extraProps || []).forEach(ep => {
      if (Array.isArray(ep.value)) refs.push(...ep.value.filter(x => typeof x === 'string'))
      else if (typeof ep.value === 'string' && ep.value) refs.push(ep.value)
    })
    return refs
  }

  // Group by type
  const grouped = useMemo(() => {
    if (filterType !== 'all') return { [filterType]: filtered }
    const groups = {}
    filtered.forEach(c => {
      if (!groups[c.typeId]) groups[c.typeId] = []
      groups[c.typeId].push(c)
    })
    return groups
  }, [filtered, filterType])

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '28px 36px', background: 'var(--bg-base-50,rgba(8,4,0,0.5))', backdropFilter: 'blur(40px) saturate(1.4)', WebkitBackdropFilter: 'blur(40px) saturate(1.4)', borderRadius: 16, border: '1px solid var(--border-09,rgba(255,200,120,0.09))' }} className="anim-fadeup">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <h2 style={{ fontFamily: "var(--font)", fontSize: 22, color: 'var(--text-primary,#f0e6d3)', fontWeight: 500 }}>
          Documents ({cards.length})
        </h2>
        <Btn variant="primary" onClick={() => onCreateCard('character')}>
          <Icon name="plus" size={13} /> Nouveau
        </Btn>
      </div>

      {/* Filters bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Icon name="search" size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark,#4a3a28)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '7px 10px 7px 26px', color: 'var(--text-secondary,#c8b89a)', fontSize: 12, outline: 'none', width: 180 }}
          />
        </div>

        {/* Type filter */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <FilterChip label="Tous" active={filterType === 'all'} onClick={() => setFilterType('all')} />
          {usedTypes.map(t => (
            <FilterChip key={t.id} label={`${t.icon} ${t.name}`} color={t.color || BUILTIN_COLORS[t.id]} active={filterType === t.id} onClick={() => setFilterType(t.id)} />
          ))}
        </div>

        {/* Sort */}
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '7px 10px', color: 'var(--text-muted,#9a8a70)', fontSize: 12, outline: 'none', cursor: 'pointer' }}>
          <option value="name">Alphabétique</option>
          <option value="recent">Plus récents</option>
          <option value="oldest">Plus anciens</option>
          <option value="type">Par type</option>
        </select>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--text-darker,#3a2a18)' }}>
          <p style={{ fontSize: 15 }}>{search || filterType !== 'all' ? 'Aucun résultat' : 'Aucun document'}</p>
        </div>
      ) : filterType !== 'all' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.map(card => <CardRow key={card.id} card={card} altForms={getAltForms(card)} customTypes={customTypes} onOpenCard={onOpenCard} cards={cards} />)}
        </div>
      ) : (
        Object.entries(grouped).map(([typeId, typeCards]) => {
          const t = getTypeInfo(typeId, customTypes)
          return (
            <div key={typeId} style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 14 }}>{t.icon}</span>
                <span style={{ fontFamily: "var(--font)", fontSize: 15, color: 'var(--text-secondary,#c8b89a)', fontWeight: 500 }}>{t.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-dark,#4a3a28)' }}>({typeCards.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {typeCards.map(card => <CardRow key={card.id} card={card} altForms={getAltForms(card)} customTypes={customTypes} onOpenCard={onOpenCard} cards={cards} />)}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

function FilterChip({ label, active, onClick, color }) {
  return (
    <span onClick={onClick} style={{
      padding: '5px 12px', borderRadius: 10, cursor: 'pointer', fontSize: 12,
      background: active ? (color ? color + '20' : 'var(--accent-15,rgba(200,160,100,0.15))') : 'rgba(255,255,255,0.04)',
      color: active ? (color || 'var(--accent,#c8a064)') : 'var(--text-muted,#7a6a58)',
      border: `1px solid ${active ? (color ? color + '35' : 'var(--accent-22,rgba(200,160,100,0.25))') : 'transparent'}`,
      transition: 'all 0.1s',
    }}>
      {label}
    </span>
  )
}

function CardRow({ card, altForms, customTypes, onOpenCard, cards }) {
  const [expanded, setExpanded] = useState(false)
  const t = getTypeInfo(card.typeId, customTypes)
  const hasAltForms = altForms.length > 0

  // Get relation pills from props
  const relPills = []
  Object.entries(card.props || {}).forEach(([propId, v]) => {
    const ids = Array.isArray(v) ? v : (v ? [v] : [])
    ids.slice(0, 3).forEach(id => {
      const ref = cards.find(c => c.id === id)
      if (ref) relPills.push({ ...getTypeInfo(ref.typeId, customTypes), name: ref.name })
    })
  })

  return (
    <div>
      <div onClick={() => onOpenCard(card.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px',
          borderRadius: 9, cursor: 'pointer', border: '1px solid transparent',
          transition: 'all 0.1s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
      >
        {/* Avatar */}
        {card.image
          ? <img src={card.image} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
          : <div style={{ width: 36, height: 36, borderRadius: 8, background: (t.color || '#5a5040') + '1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, border: `1px solid ${t.color || '#5a5040'}28` }}>{t.icon}</div>
        }

        {/* Name + text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font)", fontSize: 14, color: 'var(--text-primary,#f0e6d3)', marginBottom: 2 }}>{card.name}</div>
          {card.text && <div style={{ fontSize: 11, color: 'var(--text-dim,#5a4a38)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.text}</div>}
        </div>

        {/* Relation pills */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'nowrap' }}>
          {relPills.map((p, i) => <Tag key={i} label={`${p.icon} ${p.name}`} color={p.color} size="sm" />)}
        </div>

        {/* Type tag */}
        <Tag label={t.name} color={t.color} size="sm" />

        {/* Alt forms toggle */}
        {hasAltForms && (
          <button onClick={e => { e.stopPropagation(); setExpanded(!expanded) }}
            style={{ background: 'none', border: 'none', color: 'var(--text-dim,#5a4a38)', cursor: 'pointer', padding: '2px 6px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icon name={expanded ? 'chevron_down' : 'chevron_right'} size={11} />
            {altForms.length} forme{altForms.length > 1 ? 's' : ''}
          </button>
        )}

        <Icon name="chevron_right" size={13} style={{ opacity: 0.2, flexShrink: 0 }} />
      </div>

      {/* Alt forms */}
      {expanded && altForms.map(alt => (
        <div key={alt.id} onClick={() => onOpenCard(alt.id)}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 14px 7px 58px', borderRadius: 7, cursor: 'pointer', marginBottom: 1 }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: t.color || '#5a5040', flexShrink: 0 }} />
          {alt.image ? <img src={alt.image} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />
            : <div style={{ width: 28, height: 28, borderRadius: 6, background: t.color + '1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{t.icon}</div>
          }
          <span style={{ fontFamily: "var(--font)", fontSize: 13, color: 'var(--text-secondary,#c8b89a)' }}>{alt.name}</span>
          <span style={{ fontSize: 11, color: 'var(--text-dark,#4a3a28)', fontStyle: 'italic' }}>forme alternative</span>
        </div>
      ))}
    </div>
  )
}

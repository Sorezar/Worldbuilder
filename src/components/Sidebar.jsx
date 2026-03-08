import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Icon, ConfirmModal } from './ui.jsx'
import { getType, BUILTIN_TYPES, isDescendantOf } from '../data/types.js'

export default function Sidebar({
  cards, folders, customTypes, openCardIds,
  onOpenCard, onCreateCard, onCreateFolder,
  onUpdateFolder, onDeleteFolder, onUpdateCard,
  onDeleteCard, onDuplicateCard,
  onShowTypes, showTypes,
}) {
  const [search,          setSearch]          = useState('')
  const [expandedFolders, setExpandedFolders] = useState(new Set())
  const [dragOverId,      setDragOverId]      = useState(null)
  const [dragCounters,    setDragCounters]    = useState({})
  const [showNewCard,     setShowNewCard]     = useState(false)
  const [showFilter,      setShowFilter]      = useState(false)
  const [filterTypeId,    setFilterTypeId]    = useState(null)
  const [contextMenu,     setContextMenu]     = useState(null) // { cardId, x, y }
  const [renamingCardId,  setRenamingCardId]  = useState(null)
  const [renameDraft,     setRenameDraft]     = useState('')
  const [sortBy,          setSortBy]          = useState('manual')
  const [confirmDelete,   setConfirmDelete]   = useState(null) // { type: 'card'|'folder', id, name }

  const allTypes = [...BUILTIN_TYPES.filter(b => !customTypes.some(c => c.id === b.id)), ...customTypes].filter(t => !t.virtual)
  const toggleFolder  = id => setExpandedFolders(prev => { const s=new Set(prev); s.has(id)?s.delete(id):s.add(id); return s })

  // Filter & search
  const matchesFilter = c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterTypeId && !isDescendantOf(c.typeId, filterTypeId, customTypes)) return false
    return true
  }

  // Sort
  const sortCards = (arr) => {
    if (sortBy === 'recent') return [...arr].sort((a,b) => (b.updatedAt||0)-(a.updatedAt||0))
    if (sortBy === 'oldest') return [...arr].sort((a,b) => (a.createdAt||0)-(b.createdAt||0))
    if (sortBy === 'alpha') return [...arr].sort((a,b) => a.name.localeCompare(b.name))
    return arr // manual = default order
  }

  // ── Drag & drop ─────────────────────────────────────────
  const handleCardDragStart = (e, cardId) => { e.dataTransfer.setData('text/cardId', cardId); e.dataTransfer.effectAllowed='move' }
  const handleDragEnter  = (e, id) => { e.preventDefault(); setDragCounters(p=>({...p,[id]:(p[id]||0)+1})); setDragOverId(id) }
  const handleDragLeave  = (e, id) => setDragCounters(p => { const n={...p,[id]:(p[id]||1)-1}; if(n[id]<=0) setDragOverId(c=>c===id?null:c); return n })
  const handleDragOver   = e => e.preventDefault()
  const handleDrop = (e, folderId) => {
    e.preventDefault()
    e.stopPropagation()
    const cardId = e.dataTransfer.getData('text/cardId')
    if (cardId) onUpdateCard(cardId, { folderId: folderId || null })
    setDragOverId(null); setDragCounters({})
  }

  // Auto-expand folders on drag hover
  const dragExpandTimerRef = useRef(null)
  const handleFolderDragEnter = (e, folderId) => {
    handleDragEnter(e, folderId)
    clearTimeout(dragExpandTimerRef.current)
    dragExpandTimerRef.current = setTimeout(() => {
      setExpandedFolders(prev => { const s = new Set(prev); s.add(folderId); return s })
    }, 600)
  }
  const handleFolderDragLeave = (e, folderId) => {
    handleDragLeave(e, folderId)
    clearTimeout(dragExpandTimerRef.current)
  }

  const renderCard = (card, depth=0) => {
    const type  = getType(card.typeId, customTypes)
    const isOpen = openCardIds.includes(card.id)
    const color  = type?.color || '#8a8a8a'
    const isRenaming = renamingCardId === card.id
    return (
      <div key={card.id}
        draggable={!isRenaming}
        onDragStart={e => handleCardDragStart(e, card.id)}
        onClick={() => { if (!isRenaming) onOpenCard(card.id, { toggle: true }) }}
        onContextMenu={e => { e.preventDefault(); setContextMenu({ cardId: card.id, x: e.clientX, y: e.clientY }) }}
        style={{
          display:'flex', alignItems:'center', gap:9,
          padding:`6px 10px 6px ${12+depth*14}px`,
          borderRadius:8, cursor:'pointer', marginBottom:2,
          background: isOpen ? 'var(--accent-10)' : 'transparent',
          borderLeft: isOpen ? `2px solid ${color}` : '2px solid transparent',
          transition:'all 0.12s',
        }}
        onMouseEnter={e => { if(!isOpen) e.currentTarget.style.background='rgba(255,255,255,0.05)'; const btn=e.currentTarget.querySelector('.card-more-btn'); if(btn) btn.style.opacity='1' }}
        onMouseLeave={e => { if(!isOpen) e.currentTarget.style.background='transparent'; const btn=e.currentTarget.querySelector('.card-more-btn'); if(btn) btn.style.opacity='0' }}
      >
        {card.image
          ? <img src={card.image} alt="" style={{ width:18,height:18,borderRadius:4,objectFit:'cover',flexShrink:0 }} />
          : <span style={{ fontSize:13,width:18,textAlign:'center',flexShrink:0,lineHeight:1 }}>{type?.icon||'📄'}</span>
        }
        {isRenaming ? (
          <input autoFocus value={renameDraft} onChange={e => setRenameDraft(e.target.value)}
            onClick={e => e.stopPropagation()}
            onBlur={() => { if (renameDraft.trim()) onUpdateCard(card.id, { name: renameDraft.trim() }); setRenamingCardId(null) }}
            onKeyDown={e => { if (e.key === 'Enter') { if (renameDraft.trim()) onUpdateCard(card.id, { name: renameDraft.trim() }); setRenamingCardId(null) }; if (e.key === 'Escape') setRenamingCardId(null) }}
            style={{ flex:1, background:'rgba(255,255,255,0.07)', border:'1px solid var(--accent-22)', borderRadius:4, padding:'1px 5px', color: 'var(--text-primary)', fontSize:12, outline:'none', minWidth:0 }}
          />
        ) : (
          <span style={{ flex:1, fontSize:12.5, color:isOpen?'var(--text-primary)':'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily: 'var(--font-body)', letterSpacing:'0.01em' }}>
            {card.pinned && <span style={{ marginRight:4, fontSize:10, opacity:0.5 }}>📌</span>}
            {card.name}
          </span>
        )}
        {isOpen && <div style={{ width:5,height:5,borderRadius:'50%',background:color,flexShrink:0,opacity:0.7 }} />}
        <button className="card-more-btn"
          onClick={e => { e.stopPropagation(); setContextMenu({ cardId: card.id, x: e.clientX, y: e.clientY }) }}
          style={{ opacity:0, background:'none', border:'none', color:'var(--text-dim,#5a5a5a)', cursor:'pointer', padding:'2px 4px', fontSize:14, lineHeight:1, flexShrink:0, transition:'opacity 0.1s' }}>
          ⋯
        </button>
      </div>
    )
  }

  const renderFolder = (folder, depth=0) => {
    const isExpanded = expandedFolders.has(folder.id)
    const isDragOver = dragOverId === folder.id
    const folderCards = sortCards(cards.filter(c=>c.folderId===folder.id&&!c.parentCardId&&matchesFilter(c)))
    const subFolders  = folders.filter(f=>f.parentFolderId===folder.id)
    return (
      <div key={folder.id}>
        <FolderRow
          folder={folder} depth={depth} isExpanded={isExpanded} isDragOver={isDragOver}
          onToggle={() => toggleFolder(folder.id)}
          onRename={name => onUpdateFolder(folder.id,{name})}
          onDelete={() => setConfirmDelete({ type:'folder', id:folder.id, name:folder.name })}
          onDragEnter={e=>handleFolderDragEnter(e,folder.id)} onDragLeave={e=>handleFolderDragLeave(e,folder.id)}
          onDragOver={handleDragOver} onDrop={e=>handleDrop(e,folder.id)}
        />
        {isExpanded && (
          <div>
            {subFolders.map(sf=>renderFolder(sf,depth+1))}
            {folderCards.map(c=>renderCard(c,depth+1))}
          </div>
        )}
      </div>
    )
  }

  const rootFolders = folders.filter(f=>!f.parentFolderId)
  const rootCards   = sortCards(cards.filter(c=>!c.folderId&&!c.parentCardId&&matchesFilter(c)))
  const hasActiveFilter = filterTypeId || sortBy !== 'manual'
  const filterBtnRef = useRef()
  const filterMenuRef = useRef()

  // Close context menu on scroll
  useEffect(() => {
    if (!contextMenu) return
    const h = () => setContextMenu(null)
    window.addEventListener('scroll', h, true)
    return () => window.removeEventListener('scroll', h, true)
  }, [contextMenu])

  // Close filter on outside click
  useEffect(() => {
    if (!showFilter) return
    const h = e => {
      if (filterBtnRef.current && filterBtnRef.current.contains(e.target)) return
      if (filterMenuRef.current && filterMenuRef.current.contains(e.target)) return
      setShowFilter(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [showFilter])

  // Compute filter menu position
  const [filterPos, setFilterPos] = useState({ top: 0, left: 0 })
  useEffect(() => {
    if (!showFilter || !filterBtnRef.current) return
    const rect = filterBtnRef.current.getBoundingClientRect()
    setFilterPos({ top: rect.bottom + 4, left: rect.left })
  }, [showFilter])

  return (
    <div style={{
      width:240, flexShrink:0, display:'flex', flexDirection:'column',
      background: 'var(--bg-overlay-50)',
      backdropFilter:'blur(40px) saturate(1.6)',
      WebkitBackdropFilter:'blur(40px) saturate(1.6)',
      borderRadius:16,
      border:'1px solid var(--border-09)',
    }}>

      {/* Header: search + filter + settings */}
      <div style={{ padding:'10px 10px 8px', display:'flex', gap:6, alignItems:'center' }}>
        <div style={{ position:'relative', flex:1 }}>
          <Icon name="search" size={11} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color: 'var(--text-darker)', pointerEvents:'none' }} />
          <input
            value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Rechercher…"
            style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, padding:'6px 8px 6px 26px', color: 'var(--text-secondary)', fontSize:12, outline:'none', boxSizing:'border-box', transition:'border-color 0.15s' }}
            onFocus={e=>e.target.style.borderColor='var(--accent-22)'}
            onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.07)'}
          />
        </div>
        {/* Filter button */}
        <div ref={filterBtnRef}>
          <button onClick={()=>setShowFilter(v=>!v)} title="Filtrer & Trier"
            style={{ padding:'6px 7px', borderRadius:7, border: hasActiveFilter ? '1px solid var(--accent-22)' : '1px solid transparent', background: hasActiveFilter ? 'var(--accent-10)' : 'rgba(255,255,255,0.04)', color: hasActiveFilter || showFilter ? 'var(--accent)' : 'var(--text-dark)', cursor:'pointer', transition:'color 0.12s', display:'flex', alignItems:'center', position:'relative' }}
            onMouseEnter={e=>{ if(!hasActiveFilter && !showFilter) e.currentTarget.style.color='var(--accent)' }} onMouseLeave={e=>{ if(!hasActiveFilter && !showFilter) e.currentTarget.style.color='var(--text-dark)' }}>
            <Icon name="filter" size={13} />
            {hasActiveFilter && <div style={{ position:'absolute', top:3, right:3, width:5, height:5, borderRadius:'50%', background: 'var(--accent)' }} />}
          </button>
        </div>
        {/* Settings */}
        <button onClick={onShowTypes} title="Types de cartes"
          style={{ padding:'6px 7px', borderRadius:7, border:showTypes?'1px solid var(--accent-22)':'1px solid transparent', background:showTypes?'var(--accent-10)':'rgba(255,255,255,0.04)', color:showTypes?'var(--accent)':'var(--text-dark)', cursor:'pointer', transition:'color 0.12s', display:'flex', alignItems:'center' }}
          onMouseEnter={e=>{ if(!showTypes) e.currentTarget.style.color='var(--accent)' }} onMouseLeave={e=>{ if(!showTypes) e.currentTarget.style.color='var(--text-dark)' }}>
          <Icon name="settings" size={13} />
        </button>
      </div>

      {/* Content tree */}
      <div
        style={{ flex:1, overflow:'auto', padding:'4px 8px' }}
        onDragEnter={e=>handleDragEnter(e,'root')}
        onDragLeave={e=>handleDragLeave(e,'root')}
        onDragOver={handleDragOver}
        onDrop={e=>handleDrop(e,null)}
      >
        {rootFolders.map(f=>renderFolder(f))}
        {rootCards.map(c=>renderCard(c))}

        {cards.length===0 && !search && (
          <div style={{ padding:'24px 12px', textAlign:'center' }}>
            <div style={{ fontSize:28, marginBottom:10, opacity:0.3 }}>📄</div>
            <p style={{ color: 'var(--text-darker)', fontSize:12, marginBottom:12 }}>Aucun document</p>
          </div>
        )}

        {/* Inline + Nouveau en bas de liste */}
        {!search && (
          <div
            onClick={() => setShowNewCard(true)}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', borderRadius:8, cursor:'pointer', color: 'var(--text-darker)', fontSize:12, marginTop:2, transition:'all 0.12s', fontFamily: 'var(--font-body)' }}
            onMouseEnter={e => { e.currentTarget.style.background='var(--accent-10)'; e.currentTarget.style.color='var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-darker)' }}
          >
            <span style={{ width:18, textAlign:'center', fontSize:16, lineHeight:1 }}>+</span>
            <span>Nouveau document</span>
          </div>
        )}
      </div>

      {/* New card popup */}
      {showNewCard && (
        <NewCardMenu allTypes={allTypes} onSelect={typeId=>{onCreateCard(typeId);setShowNewCard(false)}} onCreateFolder={onCreateFolder} onClose={()=>setShowNewCard(false)} />
      )}

      {/* Filter menu (portal to escape stacking context from backdropFilter) */}
      {showFilter && createPortal(
        <FilterMenu
          ref={filterMenuRef}
          style={{ position:'fixed', top:filterPos.top, left:filterPos.left }}
          allTypes={allTypes} customTypes={customTypes}
          filterTypeId={filterTypeId} setFilterTypeId={setFilterTypeId}
          sortBy={sortBy} setSortBy={setSortBy}
          onClose={()=>setShowFilter(false)}
        />,
        document.body
      )}

      {/* Card context menu (portal) */}
      {contextMenu && createPortal(
        <CardContextMenu
          x={contextMenu.x} y={contextMenu.y}
          card={cards.find(c => c.id === contextMenu.cardId)}
          onSelect={() => { onOpenCard(contextMenu.cardId); setContextMenu(null) }}
          onRename={() => { const card = cards.find(c => c.id === contextMenu.cardId); setRenamingCardId(contextMenu.cardId); setRenameDraft(card?.name || ''); setContextMenu(null) }}
          onPin={() => { const card = cards.find(c => c.id === contextMenu.cardId); onUpdateCard(contextMenu.cardId, { pinned: !card?.pinned }); setContextMenu(null) }}
          onDuplicate={() => { onDuplicateCard(contextMenu.cardId); setContextMenu(null) }}
          onDelete={() => { const card = cards.find(c => c.id === contextMenu.cardId); setConfirmDelete({ type:'card', id:contextMenu.cardId, name:card?.name || 'cette carte' }); setContextMenu(null) }}
          isPinned={cards.find(c => c.id === contextMenu.cardId)?.pinned}
          onClose={() => setContextMenu(null)}
        />,
        document.body
      )}

      {/* Delete confirmation modal (portal to fullscreen) */}
      {confirmDelete && createPortal(
        <ConfirmModal
          title={confirmDelete.type === 'folder' ? 'Supprimer ce dossier ?' : 'Supprimer cette carte ?'}
          message={`"${confirmDelete.name}" sera supprimé${confirmDelete.type === 'folder' ? '. Les cartes du dossier ne seront pas supprimées.' : ' définitivement.'}`}
          onConfirm={() => { if (confirmDelete.type === 'folder') onDeleteFolder(confirmDelete.id); else onDeleteCard(confirmDelete.id); setConfirmDelete(null) }}
          onCancel={() => setConfirmDelete(null)}
        />,
        document.body
      )}

      {/* Footer bar */}
      <div style={{ padding:'7px 8px', borderTop:'1px solid var(--border-06)', display:'flex', gap:4, alignItems:'center' }}>
        <FooterBtn icon="plus" tooltip="Nouveau" color={'var(--accent)'} filled onClick={()=>setShowNewCard(true)} />
      </div>
    </div>
  )
}

// ─── Footer button ───────────────────────────────────────────
function FooterBtn({ icon, emoji, tooltip, color, filled, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} title={tooltip}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        padding: emoji ? '4px 7px' : '6px 8px', borderRadius:8, border:'none',
        background: filled ? (hov ? 'var(--accent-15,rgba(200,160,100,0.15))' : 'var(--accent-10,rgba(200,160,100,0.08))') : (hov ? `${color}18` : 'rgba(255,255,255,0.03)'),
        color: hov ? color : 'var(--text-dark,#444444)',
        cursor:'pointer', transition:'all 0.12s', display:'flex', alignItems:'center', justifyContent:'center',
        fontSize: emoji ? 15 : 13, lineHeight:1,
      }}>
      {emoji ? <span>{emoji}</span> : <Icon name={icon} size={14} />}
    </button>
  )
}

// ─── FolderRow ──────────────────────────────────────────────
function FolderRow({ folder, depth, isExpanded, isDragOver, onToggle, onRename, onDelete, onDragEnter, onDragLeave, onDragOver, onDrop }) {
  const [renaming, setRenaming] = useState(false)
  const [draft,    setDraft]    = useState(folder.name)
  const [hovered,  setHovered]  = useState(false)
  useEffect(() => setDraft(folder.name), [folder.name])
  const commit = () => { if(draft.trim()&&draft.trim()!==folder.name) onRename(draft.trim()); else setDraft(folder.name); setRenaming(false) }
  return (
    <div
      onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop}
      onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      style={{ display:'flex', alignItems:'center', gap:7, padding:`6px 10px 6px ${12+depth*14}px`, borderRadius:8, marginBottom:2, cursor:'pointer', background:isDragOver?'rgba(200,160,100,0.1)':'rgba(255,255,255,0.02)', border:isDragOver?'1px dashed rgba(200,160,100,0.3)':'1px solid transparent', transition:'all 0.1s' }}
    >
      <span onClick={onToggle} style={{ display:'flex', alignItems:'center', gap:6, flex:1, overflow:'hidden' }}>
        <Icon name={isExpanded?'folder_open':'folder'} size={13} style={{ color:'var(--accent,#c8a064)', opacity:0.55, flexShrink:0 }} />
        {renaming
          ? <input autoFocus value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit}
              onKeyDown={e=>{if(e.key==='Enter')commit();if(e.key==='Escape'){setDraft(folder.name);setRenaming(false)}}}
              onClick={e=>e.stopPropagation()}
              style={{ flex:1, background:'rgba(255,255,255,0.07)', border:'1px solid var(--accent-22,rgba(200,160,100,0.35))', borderRadius:4, padding:'1px 5px', color:'var(--text-primary,#f0f0f0)', fontSize:12, outline:'none' }} />
          : <span onDoubleClick={e=>{e.stopPropagation();setRenaming(true)}} style={{ fontSize:12.5, color:'var(--text-muted,#8a8a8a)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:"var(--font-body)" }}>{folder.name}</span>
        }
      </span>
      <Icon name={isExpanded?'chevron_down':'chevron_right'} size={9} style={{ color:'var(--text-darker,#2e2e2e)', flexShrink:0 }} />
      {hovered && !renaming && (
        <div style={{ display:'flex', gap:1, flexShrink:0 }}>
          <button onClick={e=>{e.stopPropagation();setRenaming(true)}} style={{ background:'none',border:'none',color:'var(--text-dark,#444444)',cursor:'pointer',fontSize:10,padding:'1px 3px',lineHeight:1 }}>✎</button>
          <button onClick={e=>{e.stopPropagation();onDelete()}} style={{ background:'none',border:'none',color:'var(--text-dark,#444444)',cursor:'pointer',fontSize:10,padding:'1px 3px',lineHeight:1 }}>✕</button>
        </div>
      )}
    </div>
  )
}

// ─── Filter / Sort Menu ──────────────────────────────────────
const FilterMenu = React.forwardRef(function FilterMenu({ style: posStyle, allTypes, customTypes, filterTypeId, setFilterTypeId, sortBy, setSortBy, onClose }, ref) {
  const rootTypes = allTypes.filter(t => !t.parentId && !t.viewMode)
  const [expandedFilter, setExpandedFilter] = useState(null)

  const SORT_OPTIONS = [
    { id: 'manual', label: 'Ordre manuel' },
    { id: 'recent', label: 'Plus récents' },
    { id: 'oldest', label: 'Plus anciens' },
    { id: 'alpha', label: 'Alphabétique' },
  ]

  return (
    <div ref={ref} style={{
      zIndex:900,
      background:'rgba(10,6,1,0.92)', backdropFilter:'blur(40px) saturate(1.5)', WebkitBackdropFilter:'blur(40px) saturate(1.5)',
      border:'1px solid rgba(255,200,120,0.14)', borderRadius:14, overflow:'hidden',
      boxShadow:'0 8px 40px rgba(0,0,0,0.8)', width:220,
      ...posStyle,
    }}>
      {/* Filter by type */}
      <div style={{ padding:'10px 12px 6px' }}>
        <div style={{ fontSize:10, color:'var(--text-dark,#444444)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Filtrer par type</div>
        <FilterRow icon="📄" label="Tous" active={!filterTypeId} onClick={()=>{ setFilterTypeId(null) }} />
        {rootTypes.map(type => {
          const children = allTypes.filter(t => t.parentId === type.id)
          const isActive = filterTypeId === type.id
          const isExpanded = expandedFilter === type.id
          return (
            <div key={type.id}>
              <div style={{ display:'flex', alignItems:'center' }}>
                <div style={{ flex:1 }}>
                  <FilterRow icon={type.icon} label={type.name} color={type.color} active={isActive}
                    onClick={()=> setFilterTypeId(isActive ? null : type.id)} />
                </div>
                {children.length > 0 && (
                  <span onClick={() => setExpandedFilter(isExpanded ? null : type.id)}
                    style={{ display:'flex', alignItems:'center', justifyContent:'center', width:20, cursor:'pointer', color:'var(--text-dark,#444444)', flexShrink:0 }}>
                    <Icon name={isExpanded ? 'chevron_down' : 'chevron_right'} size={9} />
                  </span>
                )}
              </div>
              {isExpanded && children.map(child => {
                const childActive = filterTypeId === child.id
                return <FilterRow key={child.id} icon={child.icon} label={child.name} color={child.color} active={childActive} indent
                  onClick={() => setFilterTypeId(childActive ? null : child.id)} />
              })}
            </div>
          )
        })}
      </div>

      <div style={{ height:1, background:'rgba(255,255,255,0.05)', margin:'4px 12px' }} />

      {/* Sort */}
      <div style={{ padding:'6px 12px 10px' }}>
        <div style={{ fontSize:10, color:'var(--text-dark,#444444)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Trier par</div>
        {SORT_OPTIONS.map(opt => (
          <FilterRow key={opt.id} label={opt.label} active={sortBy === opt.id}
            dot={sortBy === opt.id}
            onClick={()=> setSortBy(opt.id)} />
        ))}
      </div>
    </div>
  )
})

function FilterRow({ icon, label, color, active, dot, indent, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <div onClick={onClick}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        display:'flex', alignItems:'center', gap:8, padding:`5px 8px 5px ${indent ? 24 : 8}px`, borderRadius:7,
        cursor:'pointer', fontSize: indent ? 11 : 12, transition:'background 0.08s',
        color: active ? 'var(--accent,#c8a064)' : 'var(--text-muted,#8a8a8a)',
        background: hov ? 'rgba(255,255,255,0.05)' : 'transparent',
      }}>
      {dot !== undefined && (
        <div style={{ width:6, height:6, borderRadius:'50%', background: active ? 'var(--accent,#c8a064)' : 'transparent', flexShrink:0 }} />
      )}
      {icon && <span style={{ fontSize: indent ? 11 : 13, width:18, textAlign:'center', flexShrink:0 }}>{icon}</span>}
      <span style={{ flex:1, fontFamily:"var(--font-body)" }}>{label}</span>
      {active && !dot && <Icon name="check" size={11} style={{ color:'var(--accent,#c8a064)', flexShrink:0 }} />}
    </div>
  )
}

// ─── CardContextMenu ─────────────────────────────────────────
function CardContextMenu({ x, y, card, onSelect, onRename, onPin, onDuplicate, onDelete, isPinned, onClose }) {
  const ref = useRef()
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  // Adjust position to stay in viewport
  const style = { position:'fixed', zIndex:950, top: y, left: x }
  useEffect(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    if (rect.bottom > window.innerHeight) ref.current.style.top = `${y - rect.height}px`
    if (rect.right > window.innerWidth) ref.current.style.left = `${x - rect.width}px`
  }, [x, y])

  if (!card) return null
  const items = [
    { icon: '📄', label: 'Sélectionner', action: onSelect },
    { icon: '✏️', label: 'Renommer', action: onRename },
    { icon: isPinned ? '📌' : '📌', label: isPinned ? 'Désépingler' : 'Épingler', action: onPin },
    { icon: '📋', label: 'Dupliquer', action: onDuplicate },
    { icon: '🗑', label: 'Supprimer', action: onDelete, danger: true },
  ]
  return (
    <div ref={ref} style={{ ...style, background:'rgba(10,6,1,0.92)', backdropFilter:'blur(40px) saturate(1.5)', WebkitBackdropFilter:'blur(40px) saturate(1.5)', border:'1px solid rgba(255,200,120,0.14)', borderRadius:12, overflow:'hidden', boxShadow:'0 8px 40px rgba(0,0,0,0.8)', width:180, padding:'4px 0' }}>
      {items.map((item, i) => (
        <ContextMenuItem key={i} icon={item.icon} label={item.label} danger={item.danger} onClick={item.action} />
      ))}
    </div>
  )
}

function ContextMenuItem({ icon, label, danger, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display:'flex', alignItems:'center', gap:9, padding:'7px 14px', cursor:'pointer',
        color: danger ? (hov ? '#ef4444' : '#a04030') : (hov ? '#f0f0f0' : '#8a8a8a'),
        background: hov ? 'rgba(255,255,255,0.05)' : 'transparent', transition:'all 0.08s',
        fontSize:12.5, fontFamily:"var(--font-body)",
      }}>
      <span style={{ fontSize:13, width:18, textAlign:'center', flexShrink:0 }}>{icon}</span>
      <span>{label}</span>
    </div>
  )
}

// ─── NewCardMenu ─────────────────────────────────────────────
function NewCardMenu({ allTypes, onSelect, onCreateFolder, onClose }) {
  const [expandedParent, setExpandedParent] = useState(null)
  const [folderMode, setFolderMode] = useState(false)
  const [folderName, setFolderName] = useState('')
  const ref = useRef()
  useEffect(() => {
    const h = e => { if(ref.current&&!ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown',h)
    return () => document.removeEventListener('mousedown',h)
  }, [onClose])
  const rootTypes = allTypes.filter(t=>!t.parentId)
  const SPECIAL_TYPES = [
    { id:'canvas', icon:'🎨', name:'Canvas', color:'#06b6d4' },
    { id:'family_tree', icon:'🌳', name:'Arbre Généalogique', color:'#a78bfa' },
    { id:'geo_map', icon:'🗺', name:'Carte Géographique', color:'#f59e0b' },
  ]
  const menuItemStyle = { flex:1, display:'flex', alignItems:'center', gap:9, padding:'8px 12px', cursor:'pointer', fontSize:13, color:'var(--text-secondary,#c0c0c0)', borderRadius:7, transition:'background 0.08s' }
  return (
    <div ref={ref} style={{ position:'absolute', bottom:52, left:8, right:8, zIndex:300, background:'rgba(10,6,1,0.85)', backdropFilter:'blur(40px) saturate(1.5)', WebkitBackdropFilter:'blur(40px) saturate(1.5)', border:'1px solid rgba(255,200,120,0.14)', borderRadius:14, overflow:'hidden', boxShadow:'0 -8px 40px rgba(0,0,0,0.8)' }}>
      <div style={{ padding:'9px 14px', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:11, color:'var(--text-dim,#5a5a5a)', textTransform:'uppercase', letterSpacing:'0.07em' }}>
        Nouveau document
      </div>
      <div style={{ maxHeight:320, overflowY:'auto', padding:'4px 6px' }}>
        {rootTypes.map(type => {
          const children = allTypes.filter(t=>t.parentId===type.id)
          const isExp = expandedParent===type.id
          return (
            <div key={type.id}>
              <div style={{ display:'flex', alignItems:'center', borderRadius:7, overflow:'hidden' }}>
                <div onClick={() => onSelect(type.id)} style={menuItemStyle}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <span style={{ width:18,textAlign:'center',fontSize:15 }}>{type.icon}</span>
                  <span style={{ fontFamily:"var(--font-body)" }}>{type.name}</span>
                </div>
                {children.length > 0 && (
                  <button onClick={e=>{e.stopPropagation();setExpandedParent(isExp?null:type.id)}}
                    style={{ background:'none',border:'none',color:'var(--text-dark,#444444)',cursor:'pointer',padding:'8px 10px',fontSize:10 }}>
                    <Icon name={isExp?'chevron_down':'chevron_right'} size={11} />
                  </button>
                )}
              </div>
              {isExp && children.map(child => (
                <div key={child.id} onClick={() => onSelect(child.id)}
                  style={{ display:'flex', alignItems:'center', gap:9, padding:'7px 12px 7px 28px', cursor:'pointer', fontSize:12, color:'var(--text-muted,#8a8a8a)', borderRadius:7 }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <span style={{ width:16,textAlign:'center',fontSize:13 }}>{child.icon}</span>
                  <span style={{ fontFamily:"var(--font-body)" }}>{child.name}</span>
                </div>
              ))}
            </div>
          )
        })}

        <div style={{ height:1, background:'rgba(255,255,255,0.05)', margin:'6px 6px' }} />

        {SPECIAL_TYPES.map(st => (
          <div key={st.id} onClick={() => onSelect(st.id)} style={menuItemStyle}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <span style={{ width:18,textAlign:'center',fontSize:15 }}>{st.icon}</span>
            <span style={{ fontFamily:"var(--font-body)" }}>{st.name}</span>
          </div>
        ))}

        <div style={{ height:1, background:'rgba(255,255,255,0.05)', margin:'6px 6px' }} />

        {folderMode ? (
          <div style={{ padding:'6px 12px' }}>
            <input autoFocus value={folderName} onChange={e=>setFolderName(e.target.value)}
              onKeyDown={e => { if(e.key==='Enter'&&folderName.trim()){onCreateFolder(folderName.trim());onClose()}; if(e.key==='Escape'){setFolderMode(false);setFolderName('')} }}
              onBlur={() => { if(folderName.trim()) { onCreateFolder(folderName.trim()); onClose() } else { setFolderMode(false) } }}
              placeholder="Nom du dossier…"
              style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(200,160,100,0.3)', borderRadius:6, padding:'6px 8px', color:'var(--text-primary,#f0f0f0)', fontSize:12, outline:'none', boxSizing:'border-box' }}
            />
          </div>
        ) : (
          <div onClick={() => setFolderMode(true)} style={menuItemStyle}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <span style={{ width:18,textAlign:'center',fontSize:15 }}><Icon name="folder" size={15} style={{ color:'var(--text-dim,#5a5a5a)' }} /></span>
            <span style={{ fontFamily:"var(--font-body)" }}>Dossier</span>
          </div>
        )}
      </div>
    </div>
  )
}

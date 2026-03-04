import React, { useState, useRef, useEffect } from 'react'
import { Icon } from './ui.jsx'
import { getType, BUILTIN_TYPES } from '../data/types.js'

export default function Sidebar({
  cards, folders, customTypes, openCardIds,
  onOpenCard, onCreateCard, onCreateFolder,
  onUpdateFolder, onDeleteFolder, onUpdateCard,
  onShowTypes, showTypes,
}) {
  const [search,          setSearch]          = useState('')
  const [expandedFolders, setExpandedFolders] = useState(new Set())
  const [dragOverId,      setDragOverId]      = useState(null)
  const [dragCounters,    setDragCounters]    = useState({})
  const [showNewCard,     setShowNewCard]     = useState(false)
  const [creatingFolder,  setCreatingFolder]  = useState(false)
  const [newFolderName,   setNewFolderName]   = useState('')

  const allTypes = [...BUILTIN_TYPES.filter(b => !customTypes.some(c => c.id === b.id)), ...customTypes].filter(t => !t.virtual)
  const matchesSearch = c => !search || c.name.toLowerCase().includes(search.toLowerCase())
  const toggleFolder  = id => setExpandedFolders(prev => { const s=new Set(prev); s.has(id)?s.delete(id):s.add(id); return s })

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
    const color  = type?.color || '#7a6a58'
    return (
      <div key={card.id}
        draggable
        onDragStart={e => handleCardDragStart(e, card.id)}
        onClick={() => onOpenCard(card.id)}
        style={{
          display:'flex', alignItems:'center', gap:9,
          padding:`6px 10px 6px ${12+depth*14}px`,
          borderRadius:8, cursor:'pointer', marginBottom:2,
          background: isOpen ? 'rgba(200,160,100,0.1)' : 'transparent',
          borderLeft: isOpen ? `2px solid ${color}` : '2px solid transparent',
          transition:'all 0.12s',
        }}
        onMouseEnter={e => { if(!isOpen) { e.currentTarget.style.background='rgba(255,255,255,0.05)' } }}
        onMouseLeave={e => { if(!isOpen) { e.currentTarget.style.background='transparent' } }}
      >
        {card.image
          ? <img src={card.image} alt="" style={{ width:18,height:18,borderRadius:4,objectFit:'cover',flexShrink:0 }} />
          : <span style={{ fontSize:13,width:18,textAlign:'center',flexShrink:0,lineHeight:1 }}>{type?.icon||'📄'}</span>
        }
        <span style={{ flex:1, fontSize:12.5, color:isOpen?'#f0e6d3':'#9a8a70', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:"'DM Sans',sans-serif", letterSpacing:'0.01em' }}>
          {card.name}
        </span>
        {isOpen && <div style={{ width:5,height:5,borderRadius:'50%',background:color,flexShrink:0,opacity:0.7 }} />}
      </div>
    )
  }

  const renderFolder = (folder, depth=0) => {
    const isExpanded = expandedFolders.has(folder.id)
    const isDragOver = dragOverId === folder.id
    const folderCards = cards.filter(c=>c.folderId===folder.id&&!c.parentCardId&&matchesSearch(c))
    const subFolders  = folders.filter(f=>f.parentFolderId===folder.id)
    return (
      <div key={folder.id}>
        <FolderRow
          folder={folder} depth={depth} isExpanded={isExpanded} isDragOver={isDragOver}
          onToggle={() => toggleFolder(folder.id)}
          onRename={name => onUpdateFolder(folder.id,{name})}
          onDelete={() => { if(confirm(`Supprimer "${folder.name}" ?`)) onDeleteFolder(folder.id) }}
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
  const rootCards   = cards.filter(c=>!c.folderId&&!c.parentCardId&&matchesSearch(c))

  return (
    <div style={{
      width:240, flexShrink:0, display:'flex', flexDirection:'column',
      background:'rgba(5,2,0,0.5)',
      backdropFilter:'blur(40px) saturate(1.6)',
      WebkitBackdropFilter:'blur(40px) saturate(1.6)',
      borderRadius:16,
      border:'1px solid rgba(255,200,120,0.09)',
    }}>

      {/* Header with search */}
      <div style={{ padding:'10px 10px 8px' }}>
        <div style={{ position:'relative' }}>
          <Icon name="search" size={11} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'#3a2a18', pointerEvents:'none' }} />
          <input
            value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Rechercher…"
            style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, padding:'6px 8px 6px 26px', color:'#c8b89a', fontSize:12, outline:'none', boxSizing:'border-box', transition:'border-color 0.15s' }}
            onFocus={e=>e.target.style.borderColor='rgba(200,160,100,0.3)'}
            onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.07)'}
          />
        </div>
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
            <p style={{ color:'#2a1a08', fontSize:12, marginBottom:12 }}>Aucun document</p>
          </div>
        )}

        {/* Inline + Nouveau en bas de liste */}
        {!search && (
          <div
            onClick={() => setShowNewCard(true)}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', borderRadius:8, cursor:'pointer', color:'#3a2a18', fontSize:12, marginTop:2, transition:'all 0.12s', fontFamily:"'DM Sans',sans-serif" }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(200,160,100,0.07)'; e.currentTarget.style.color='#c8a064' }}
            onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#3a2a18' }}
          >
            <span style={{ width:18, textAlign:'center', fontSize:16, lineHeight:1 }}>+</span>
            <span>Nouveau document</span>
          </div>
        )}
      </div>

      {/* New card popup */}
      {showNewCard && (
        <NewCardMenu allTypes={allTypes} onSelect={typeId=>{onCreateCard(typeId);setShowNewCard(false)}} onClose={()=>setShowNewCard(false)} />
      )}

      {/* Footer bar */}
      <div style={{ padding:'7px 8px', borderTop:'1px solid rgba(255,200,120,0.06)', display:'flex', gap:5 }}>
        {/* Create folder */}
        {creatingFolder ? (
          <input
            autoFocus value={newFolderName} onChange={e=>setNewFolderName(e.target.value)}
            onKeyDown={e => {
              if(e.key==='Enter'&&newFolderName.trim()){onCreateFolder(newFolderName.trim());setNewFolderName('');setCreatingFolder(false)}
              if(e.key==='Escape'){setNewFolderName('');setCreatingFolder(false)}
            }}
            onBlur={() => { if(newFolderName.trim()) onCreateFolder(newFolderName.trim()); setNewFolderName(''); setCreatingFolder(false) }}
            placeholder="Nom du dossier…"
            style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(200,160,100,0.3)', borderRadius:6, padding:'5px 8px', color:'#e2d9c8', fontSize:12, outline:'none' }}
          />
        ) : (
          <>
            <button onClick={()=>setShowNewCard(true)} title="Nouveau document"
              style={{ padding:'6px 9px', borderRadius:7, border:'none', background:'rgba(200,160,100,0.08)', color:'#c8a064', cursor:'pointer', transition:'background 0.12s' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(200,160,100,0.15)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(200,160,100,0.08)'}>
              <Icon name="card" size={14} />
            </button>
            <button onClick={()=>setCreatingFolder(true)} title="Nouveau dossier"
              style={{ padding:'6px 9px', borderRadius:7, border:'none', background:'rgba(255,255,255,0.04)', color:'#4a3a28', cursor:'pointer', transition:'color 0.12s' }}
              onMouseEnter={e=>e.currentTarget.style.color='#c8a064'} onMouseLeave={e=>e.currentTarget.style.color='#4a3a28'}>
              <Icon name="folder" size={13} />
            </button>
            <button onClick={onShowTypes} title="Card Types"
              style={{ padding:'6px 9px', borderRadius:7, border:showTypes?'1px solid rgba(200,160,100,0.3)':'1px solid transparent', background:showTypes?'rgba(200,160,100,0.1)':'rgba(255,255,255,0.04)', color:showTypes?'#c8a064':'#4a3a28', cursor:'pointer', transition:'color 0.12s' }}
              onMouseEnter={e=>{ if(!showTypes) e.currentTarget.style.color='#c8a064' }} onMouseLeave={e=>{ if(!showTypes) e.currentTarget.style.color='#4a3a28' }}>
              <Icon name="settings" size={13} />
            </button>
          </>
        )}
      </div>
    </div>
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
        <Icon name={isExpanded?'folder_open':'folder'} size={13} style={{ color:'#c8a064', opacity:0.55, flexShrink:0 }} />
        {renaming
          ? <input autoFocus value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit}
              onKeyDown={e=>{if(e.key==='Enter')commit();if(e.key==='Escape'){setDraft(folder.name);setRenaming(false)}}}
              onClick={e=>e.stopPropagation()}
              style={{ flex:1, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(200,160,100,0.35)', borderRadius:4, padding:'1px 5px', color:'#e2d9c8', fontSize:12, outline:'none' }} />
          : <span onDoubleClick={e=>{e.stopPropagation();setRenaming(true)}} style={{ fontSize:12.5, color:'#8a7a68', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:"'DM Sans',sans-serif" }}>{folder.name}</span>
        }
      </span>
      <Icon name={isExpanded?'chevron_down':'chevron_right'} size={9} style={{ color:'#3a2a18', flexShrink:0 }} />
      {hovered && !renaming && (
        <div style={{ display:'flex', gap:1, flexShrink:0 }}>
          <button onClick={e=>{e.stopPropagation();setRenaming(true)}} style={{ background:'none',border:'none',color:'#4a3a28',cursor:'pointer',fontSize:10,padding:'1px 3px',lineHeight:1 }}>✎</button>
          <button onClick={e=>{e.stopPropagation();onDelete()}} style={{ background:'none',border:'none',color:'#4a3a28',cursor:'pointer',fontSize:10,padding:'1px 3px',lineHeight:1 }}>✕</button>
        </div>
      )}
    </div>
  )
}

// ─── NewCardMenu ─────────────────────────────────────────────
function NewCardMenu({ allTypes, onSelect, onClose }) {
  const [expandedParent, setExpandedParent] = useState(null)
  const ref = useRef()
  useEffect(() => {
    const h = e => { if(ref.current&&!ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown',h)
    return () => document.removeEventListener('mousedown',h)
  }, [onClose])
  const rootTypes = allTypes.filter(t=>!t.parentId)
  return (
    <div ref={ref} style={{ position:'absolute', bottom:52, left:8, right:8, zIndex:300, background:'rgba(10,6,1,0.85)', backdropFilter:'blur(40px) saturate(1.5)', WebkitBackdropFilter:'blur(40px) saturate(1.5)', border:'1px solid rgba(255,200,120,0.14)', borderRadius:14, overflow:'hidden', boxShadow:'0 -8px 40px rgba(0,0,0,0.8)' }}>
      <div style={{ padding:'9px 14px', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:11, color:'#5a4a38', textTransform:'uppercase', letterSpacing:'0.07em' }}>
        Nouveau document
      </div>
      <div style={{ maxHeight:280, overflowY:'auto', padding:'4px 6px' }}>
        {rootTypes.map(type => {
          const children = allTypes.filter(t=>t.parentId===type.id)
          const isExp = expandedParent===type.id
          return (
            <div key={type.id}>
              <div style={{ display:'flex', alignItems:'center', borderRadius:7, overflow:'hidden' }}>
                <div onClick={() => onSelect(type.id)}
                  style={{ flex:1, display:'flex', alignItems:'center', gap:9, padding:'8px 12px', cursor:'pointer', fontSize:13, color:'#c8b89a', borderRadius:7, transition:'background 0.08s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <span style={{ width:18,textAlign:'center',fontSize:15 }}>{type.icon}</span>
                  <span style={{ fontFamily:"'DM Sans',sans-serif" }}>{type.name}</span>
                </div>
                {children.length > 0 && (
                  <button onClick={e=>{e.stopPropagation();setExpandedParent(isExp?null:type.id)}}
                    style={{ background:'none',border:'none',color:'#4a3a28',cursor:'pointer',padding:'8px 10px',fontSize:10 }}>
                    <Icon name={isExp?'chevron_down':'chevron_right'} size={11} />
                  </button>
                )}
              </div>
              {isExp && children.map(child => (
                <div key={child.id} onClick={() => onSelect(child.id)}
                  style={{ display:'flex', alignItems:'center', gap:9, padding:'7px 12px 7px 28px', cursor:'pointer', fontSize:12, color:'#9a8a70', borderRadius:7 }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <span style={{ width:16,textAlign:'center',fontSize:13 }}>{child.icon}</span>
                  <span style={{ fontFamily:"'DM Sans',sans-serif" }}>{child.name}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

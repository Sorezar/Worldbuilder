import React, { useState, useCallback } from 'react'
import { useStore, resolveTheme } from './store/useStore.js'
import { BUILTIN_TYPES } from './data/types.js'
import Sidebar from './components/Sidebar.jsx'
import CardWindow from './components/CardWindow.jsx'
import DraggableWindow from './components/DraggableWindow.jsx'
import HomeView from './views/HomeView.jsx'
import GraphView from './views/GraphView.jsx'
import TimelineView from './views/TimelineView.jsx'
import ChartsView from './views/ChartsView.jsx'
import CharactersView from './views/CharactersView.jsx'
import CardTypesView from './views/CardTypesView.jsx'
import CalendarsView from './views/CalendarsView.jsx'
import CanvasView from './views/CanvasView.jsx'
import FamilyTreeView from './views/FamilyTreeView.jsx'
import GeoMapView from './views/GeoMapView.jsx'
import { Icon } from './components/ui.jsx'

const MAX_OPEN = 4

const NAV = [
  { id:'home',       icon:'home',     label:'Accueil'      },
  { id:'mondes',     icon:'book',     label:'Mondes'       },
  { id:'documents',  icon:'list',     label:'Listes'       },
  { id:'graph',      icon:'graph',    label:'Relations'    },
  { id:'timeline',   icon:'timeline', label:'Timeline'     },
  { id:'charts',     icon:'chart',    label:'Statistiques' },
]

export default function App() {
  const store = useStore()
  const { world, setWorld, worlds, createWorld, deleteWorld, activeWorldId, setActiveWorldId,
          cards, createCard, updateCard, deleteCard, duplicateCard,
          customTypes, createCustomType, updateCustomType, deleteCustomType,
          folders, createFolder, updateFolder, deleteFolder,
          calendars, createCalendar, updateCalendar, deleteCalendar } = store

  const [openCardIds, setOpenCardIds] = useState(() => {
    try { const v = localStorage.getItem('wf_open_cards'); return v ? JSON.parse(v) : [] } catch { return [] }
  })
  const [activeView,  setActiveView]  = useState(() => {
    try { return localStorage.getItem('wf_active_view') || 'mondes' } catch { return 'mondes' }
  })
  const [showTypes,   setShowTypes]   = useState(false)
  const [showWorldSelector, setShowWorldSelector] = useState(false)
  const allTypes = [...BUILTIN_TYPES, ...customTypes]

  const openCard = useCallback((id, { toggle } = {}) => {
    setOpenCardIds(prev => {
      if (prev.includes(id)) {
        if (!toggle) return prev
        const result = prev.filter(x => x !== id)
        try { localStorage.setItem('wf_open_cards', JSON.stringify(result)) } catch {}
        return result
      }
      const next = [...prev, id]
      const result = next.length > MAX_OPEN ? next.slice(-MAX_OPEN) : next
      try { localStorage.setItem('wf_open_cards', JSON.stringify(result)) } catch {}
      return result
    })
    setActiveView('mondes')
  }, [])

  const closeCard = useCallback(id => {
    setOpenCardIds(prev => {
      const next = prev.filter(x => x !== id)
      try { localStorage.setItem('wf_open_cards', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const handleCreate = useCallback(typeId => {
    const card = createCard(typeId)
    openCard(card.id)
    return card
  }, [createCard, openCard])

  // Preserve open cards when switching tabs
  const handleSetView = useCallback(v => {
    setActiveView(v)
    try { localStorage.setItem('wf_active_view', v) } catch {}
  }, [])

  const handleUpdateType = useCallback((typeId, patch) => {
    const isBuiltin = BUILTIN_TYPES.some(t => t.id === typeId)
    if (!isBuiltin) { updateCustomType(typeId, patch); return }
    const shadow = customTypes.find(t => t.id === typeId)
    if (shadow) updateCustomType(typeId, patch)
    else createCustomType({ ...BUILTIN_TYPES.find(t => t.id === typeId), ...patch })
  }, [customTypes, updateCustomType, createCustomType])

  const handleSwitchWorld = useCallback((worldId) => {
    setActiveWorldId(worldId)
    setOpenCardIds([])
    try { localStorage.setItem('wf_open_cards', '[]') } catch {}
    setShowWorldSelector(false)
  }, [setActiveWorldId])

  const bg = world.bgImage
  const inMondes = activeView === 'mondes'
  const { vars: themeVars, derived, isDark, bgBrightness } = resolveTheme(world)

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden', position:'relative', ...themeVars }}>
      {bg ? (
        <>
          <div style={{ position:'fixed', inset:0, zIndex:0, backgroundImage:`url(${bg})`, backgroundSize:'cover', backgroundPosition:'center', filter:`blur(8px) brightness(${bgBrightness})`, transform:'scale(1.08)' }} />
          <div style={{ position:'fixed', inset:0, zIndex:0, background: derived.bgBase + (isDark ? '0.35)' : '0.15)') }} />
        </>
      ) : (
        <div style={{ position:'fixed', inset:0, zIndex:0, background: isDark ? derived.defaultBg : `linear-gradient(145deg, rgba(40,35,28,0.9), rgba(25,22,18,0.95))` }} />
      )}

      <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', height:'100vh', padding:8, gap:8 }}>
        <TopBar world={world} activeView={activeView} onSetView={handleSetView} cardCount={cards.length}
          onWorldSelect={() => setShowWorldSelector(true)} />

        <div style={{ flex:1, display:'flex', overflow:'hidden', gap:8 }}>
          <div style={{ display: inMondes ? 'flex' : 'none', flexShrink: 0 }}>
            <Sidebar cards={cards} folders={folders} customTypes={customTypes} openCardIds={openCardIds}
              onOpenCard={openCard} onCreateCard={handleCreate}
              onCreateFolder={createFolder} onUpdateFolder={updateFolder} onDeleteFolder={deleteFolder}
              onUpdateCard={updateCard} onDeleteCard={deleteCard} onDuplicateCard={duplicateCard}
              onShowTypes={() => setShowTypes(v => !v)} showTypes={showTypes}
            />
          </div>

          <div style={{ flex:1, display:'flex', overflow:'hidden', minWidth:0, gap:8 }}>
            <div style={{ flex:1, display: activeView==='home' ? 'flex' : 'none', overflow:'hidden', minWidth:0 }}>
              <HomeView world={world} setWorld={setWorld} cards={cards} customTypes={customTypes} onOpenCard={openCard} onCreateCard={handleCreate} onShowTypes={() => setShowTypes(true)} />
            </div>
            <div style={{ flex:1, display: activeView==='documents' ? 'flex' : 'none', overflow:'hidden', minWidth:0 }}>
              <CharactersView cards={cards} customTypes={customTypes} onOpenCard={openCard} onCreateCard={handleCreate} />
            </div>
            <div style={{ flex:1, display: activeView==='graph' ? 'flex' : 'none', overflow:'hidden', minWidth:0 }}>
              <GraphView cards={cards} customTypes={customTypes} onOpenCard={openCard} />
            </div>
            <div style={{ flex:1, display: activeView==='timeline' ? 'flex' : 'none', overflow:'hidden', minWidth:0 }}>
              <TimelineView cards={cards} customTypes={customTypes} calendars={calendars} onOpenCard={openCard} />
            </div>
            <div style={{ flex:1, display: activeView==='charts' ? 'flex' : 'none', overflow:'hidden', minWidth:0 }}>
              <ChartsView cards={cards} customTypes={customTypes} />
            </div>

            {inMondes && (
              openCardIds.length === 0
                ? <MondesHome world={world} setWorld={setWorld} cards={cards} allTypes={allTypes}
                    calendars={calendars} createCalendar={createCalendar} updateCalendar={updateCalendar} deleteCalendar={deleteCalendar}
                    onOpenCard={openCard} onCreateCard={handleCreate} />
                : <div style={{ flex:1, display:'flex', overflow:'hidden', minWidth:0, gap:8 }}>
                    {openCardIds.map((cid) => {
                      const card = cards.find(c => c.id === cid)
                      if (!card) return null
                      const cardType = allTypes.find(t => t.id === card.typeId)
                      const containerStyle = { flex:1, minWidth:300, height:'100%', overflow:'hidden', background: 'var(--bg-panel-55)', backdropFilter:'blur(40px) saturate(1.4)', WebkitBackdropFilter:'blur(40px) saturate(1.4)', borderRadius:16, border:'1px solid var(--border-10)' }
                      const commonProps = { card, cards, customTypes, allTypes, onUpdate: updateCard, onDelete: id => { deleteCard(id); closeCard(id) }, onClose: () => closeCard(cid), onOpenCard: openCard, onCreateCard: handleCreate }
                      if (cardType?.viewMode === 'canvas') return <div key={cid} style={containerStyle}><CanvasView {...commonProps} /></div>
                      if (cardType?.viewMode === 'family_tree') return <div key={cid} style={containerStyle}><FamilyTreeView {...commonProps} /></div>
                      if (cardType?.viewMode === 'map') return <div key={cid} style={containerStyle}><GeoMapView {...commonProps} /></div>
                      return (
                        <div key={cid} style={containerStyle}>
                          <CardWindow card={card} cards={cards} customTypes={customTypes} allTypes={allTypes} calendars={calendars}
                            onUpdate={updateCard} onDelete={id => { deleteCard(id); closeCard(id) }}
                            onClose={() => closeCard(cid)} onOpenCard={openCard} onCreateCard={handleCreate}
                          />
                        </div>
                      )
                    })}
                  </div>
            )}
          </div>
        </div>
      </div>

      {showTypes && (
        <DraggableWindow title="Card Types" icon="⚙️" onClose={() => setShowTypes(false)} initialX={100} initialY={54} initialW={900} initialH={580}>
          <CardTypesView customTypes={customTypes} onUpdateType={handleUpdateType} onCreateCustomType={createCustomType} onDeleteType={deleteCustomType} />
        </DraggableWindow>
      )}

      {showWorldSelector && (
        <WorldSelector worlds={worlds} activeWorldId={activeWorldId}
          onSelect={handleSwitchWorld} onClose={() => setShowWorldSelector(false)}
          onCreate={createWorld} onDelete={deleteWorld} />
      )}
    </div>
  )
}

// ─── World Selector ──────────────────────────────────────────
function WorldSelector({ worlds, activeWorldId, onSelect, onClose, onCreate, onDelete }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const worldToDelete = confirmDeleteId ? worlds.find(w => w.id === confirmDeleteId) : null

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position:'fixed', inset:0, zIndex:900, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(20px)', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:24 }}>
      <div style={{ fontSize:32, opacity:0.4 }}>✦</div>
      <div style={{ display:'flex', flexDirection:'column', gap:10, width:360 }}>
        {worlds.map(w => (
          <div key={w.id} onClick={() => onSelect(w.id)}
            style={{
              display:'flex', alignItems:'center', gap:14, padding:'16px 20px', borderRadius:14, cursor:'pointer',
              background: w.id === activeWorldId ? 'var(--accent-10,rgba(200,160,100,0.12))' : 'rgba(255,255,255,0.04)',
              border: w.id === activeWorldId ? '1px solid var(--accent-22,rgba(200,160,100,0.25))' : '1px solid rgba(255,255,255,0.08)',
              transition:'all 0.12s',
            }}
            onMouseEnter={e => { if (w.id !== activeWorldId) e.currentTarget.style.background='rgba(255,255,255,0.07)' }}
            onMouseLeave={e => { if (w.id !== activeWorldId) e.currentTarget.style.background='rgba(255,255,255,0.04)' }}>
            {w.bgImage
              ? <img src={w.bgImage} alt="" style={{ width:40, height:40, borderRadius:8, objectFit:'cover' }} />
              : <div style={{ width:40, height:40, borderRadius:8, background:'var(--accent-15,rgba(200,160,100,0.15))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>✦</div>
            }
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:15, fontWeight:600, color:'var(--text-primary,#f0f0f0)', fontFamily:"var(--font)" }}>{w.name}</div>
              <div style={{ fontSize:11, color:'var(--text-dim,#5a5a5a)', marginTop:2 }}>{w.id === activeWorldId ? 'Monde actif' : ''}</div>
            </div>
            {worlds.length > 1 && (
              <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(w.id) }}
                style={{ background:'none', border:'none', color:'var(--text-darker,#2e2e2e)', cursor:'pointer', padding:4 }}
                onMouseEnter={e => e.currentTarget.style.color='#e05040'} onMouseLeave={e => e.currentTarget.style.color='var(--text-darker,#2e2e2e)'}>
                <Icon name="trash" size={13} />
              </button>
            )}
          </div>
        ))}
      </div>
      <button onClick={() => { const w = onCreate(); onSelect(w.id) }}
        style={{
          display:'flex', alignItems:'center', gap:8, padding:'12px 24px', borderRadius:12,
          background:'var(--accent-10,rgba(200,160,100,0.1))', border:'1px solid var(--accent-22,rgba(200,160,100,0.2))',
          color:'var(--accent,#c8a064)', fontSize:13, cursor:'pointer', transition:'all 0.12s',
        }}
        onMouseEnter={e => e.currentTarget.style.background='var(--accent-15,rgba(200,160,100,0.2))'}
        onMouseLeave={e => e.currentTarget.style.background='var(--accent-10,rgba(200,160,100,0.1))'}>
        <Icon name="plus" size={14} /> Créer un nouveau monde
      </button>

      {/* Delete confirmation modal */}
      {worldToDelete && (
        <div onClick={e => e.stopPropagation()} style={{
          position:'fixed', inset:0, zIndex:910, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <div style={{ background:'rgba(12,8,2,0.95)', backdropFilter:'blur(40px)', border:'1px solid rgba(255,200,120,0.14)', borderRadius:16, padding:'28px 32px', width:340, boxShadow:'0 16px 48px rgba(0,0,0,0.7)' }}>
            <div style={{ fontSize:15, fontWeight:600, color:'var(--text-primary,#f0f0f0)', marginBottom:10, fontFamily:'var(--font)' }}>Supprimer ce monde ?</div>
            <p style={{ fontSize:13, color:'var(--text-dim,#5a5a5a)', lineHeight:1.5, marginBottom:20 }}>
              Le monde <strong style={{ color:'var(--text-secondary,#c0c0c0)' }}>"{worldToDelete.name}"</strong> et toutes ses données seront supprimés. Cette action est irréversible.
            </p>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={() => setConfirmDeleteId(null)}
                style={{ padding:'8px 16px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)', color:'var(--text-muted,#8a8a8a)', fontSize:12, cursor:'pointer' }}>
                Annuler
              </button>
              <button onClick={() => { onDelete(confirmDeleteId); setConfirmDeleteId(null) }}
                style={{ padding:'8px 16px', borderRadius:8, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.12)', color:'#ef4444', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MondesHome({ world, setWorld, cards, allTypes, calendars, createCalendar, updateCalendar, deleteCalendar, onOpenCard, onCreateCard }) {
  const [showCal, setShowCal] = useState(false)
  const recent = [...cards].sort((a,b) => (b.updatedAt||0)-(a.updatedAt||0)).slice(0,8)
  return (
    <div style={{ flex:1, overflow:'auto', padding:'32px 40px', background: 'var(--bg-panel-55)', backdropFilter:'blur(40px) saturate(1.4)', WebkitBackdropFilter:'blur(40px) saturate(1.4)', borderRadius:16, border:'1px solid var(--border-09)' }}>
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font)', fontSize:26, color: 'var(--text-primary)', fontWeight:500, margin:0 }}>{world.name}</h1>
          <p style={{ color: 'var(--text-dark)', fontSize:13, marginTop:6 }}>{cards.length} document{cards.length!==1?'s':''} · {calendars.length} calendrier{calendars.length!==1?'s':''}</p>
        </div>
        <button onClick={() => setShowCal(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 13px', borderRadius:8, border:'1px solid var(--border-15)', background:'rgba(255,255,255,0.03)', color: 'var(--text-muted)', fontSize:12, cursor:'pointer', transition:'color 0.1s' }}
          onMouseEnter={e => e.currentTarget.style.color='var(--accent)'} onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}>
          📅 Calendriers
        </button>
      </div>

      {recent.length > 0 ? (
        <div>
          <h3 style={{ fontFamily: 'var(--font)', fontSize:14, color: 'var(--text-dim)', marginBottom:14, fontWeight:400, textTransform:'uppercase', letterSpacing:'0.08em' }}>Récents</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
            {recent.map(card => {
              const type = allTypes.find(t => t.id===card.typeId)
              return (
                <div key={card.id} onClick={() => onOpenCard(card.id)}
                  style={{ padding:'12px 14px', borderRadius:10, border:'1px solid var(--border-09)', background:'rgba(255,255,255,0.02)', cursor:'pointer', transition:'all 0.12s' }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor='var(--border-15)' }}
                  onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor='var(--border-09)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    {card.image ? <img src={card.image} alt="" style={{ width:22, height:22, borderRadius:5, objectFit:'cover' }} /> : <span style={{ fontSize:18 }}>{type?.icon||'📄'}</span>}
                    <span style={{ fontSize:10, color:type?.color||'var(--text-muted)', background:(type?.color||'#5a5040')+'18', padding:'1px 5px', borderRadius:3 }}>{type?.name||'Doc'}</span>
                  </div>
                  <div style={{ fontSize:13, color: 'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{card.name}</div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={{ textAlign:'center', paddingTop:60, color: 'var(--text-darker)' }}>
          <div style={{ fontSize:40, marginBottom:16 }}>✦</div>
          <p style={{ fontSize:16, marginBottom:8 }}>Bienvenue dans votre monde</p>
          <p style={{ fontSize:13 }}>Créez votre premier document avec le bouton + dans la sidebar</p>
        </div>
      )}

      {showCal && <CalendarsView calendars={calendars} onCreate={createCalendar} onUpdate={updateCalendar} onDelete={deleteCalendar} onClose={() => setShowCal(false)} />}
    </div>
  )
}

function TopBar({ world, activeView, onSetView, cardCount, onWorldSelect }) {
  const pillStyle = { height:36, display:'flex', alignItems:'center', background: 'var(--bg-base-50)', backdropFilter:'blur(40px) saturate(1.6)', WebkitBackdropFilter:'blur(40px) saturate(1.6)', borderRadius:12, border:'1px solid var(--border-09)' }
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, gap:12 }}>
      <div onClick={onWorldSelect} style={{ ...pillStyle, gap:8, padding:'0 14px', cursor:'pointer', flexShrink:0 }}
        title="Changer de monde">
        <div style={{ width:22, height:22, borderRadius:7, background:`linear-gradient(135deg,var(--accent)55,var(--accent)18)`, border:`1px solid var(--accent)28`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10 }}>✦</div>
        <span style={{ fontFamily: 'var(--font)', fontSize:12, fontWeight:600, color: 'var(--text-secondary)' }}>{world.name||'Mon Monde'}</span>
      </div>
      <div style={{ ...pillStyle, gap:1, padding:'0 4px' }}>
        {NAV.map(n => {
          const active = activeView===n.id
          return (
            <button key={n.id} onClick={() => onSetView(n.id)} style={{ display:'flex', alignItems:'center', gap:5, padding: active ? '5px 12px' : '5px 9px', borderRadius:9, border:'none', background: active ? 'var(--accent-18)' : 'transparent', color: active ? 'var(--accent)' : 'rgba(255,255,255,0.7)', fontSize:12, cursor:'pointer', transition:'all 0.15s' }}
              onMouseEnter={e => { if(!active) e.currentTarget.style.color='rgba(255,255,255,0.95)' }}
              onMouseLeave={e => { if(!active) e.currentTarget.style.color='rgba(255,255,255,0.7)' }}>
              <Icon name={n.icon} size={13} />
              {active && <span style={{ fontFamily: 'var(--font-body)' }}>{n.label}</span>}
            </button>
          )
        })}
      </div>
      <div style={{ ...pillStyle, padding:'0 14px', flexShrink:0 }}>
        <span style={{ fontSize:11, color: 'var(--text-darker)' }}>{cardCount} doc{cardCount!==1?'s':''}</span>
      </div>
    </div>
  )
}

import React, { useState, useCallback } from 'react'
import { useStore } from './store/useStore.js'
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
import { Icon } from './components/ui.jsx'

const MAX_OPEN = 4

const NAV = [
  { id:'mondes',     icon:'book',     label:'Mondes'    },
  { id:'home',       icon:'home',     label:'Accueil'   },
  { id:'documents',  icon:'list',     label:'Documents' },
  { id:'graph',      icon:'graph',    label:'Graphe'    },
  { id:'timeline',   icon:'timeline', label:'Timeline'  },
  { id:'charts',     icon:'chart',    label:'Stats'     },
]

export default function App() {
  const { world, setWorld, cards, createCard, updateCard, deleteCard,
          customTypes, createCustomType, updateCustomType, deleteCustomType,
          folders, createFolder, updateFolder, deleteFolder,
          calendars, createCalendar, updateCalendar, deleteCalendar } = useStore()

  const [openCardIds, setOpenCardIds] = useState([])
  const [activeView,  setActiveView]  = useState('mondes')
  const [showTypes,   setShowTypes]   = useState(false)
  const allTypes = [...BUILTIN_TYPES, ...customTypes]

  const openCard = useCallback(id => {
    setOpenCardIds(prev => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      return next.length > MAX_OPEN ? next.slice(-MAX_OPEN) : next
    })
    setActiveView('mondes')
  }, [])

  const closeCard = useCallback(id => {
    setOpenCardIds(prev => prev.filter(x => x !== id))
  }, [])

  const handleCreate = useCallback(typeId => {
    const card = createCard(typeId)
    openCard(card.id)
    return card
  }, [createCard, openCard])

  const handleSetView = useCallback(v => {
    setActiveView(v)
    if (v !== 'mondes') setOpenCardIds([])
  }, [])

  const handleUpdateType = useCallback((typeId, patch) => {
    const isBuiltin = BUILTIN_TYPES.some(t => t.id === typeId)
    if (!isBuiltin) { updateCustomType(typeId, patch); return }
    const shadow = customTypes.find(t => t.id === typeId)
    if (shadow) updateCustomType(typeId, patch)
    else createCustomType({ ...BUILTIN_TYPES.find(t => t.id === typeId), ...patch })
  }, [customTypes, updateCustomType, createCustomType])

  const bg = world.bgImage
  const inMondes = activeView === 'mondes'

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
      {bg ? (
        <>
          <div style={{ position:'fixed', inset:0, zIndex:0, backgroundImage:`url(${bg})`, backgroundSize:'cover', backgroundPosition:'center', filter:'blur(4px) brightness(0.55)', transform:'scale(1.05)' }} />
          <div style={{ position:'fixed', inset:0, zIndex:0, background:'rgba(6,3,0,0.45)' }} />
        </>
      ) : (
        <div style={{ position:'fixed', inset:0, zIndex:0, background:'linear-gradient(145deg,#1c1408,#0e0b06)' }} />
      )}

      <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', height:'100vh' }}>
        <TopBar world={world} activeView={activeView} onSetView={handleSetView} cardCount={cards.length} />

        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
          {inMondes && (
            <Sidebar cards={cards} folders={folders} customTypes={customTypes} openCardIds={openCardIds}
              onOpenCard={openCard} onCreateCard={handleCreate}
              onCreateFolder={createFolder} onUpdateFolder={updateFolder} onDeleteFolder={deleteFolder}
              onUpdateCard={updateCard} onShowTypes={() => setShowTypes(v => !v)} showTypes={showTypes}
            />
          )}

          <div style={{ flex:1, display:'flex', overflow:'hidden', minWidth:0 }}>
            {activeView==='home'      && <HomeView world={world} setWorld={setWorld} cards={cards} customTypes={customTypes} onOpenCard={openCard} onCreateCard={handleCreate} />}
            {activeView==='documents' && <CharactersView cards={cards} customTypes={customTypes} onOpenCard={openCard} onCreateCard={handleCreate} />}
            {activeView==='graph'    && <GraphView    cards={cards} customTypes={customTypes} onOpenCard={openCard} />}
            {activeView==='timeline' && <TimelineView cards={cards} customTypes={customTypes} calendars={calendars} onOpenCard={openCard} />}
            {activeView==='charts'   && <ChartsView   cards={cards} customTypes={customTypes} />}

            {inMondes && (
              openCardIds.length === 0
                ? <MondesHome world={world} setWorld={setWorld} cards={cards} allTypes={allTypes}
                    calendars={calendars} createCalendar={createCalendar} updateCalendar={updateCalendar} deleteCalendar={deleteCalendar}
                    onOpenCard={openCard} onCreateCard={handleCreate} />
                : <div style={{ flex:1, display:'flex', overflow:'hidden', minWidth:0 }}>
                    {openCardIds.map((cid, i) => {
                      const card = cards.find(c => c.id === cid)
                      if (!card) return null
                      return (
                        <div key={cid} style={{ flex:1, minWidth:300, maxWidth: openCardIds.length===1 ? '100%' : 560, borderLeft: i>0 ? '1px solid rgba(255,200,120,0.08)' : 'none', height:'100%', overflow:'hidden', background:'rgba(10,6,1,0.55)', backdropFilter:'blur(32px) saturate(1.4)' }}>
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
    </div>
  )
}

function MondesHome({ world, setWorld, cards, allTypes, calendars, createCalendar, updateCalendar, deleteCalendar, onOpenCard, onCreateCard }) {
  const [showCal, setShowCal] = useState(false)
  const recent = [...cards].sort((a,b) => (b.updatedAt||0)-(a.updatedAt||0)).slice(0,8)
  return (
    <div style={{ flex:1, overflow:'auto', padding:'32px 40px' }}>
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <h1 style={{ fontFamily:"'Lora',serif", fontSize:26, color:'#f0e6d3', fontWeight:500, margin:0 }}>{world.name}</h1>
          <p style={{ color:'#4a3a28', fontSize:13, marginTop:6 }}>{cards.length} document{cards.length!==1?'s':''} · {calendars.length} calendrier{calendars.length!==1?'s':''}</p>
        </div>
        <button onClick={() => setShowCal(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 13px', borderRadius:8, border:'1px solid rgba(255,200,120,0.15)', background:'rgba(255,255,255,0.03)', color:'#7a6a58', fontSize:12, cursor:'pointer', transition:'color 0.1s' }}
          onMouseEnter={e => e.currentTarget.style.color='#c8a064'} onMouseLeave={e => e.currentTarget.style.color='#7a6a58'}>
          📅 Calendriers
        </button>
      </div>

      {recent.length > 0 ? (
        <div>
          <h3 style={{ fontFamily:"'Lora',serif", fontSize:14, color:'#5a4a38', marginBottom:14, fontWeight:400, textTransform:'uppercase', letterSpacing:'0.08em' }}>Récents</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
            {recent.map(card => {
              const type = allTypes.find(t => t.id===card.typeId)
              return (
                <div key={card.id} onClick={() => onOpenCard(card.id)}
                  style={{ padding:'12px 14px', borderRadius:10, border:'1px solid rgba(255,200,120,0.08)', background:'rgba(255,255,255,0.02)', cursor:'pointer', transition:'all 0.12s' }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor='rgba(255,200,120,0.18)' }}
                  onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor='rgba(255,200,120,0.08)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    {card.image ? <img src={card.image} alt="" style={{ width:22, height:22, borderRadius:5, objectFit:'cover' }} /> : <span style={{ fontSize:18 }}>{type?.icon||'📄'}</span>}
                    <span style={{ fontSize:10, color:type?.color||'#7a6a58', background:(type?.color||'#5a5040')+'18', padding:'1px 5px', borderRadius:3 }}>{type?.name||'Doc'}</span>
                  </div>
                  <div style={{ fontSize:13, color:'#c8b89a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{card.name}</div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={{ textAlign:'center', paddingTop:60, color:'#3a2a18' }}>
          <div style={{ fontSize:40, marginBottom:16 }}>✦</div>
          <p style={{ fontSize:16, marginBottom:8 }}>Bienvenue dans votre monde</p>
          <p style={{ fontSize:13 }}>Créez votre premier document avec le bouton + dans la sidebar</p>
        </div>
      )}

      {showCal && <CalendarsView calendars={calendars} onCreate={createCalendar} onUpdate={updateCalendar} onDelete={deleteCalendar} onClose={() => setShowCal(false)} />}
    </div>
  )
}

function TopBar({ world, activeView, onSetView, cardCount }) {
  return (
    <div style={{ height:46, display:'flex', alignItems:'center', padding:'0 16px', background:'rgba(8,4,0,0.72)', backdropFilter:'blur(28px)', borderBottom:'1px solid rgba(255,200,120,0.07)', flexShrink:0, position:'relative' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        <div style={{ width:24, height:24, borderRadius:6, background:`linear-gradient(135deg,${world.accentColor||'#c8a064'}55,${world.accentColor||'#c8a064'}18)`, border:`1px solid ${world.accentColor||'#c8a064'}28`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11 }}>✦</div>
        <span style={{ fontFamily:"'Lora',serif", fontSize:13, fontWeight:600, color:'#b8a88a' }}>{world.name||'Mon Monde'}</span>
      </div>
      <div style={{ position:'absolute', left:'50%', transform:'translateX(-50%)', display:'flex', gap:1, background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'3px 4px', border:'1px solid rgba(255,255,255,0.06)' }}>
        {NAV.map(n => {
          const active = activeView===n.id
          return (
            <button key={n.id} onClick={() => onSetView(n.id)} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 11px', borderRadius:7, border:'none', background: active ? 'rgba(200,160,100,0.18)' : 'transparent', color: active ? '#c8a064' : '#4a3a28', fontSize:12, cursor:'pointer', transition:'all 0.12s' }}
              onMouseEnter={e => { if(!active) e.currentTarget.style.color='#8a7a68' }}
              onMouseLeave={e => { if(!active) e.currentTarget.style.color='#4a3a28' }}>
              <Icon name={n.icon} size={12} />
              <span style={{ fontFamily:"'DM Sans',sans-serif" }}>{n.label}</span>
            </button>
          )
        })}
      </div>
      <div style={{ marginLeft:'auto' }}>
        <span style={{ fontSize:11, color:'#3a2a18' }}>{cardCount} doc{cardCount!==1?'s':''}</span>
      </div>
    </div>
  )
}

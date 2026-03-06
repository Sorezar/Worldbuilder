import React, { useState, useCallback } from 'react'
import { useStore, THEMES, TITLE_FONTS, BODY_FONTS } from './store/useStore.js'
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

  const [openCardIds, setOpenCardIds] = useState([])
  const [activeView,  setActiveView]  = useState('mondes')
  const [showTypes,   setShowTypes]   = useState(false)
  const [showWorldSelector, setShowWorldSelector] = useState(false)
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

  // Preserve open cards when switching tabs
  const handleSetView = useCallback(v => {
    setActiveView(v)
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
    setShowWorldSelector(false)
  }, [setActiveWorldId])

  const bg = world.bgImage
  const inMondes = activeView === 'mondes'
  const theme = THEMES[world.theme || 'warm'] || THEMES.warm

  // Resolve fonts with world overrides
  const fontTitle = TITLE_FONTS.find(f => f.id === world.fontTitle)?.css || theme.font
  const fontBody  = BODY_FONTS.find(f => f.id === world.fontBody)?.css  || theme.fontBody

  // Resolve accent (world override or theme default)
  const accentHex = world.accentColor || theme.accent
  const toRgba = hex => {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
    return `rgba(${r},${g},${b},`
  }
  const accentRgba = accentHex.startsWith('#') ? toRgba(accentHex) : theme.accentLight

  // Resolve bg brightness / colorMode
  const colorMode = world.colorMode || 'night'
  const sysDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = colorMode === 'night' || (colorMode === 'smart' && sysDark)
  const bgBrightness = isDark ? (world.bgBrightness ?? 0.45) : Math.min((world.bgBrightness ?? 0.45) + 0.25, 0.8)

  // Apply CSS custom properties for the active theme
  const themeVars = {
    '--accent': accentHex,
    '--accent-10': accentRgba + '0.1)',
    '--accent-15': accentRgba + '0.15)',
    '--accent-18': accentRgba + '0.18)',
    '--accent-22': accentRgba + '0.22)',
    '--text-primary': theme.textPrimary,
    '--text-secondary': theme.textSecondary,
    '--text-muted': theme.textMuted,
    '--text-dim': theme.textDim,
    '--text-dark': theme.textDark,
    '--text-darker': theme.textDarker,
    '--bg-base-35': theme.bgBase + '0.35)',
    '--bg-base-50': theme.bgBase + '0.5)',
    '--bg-base-60': theme.bgBase + '0.6)',
    '--bg-panel-55': theme.bgPanel + '0.55)',
    '--bg-panel-85': theme.bgPanel + '0.85)',
    '--bg-panel-92': theme.bgPanel + '0.92)',
    '--bg-overlay-50': theme.bgOverlay + '0.5)',
    '--border-06': theme.borderColor + '0.06)',
    '--border-09': theme.borderColor + '0.09)',
    '--border-10': theme.borderColor + '0.1)',
    '--border-14': theme.borderColor + '0.14)',
    '--border-15': theme.borderColor + '0.15)',
    '--font': fontTitle,
    '--font-body': fontBody,
  }

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden', position:'relative', ...themeVars }}>
      {bg ? (
        <>
          <div style={{ position:'fixed', inset:0, zIndex:0, backgroundImage:`url(${bg})`, backgroundSize:'cover', backgroundPosition:'center', filter:`blur(8px) brightness(${bgBrightness})`, transform:'scale(1.08)' }} />
          <div style={{ position:'fixed', inset:0, zIndex:0, background: theme.bgBase + '0.35)' }} />
        </>
      ) : (
        <div style={{ position:'fixed', inset:0, zIndex:0, background: theme.defaultBg }} />
      )}

      <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', height:'100vh', padding:8, gap:8 }}>
        <TopBar world={world} activeView={activeView} onSetView={handleSetView} cardCount={cards.length}
          onWorldSelect={() => setShowWorldSelector(true)} theme={theme} />

        <div style={{ flex:1, display:'flex', overflow:'hidden', gap:8 }}>
          {inMondes && (
            <Sidebar cards={cards} folders={folders} customTypes={customTypes} openCardIds={openCardIds}
              onOpenCard={openCard} onCreateCard={handleCreate}
              onCreateFolder={createFolder} onUpdateFolder={updateFolder} onDeleteFolder={deleteFolder}
              onUpdateCard={updateCard} onDeleteCard={deleteCard} onDuplicateCard={duplicateCard}
              onShowTypes={() => setShowTypes(v => !v)} showTypes={showTypes} theme={theme}
            />
          )}

          <div style={{ flex:1, display:'flex', overflow:'hidden', minWidth:0, gap:8 }}>
            {activeView==='home'      && <HomeView world={world} setWorld={setWorld} cards={cards} customTypes={customTypes} onOpenCard={openCard} onCreateCard={handleCreate} />}
            {activeView==='documents' && <CharactersView cards={cards} customTypes={customTypes} onOpenCard={openCard} onCreateCard={handleCreate} />}
            {activeView==='graph'    && <GraphView    cards={cards} customTypes={customTypes} onOpenCard={openCard} />}
            {activeView==='timeline' && <TimelineView cards={cards} customTypes={customTypes} calendars={calendars} onOpenCard={openCard} />}
            {activeView==='charts'   && <ChartsView   cards={cards} customTypes={customTypes} />}

            {inMondes && (
              openCardIds.length === 0
                ? <MondesHome world={world} setWorld={setWorld} cards={cards} allTypes={allTypes} theme={theme}
                    calendars={calendars} createCalendar={createCalendar} updateCalendar={updateCalendar} deleteCalendar={deleteCalendar}
                    onOpenCard={openCard} onCreateCard={handleCreate} />
                : <div style={{ flex:1, display:'flex', overflow:'hidden', minWidth:0, gap:8 }}>
                    {openCardIds.map((cid) => {
                      const card = cards.find(c => c.id === cid)
                      if (!card) return null
                      const cardType = allTypes.find(t => t.id === card.typeId)
                      const containerStyle = { flex:1, minWidth:300, maxWidth: openCardIds.length===1 ? '100%' : 560, height:'100%', overflow:'hidden', background: theme.bgPanel + '0.55)', backdropFilter:'blur(40px) saturate(1.4)', WebkitBackdropFilter:'blur(40px) saturate(1.4)', borderRadius:16, border:`1px solid ${theme.borderColor}0.1)` }
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
              <div style={{ fontSize:15, fontWeight:600, color:'var(--text-primary,#f0e6d3)', fontFamily:"var(--font)" }}>{w.name}</div>
              <div style={{ fontSize:11, color:'var(--text-dim,#5a4a38)', marginTop:2 }}>{w.id === activeWorldId ? 'Monde actif' : ''}</div>
            </div>
            {worlds.length > 1 && (
              <button onClick={e => { e.stopPropagation(); if (confirm(`Supprimer "${w.name}" ?`)) onDelete(w.id) }}
                style={{ background:'none', border:'none', color:'var(--text-darker,#3a2a18)', cursor:'pointer', padding:4 }}
                onMouseEnter={e => e.currentTarget.style.color='#e05040'} onMouseLeave={e => e.currentTarget.style.color='var(--text-darker,#3a2a18)'}>
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
    </div>
  )
}

function MondesHome({ world, setWorld, cards, allTypes, theme, calendars, createCalendar, updateCalendar, deleteCalendar, onOpenCard, onCreateCard }) {
  const [showCal, setShowCal] = useState(false)
  const recent = [...cards].sort((a,b) => (b.updatedAt||0)-(a.updatedAt||0)).slice(0,8)
  return (
    <div style={{ flex:1, overflow:'auto', padding:'32px 40px', background: theme.bgPanel + '0.5)', backdropFilter:'blur(40px) saturate(1.4)', WebkitBackdropFilter:'blur(40px) saturate(1.4)', borderRadius:16, border:`1px solid ${theme.borderColor}0.09)` }}>
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <h1 style={{ fontFamily: theme.font, fontSize:26, color: theme.textPrimary, fontWeight:500, margin:0 }}>{world.name}</h1>
          <p style={{ color: theme.textDark, fontSize:13, marginTop:6 }}>{cards.length} document{cards.length!==1?'s':''} · {calendars.length} calendrier{calendars.length!==1?'s':''}</p>
        </div>
        <button onClick={() => setShowCal(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 13px', borderRadius:8, border:`1px solid ${theme.borderColor}0.15)`, background:'rgba(255,255,255,0.03)', color: theme.textMuted, fontSize:12, cursor:'pointer', transition:'color 0.1s' }}
          onMouseEnter={e => e.currentTarget.style.color=theme.accent} onMouseLeave={e => e.currentTarget.style.color=theme.textMuted}>
          📅 Calendriers
        </button>
      </div>

      {recent.length > 0 ? (
        <div>
          <h3 style={{ fontFamily: theme.font, fontSize:14, color: theme.textDim, marginBottom:14, fontWeight:400, textTransform:'uppercase', letterSpacing:'0.08em' }}>Récents</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
            {recent.map(card => {
              const type = allTypes.find(t => t.id===card.typeId)
              return (
                <div key={card.id} onClick={() => onOpenCard(card.id)}
                  style={{ padding:'12px 14px', borderRadius:10, border:`1px solid ${theme.borderColor}0.08)`, background:'rgba(255,255,255,0.02)', cursor:'pointer', transition:'all 0.12s' }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor=theme.borderColor+'0.18)' }}
                  onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor=theme.borderColor+'0.08)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    {card.image ? <img src={card.image} alt="" style={{ width:22, height:22, borderRadius:5, objectFit:'cover' }} /> : <span style={{ fontSize:18 }}>{type?.icon||'📄'}</span>}
                    <span style={{ fontSize:10, color:type?.color||theme.textMuted, background:(type?.color||'#5a5040')+'18', padding:'1px 5px', borderRadius:3 }}>{type?.name||'Doc'}</span>
                  </div>
                  <div style={{ fontSize:13, color: theme.textSecondary, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{card.name}</div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={{ textAlign:'center', paddingTop:60, color: theme.textDarker }}>
          <div style={{ fontSize:40, marginBottom:16 }}>✦</div>
          <p style={{ fontSize:16, marginBottom:8 }}>Bienvenue dans votre monde</p>
          <p style={{ fontSize:13 }}>Créez votre premier document avec le bouton + dans la sidebar</p>
        </div>
      )}

      {showCal && <CalendarsView calendars={calendars} onCreate={createCalendar} onUpdate={updateCalendar} onDelete={deleteCalendar} onClose={() => setShowCal(false)} />}
    </div>
  )
}

function TopBar({ world, activeView, onSetView, cardCount, onWorldSelect, theme }) {
  return (
    <div style={{ height:48, display:'flex', alignItems:'center', padding:'0 18px', background: theme.bgBase + '0.6)', backdropFilter:'blur(40px) saturate(1.6)', WebkitBackdropFilter:'blur(40px) saturate(1.6)', borderRadius:16, border:`1px solid ${theme.borderColor}0.09)`, flexShrink:0, position:'relative' }}>
      <div onClick={onWorldSelect} style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0, cursor:'pointer' }}
        title="Changer de monde">
        <div style={{ width:26, height:26, borderRadius:8, background:`linear-gradient(135deg,${theme.accent}55,${theme.accent}18)`, border:`1px solid ${theme.accent}28`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11 }}>✦</div>
        <span style={{ fontFamily: theme.font, fontSize:13, fontWeight:600, color: theme.textSecondary }}>{world.name||'Mon Monde'}</span>
      </div>
      <div style={{ position:'absolute', left:'50%', transform:'translateX(-50%)', display:'flex', gap:2, background:'rgba(255,255,255,0.05)', borderRadius:12, padding:'4px 5px', border:'1px solid rgba(255,255,255,0.07)' }}>
        {NAV.map(n => {
          const active = activeView===n.id
          return (
            <button key={n.id} onClick={() => onSetView(n.id)} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 13px', borderRadius:9, border:'none', background: active ? theme.accentLight + '0.18)' : 'transparent', color: active ? theme.accent : theme.textDark, fontSize:12, cursor:'pointer', transition:'all 0.12s' }}
              onMouseEnter={e => { if(!active) e.currentTarget.style.color=theme.textMuted }}
              onMouseLeave={e => { if(!active) e.currentTarget.style.color=theme.textDark }}>
              <Icon name={n.icon} size={13} />
              <span style={{ fontFamily: theme.fontBody }}>{n.label}</span>
            </button>
          )
        })}
      </div>
      <div style={{ marginLeft:'auto' }}>
        <span style={{ fontSize:11, color: theme.textDarker }}>{cardCount} doc{cardCount!==1?'s':''}</span>
      </div>
    </div>
  )
}

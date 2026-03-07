import React, { useState } from 'react'
import { Icon, Btn, Modal } from '../components/ui.jsx'
import { BUILTIN_TYPES } from '../data/types.js'
import { THEMES, TITLE_FONTS, BODY_FONTS, GENRE_PRESETS } from '../store/useStore.js'

export default function HomeView({ world, setWorld, cards, customTypes, onOpenCard, onCreateCard, onShowTypes }) {
  const [editingWelcome, setEditingWelcome] = useState(false)
  const [welcomeDraft, setWelcomeDraft] = useState(world.welcomeText || '')
  const [showTheme, setShowTheme] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const recentCards = [...cards].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 8)
  const allTypes = [...(customTypes || [])]

  const saveWelcome = () => { setWorld({ ...world, welcomeText: welcomeDraft }); setEditingWelcome(false) }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '48px 56px', background: 'var(--bg-base-50,rgba(8,4,0,0.5))', backdropFilter: 'blur(40px) saturate(1.4)', WebkitBackdropFilter: 'blur(40px) saturate(1.4)', borderRadius: 16, border: '1px solid var(--border-09,rgba(255,200,120,0.09))' }} className="anim-fadeup">
      {/* Title */}
      <h1 style={{ fontFamily: "var(--font)", fontSize: 44, fontWeight: 700, color: 'var(--text-primary,#f0f0f0)', marginBottom: 14, lineHeight: 1.1 }}>
        Bienvenue
      </h1>

      {/* Welcome text */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: 'var(--text-dim,#5a5a5a)', fontSize: 14, marginBottom: 44 }}>
        <Icon name="tag" size={14} style={{ marginTop: 2, opacity: 0.5, flexShrink: 0 }} />
        {editingWelcome ? (
          <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <input autoFocus value={welcomeDraft} onChange={e => setWelcomeDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveWelcome(); if (e.key === 'Escape') setEditingWelcome(false) }}
              style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid var(--accent-22,rgba(200,160,100,0.4))', color: 'var(--text-secondary,#c0c0c0)', fontSize: 14, outline: 'none', paddingBottom: 2 }}
            />
            <Btn size="sm" variant="primary" onClick={saveWelcome}><Icon name="check" size={12} /></Btn>
            <Btn size="sm" variant="ghost" onClick={() => setEditingWelcome(false)}><Icon name="x" size={12} /></Btn>
          </div>
        ) : (
          <span onClick={() => { setWelcomeDraft(world.welcomeText || ''); setEditingWelcome(true) }}
            style={{ cursor: 'text', flex: 1, fontStyle: 'italic' }} title="Cliquer pour éditer">
            {world.welcomeText || 'Cliquez pour ajouter une note de bienvenue…'}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 52, alignItems: 'flex-start' }}>
        {/* Recent cards */}
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: "var(--font)", fontSize: 18, color: 'var(--text-secondary,#c0c0c0)', marginBottom: 18, fontWeight: 500 }}>
            Espaces de travail récents
          </h2>
          {recentCards.length === 0 ? (
            <div style={{
              padding: '28px 0', color: 'var(--text-dark,#444444)', fontSize: 14,
              border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 12, textAlign: 'center',
            }}>
              Aucun document —{' '}
              <span onClick={() => onCreateCard('character')} style={{ color: 'var(--accent,#c8a064)', cursor: 'pointer' }}>
                créer un premier document
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {recentCards.map(card => (
                <RecentCard key={card.id} card={card} customTypes={customTypes} onClick={() => onOpenCard(card.id)} />
              ))}
              <div onClick={() => onCreateCard('character')}
                style={{ width: 148, minHeight: 118, borderRadius: 12, cursor: 'pointer', border: '1px dashed rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-dark,#444444)', fontSize: 13, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-22,rgba(200,160,100,0.3))'; e.currentTarget.style.color = 'var(--accent,#c8a064)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--text-dark,#444444)' }}
              >
                <Icon name="plus" size={20} />Nouveau
              </div>
            </div>
          )}

          {/* Mini canvas / graph preview */}
          {cards.length > 0 && (
            <div style={{ marginTop: 36 }}>
              <MiniGraph cards={cards} customTypes={customTypes} onOpenCard={onOpenCard} />
            </div>
          )}
        </div>

        {/* Manage sidebar */}
        <div style={{ width: 190, flexShrink: 0 }}>
          <h2 style={{ fontFamily: "var(--font)", fontSize: 18, color: 'var(--text-secondary,#c0c0c0)', marginBottom: 14, fontWeight: 500 }}>Gérer</h2>
          {[
            { label: 'Types', icon: 'settings', action: onShowTypes },
            { label: 'Thème', icon: 'eye', action: () => setShowTheme(true) },
            { label: 'Paramètres', icon: 'settings', action: () => setShowSettings(true) },
          ].map(item => (
            <button key={item.label} onClick={item.action}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', marginBottom: 7, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.25)', color: 'var(--text-secondary,#c0c0c0)', fontSize: 13, cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text-primary,#f0f0f0)'; e.currentTarget.style.borderColor = 'var(--border-15,rgba(255,200,120,0.15))' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.25)'; e.currentTarget.style.color = 'var(--text-secondary,#c0c0c0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
            >
              <Icon name={item.icon} size={15} />{item.label}
            </button>
          ))}
        </div>
      </div>

      {showTheme && <ThemeModal world={world} onUpdateWorld={setWorld} onClose={() => setShowTheme(false)} />}
      {showSettings && <SettingsModal world={world} onUpdateWorld={setWorld} cards={cards} onClose={() => setShowSettings(false)} />}
    </div>
  )
}

function RecentCard({ card, customTypes, onClick }) {
  const allTypes = [...BUILTIN_TYPES, ...(customTypes || [])]
  const type = allTypes.find(t => t.id === card.typeId) || { icon: '📄', color: '#8a8a8a', name: 'Document' }
  return (
    <div onClick={onClick} style={{ width: 152, borderRadius: 14, overflow: 'hidden', border: `1px solid ${type.color || '#333'}20`, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', cursor: 'pointer', transition: 'transform 0.15s, border-color 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = (type.color || '#888') + '50' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = (type.color || '#333') + '20' }}
    >
      <div style={{ height: 72, background: card.image ? `url(${card.image}) center/cover` : (type.color || '#5a5040') + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
        {!card.image && (type.icon || '📄')}
      </div>
      <div style={{ padding: '9px 11px' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary,#f0f0f0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
        <div style={{ fontSize: 10, color: 'var(--text-dark,#444444)', marginTop: 3 }}>
          {card.updatedAt ? new Date(card.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : 'À l\'instant'}
        </div>
      </div>
    </div>
  )
}

function MiniGraph({ cards, customTypes, onOpenCard }) {
  const BUILTIN_COLORS = { character: '#c084fc', location: '#f59e0b', faction: '#ef4444', item: '#06b6d4', event: '#22c55e', lore: '#a78bfa', ecology: '#84cc16' }
  const nodes = cards.slice(0, 20).map((c, i) => {
    const angle = (i / Math.min(cards.length, 20)) * Math.PI * 2
    const r = 100 + Math.random() * 40
    const type = (customTypes || []).find(t => t.id === c.typeId)
    return { ...c, x: 300 + r * Math.cos(angle), y: 140 + r * Math.sin(angle), color: type?.color || BUILTIN_COLORS[c.typeId] || '#8a8a8a' }
  })
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]))

  return (
    <div>
      <h3 style={{ fontFamily: "var(--font)", fontSize: 15, color: 'var(--text-muted,#8a8a8a)', marginBottom: 12, fontWeight: 400 }}>Vue d'ensemble</h3>
      <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
        <svg width="100%" height={280} viewBox="0 0 600 280">
          {nodes.map(n => (n.props ? Object.values(n.props) : []).flat().map(refId => {
            const target = nodeMap[refId]
            if (!target) return null
            return <line key={`${n.id}-${refId}`} x1={n.x} y1={n.y} x2={target.x} y2={target.y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
          }))}
          {nodes.map(n => (
            <g key={n.id} onClick={() => onOpenCard(n.id)} style={{ cursor: 'pointer' }}>
              <circle cx={n.x} cy={n.y} r={8} fill={n.color + '40'} stroke={n.color} strokeWidth={1.5} />
              {n.image && <image href={n.image} x={n.x - 7} y={n.y - 7} width={14} height={14} clipPath="inset(0 round 50%)" />}
              <text x={n.x} y={n.y + 18} textAnchor="middle" fill="var(--text-muted,#8a8a8a)" fontSize={9} fontFamily="var(--font-body)">
                {n.name.slice(0, 10)}{n.name.length > 10 ? '…' : ''}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

// ─── Theme Panel (fullscreen overlay, like examples 17 & 18) ──
const ALL_BG_URLS = [
  // Parchment / warm textures
  'https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?w=1600&q=80',
  'https://images.unsplash.com/photo-1524946274118-e7680e33ccc5?w=1600&q=80',
  // Forests
  'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&q=80',
  'https://images.unsplash.com/photo-1542273917363-1f3e5ce0b0e8?w=1600&q=80',
  'https://images.unsplash.com/photo-1425913397330-cf8af2ff40a1?w=1600&q=80',
  // Neon / cyberpunk
  'https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?w=1600&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1600&q=80',
  // Space / cosmos
  'https://images.unsplash.com/photo-1462332420958-a05d1e002413?w=1600&q=80',
  'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?w=1600&q=80',
  'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=1600&q=80',
  // Urban / city
  'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1600&q=80',
  'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1600&q=80',
  // Snow / ice
  'https://images.unsplash.com/photo-1418985991508-e47386d96a71?w=1600&q=80',
  'https://images.unsplash.com/photo-1477601263568-180e2c6d046e?w=1600&q=80',
  // Mountains / landscape
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&q=80',
  // Ocean / water
  'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1600&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80',
  // Desert / sand
  'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=1600&q=80',
  'https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?w=1600&q=80',
  // Castle / medieval
  'https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?w=1600&q=80',
  // Fire / volcanic
  'https://images.unsplash.com/photo-1462275646964-a0e3c11f18a6?w=1600&q=80',
  // Dark / moody
  'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1600&q=80',
  'https://images.unsplash.com/photo-1532767153582-b1a0e5145009?w=1600&q=80',
]

// ─── Custom presets (localStorage) ──────────────────────────
const CUSTOM_PRESETS_KEY = 'wf_custom_presets'
function loadCustomPresets() {
  try { const v = localStorage.getItem(CUSTOM_PRESETS_KEY); return v ? JSON.parse(v) : [] } catch { return [] }
}
function saveCustomPresets(presets) {
  try { localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(presets)) } catch {}
}

function ThemeModal({ world, onUpdateWorld, onClose }) {
  const [tab, setTab] = useState('explorer')
  const [customPresets, setCustomPresets] = useState(loadCustomPresets)

  const onSavePreset = (name) => {
    const preset = {
      id: Date.now().toString(36),
      name,
      bgImage: world.bgImage || '',
      theme: world.theme || 'warm',
      fontTitle: world.fontTitle || 'Lora',
      fontBody: world.fontBody || 'DM Sans',
      bgBrightness: world.bgBrightness ?? 0.45,
      colorMode: world.colorMode || 'night',
      accentColor: world.accentColor || '',
    }
    const updated = [preset, ...customPresets]
    setCustomPresets(updated)
    saveCustomPresets(updated)
  }

  const onDeletePreset = (id) => {
    const updated = customPresets.filter(p => p.id !== id)
    setCustomPresets(updated)
    saveCustomPresets(updated)
  }

  const applyPreset = ({ bgImage, theme, fontTitle, fontBody, bgBrightness, colorMode, accentColor }) => {
    const patch = { bgImage, theme, fontTitle, fontBody, bgBrightness, colorMode }
    if (accentColor) patch.accentColor = accentColor
    onUpdateWorld({ ...world, ...patch })
  }

  return (
    <div className="anim-fadein" style={{
      position:'fixed', inset:0, zIndex:800,
      background: tab === 'edition' ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.82)',
      backdropFilter: tab === 'edition' ? 'blur(8px) saturate(1.1)' : 'blur(30px) saturate(1.3)',
      WebkitBackdropFilter: tab === 'edition' ? 'blur(8px) saturate(1.1)' : 'blur(30px) saturate(1.3)',
      display:'flex', flexDirection:'column',
      transition:'background 0.3s, backdrop-filter 0.3s',
    }}>
      {/* ── Top bar ── */}
      <div style={{ display:'flex', alignItems:'center', padding:'14px 24px', flexShrink:0 }}>
        {/* Left: tab toggle */}
        <div style={{ display:'flex', alignItems:'center', gap:2, background:'rgba(255,255,255,0.06)', borderRadius:10, padding:3 }}>
          <ThemePill active={tab==='explorer'} onClick={() => setTab('explorer')}>
            <Icon name="search" size={12} /> Explorer
          </ThemePill>
          <ThemePill active={tab==='edition'} onClick={() => setTab('edition')}>
            <Icon name="edit" size={12} /> Édition
          </ThemePill>
        </div>

        <div style={{ flex:1 }} />

        {/* Right: mode toggle, save, close */}
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <ModeBtn world={world} onUpdate={onUpdateWorld} />
          <button onClick={onClose}
            style={{ width:32, height:32, borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)', color:'#888', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.12s' }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.12)'; e.currentTarget.style.color='#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='#888' }}>
            <Icon name="x" size={14} />
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex:1, overflow:'auto', padding:'0 24px 24px' }}>
        {tab === 'explorer'
          ? <ExplorerContent world={world} onApply={applyPreset} customPresets={customPresets} onDeletePreset={onDeletePreset} />
          : <EditionContent world={world} onUpdate={onUpdateWorld} onSavePreset={onSavePreset} />
        }
      </div>
    </div>
  )
}

function ThemePill({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:5, padding:'6px 14px', borderRadius:8,
      border:'none', cursor:'pointer', fontSize:12, fontWeight:500, transition:'all 0.12s',
      background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
      color: active ? '#fff' : '#666',
    }}
      onMouseEnter={e => { if(!active) e.currentTarget.style.color='#aaa' }}
      onMouseLeave={e => { if(!active) e.currentTarget.style.color='#666' }}
    >{children}</button>
  )
}

function ModeBtn({ world, onUpdate }) {
  const mode = world.colorMode || 'night'
  const next = { night:'day', day:'smart', smart:'night' }
  const icons = { night:'🌙', day:'☀️', smart:'⚙️' }
  return (
    <button onClick={() => onUpdate({ ...world, colorMode: next[mode] })}
      title={`Mode : ${mode}`}
      style={{ width:32, height:32, borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.12s' }}
      onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.12)'}
      onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}
    >{icons[mode]}</button>
  )
}

// ─── Explorer ─────────────────────────────────────────────────
function ExplorerContent({ world, onApply, customPresets, onDeletePreset }) {
  const genres = Object.entries(GENRE_PRESETS)
  const [genre, setGenre] = useState(customPresets.length > 0 ? 'custom' : 'popular')
  const [search, setSearch] = useState('')
  const current = genre === 'custom' ? null : GENRE_PRESETS[genre]

  // Filter presets by search
  const allBuiltin = Object.values(GENRE_PRESETS).flatMap(g => g.presets)
  const filtered = search
    ? [...customPresets, ...allBuiltin].filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : genre === 'custom' ? customPresets : current.presets

  return (
    <div>
      {/* Search + genre pills row */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <div style={{ position:'relative', width:220, flexShrink:0 }}>
          <Icon name="search" size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#555' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher des thèmes…"
            style={{ width:'100%', padding:'8px 12px 8px 32px', borderRadius:10, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.05)', color:'#ddd', fontSize:12, outline:'none' }}
            onFocus={e => e.target.style.borderColor='rgba(255,255,255,0.2)'}
            onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}
          />
        </div>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap', flex:1 }}>
          {customPresets.length > 0 && (() => {
            const active = genre === 'custom' && !search
            return (
              <button key="custom" onClick={() => { setGenre('custom'); setSearch('') }} style={{
                padding:'6px 14px', borderRadius:20, border:'1px solid',
                fontSize:11, cursor:'pointer', transition:'all 0.12s', whiteSpace:'nowrap',
                borderColor: active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.06)',
                background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: active ? '#fff' : '#666',
              }}
                onMouseEnter={e => { if(!active) { e.currentTarget.style.borderColor='rgba(255,255,255,0.15)'; e.currentTarget.style.color='#aaa' }}}
                onMouseLeave={e => { if(!active) { e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'; e.currentTarget.style.color='#666' }}}
              >💾 Mes presets</button>
            )
          })()}
          {genres.map(([key, g]) => {
            const active = genre === key && !search
            return (
              <button key={key} onClick={() => { setGenre(key); setSearch('') }} style={{
                padding:'6px 14px', borderRadius:20, border:'1px solid',
                fontSize:11, cursor:'pointer', transition:'all 0.12s', whiteSpace:'nowrap',
                borderColor: active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.06)',
                background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: active ? '#fff' : '#666',
              }}
                onMouseEnter={e => { if(!active) { e.currentTarget.style.borderColor='rgba(255,255,255,0.15)'; e.currentTarget.style.color='#aaa' }}}
                onMouseLeave={e => { if(!active) { e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'; e.currentTarget.style.color='#666' }}}
              >{g.icon} {g.label}</button>
            )
          })}
        </div>
      </div>

      {/* Preset grid — wide cards like 17.png */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12 }}>
        {filtered.map((p, idx) => {
          const th = THEMES[p.theme] || THEMES.warm
          const titleFont = TITLE_FONTS.find(f => f.id === p.fontTitle)
          const isActive = world.bgImage === p.bgImage && world.theme === p.theme && world.fontTitle === p.fontTitle
          const isCustom = !!p.id
          return (
            <div key={p.id || idx} onClick={() => onApply(p)}
              style={{
                borderRadius:14, overflow:'hidden', cursor:'pointer',
                border: isActive ? `2px solid ${th.accent}` : '2px solid rgba(255,255,255,0.04)',
                transition:'all 0.18s', position:'relative',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.4)'; if(!isActive) e.currentTarget.style.borderColor='rgba(255,255,255,0.15)' }}
              onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; if(!isActive) e.currentTarget.style.borderColor='rgba(255,255,255,0.04)' }}
            >
              {/* Image */}
              <div style={{ height:110, backgroundImage: p.bgImage ? `url(${p.bgImage})` : undefined, backgroundSize:'cover', backgroundPosition:'center', position:'relative', background: p.bgImage ? undefined : th.defaultBg }}>
                <div style={{ position:'absolute', inset:0, background:`linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.1) 60%)` }} />
                <div style={{ position:'absolute', bottom:10, left:12, right:12 }}>
                  <div style={{ fontFamily: titleFont?.css, fontSize:15, fontWeight:600, color:'#fff', textShadow:'0 1px 6px rgba(0,0,0,0.9)', lineHeight:1.2, marginBottom:3 }}>{p.name}</div>
                  <div style={{ display:'flex', gap:3 }}>
                    {[th.accent, th.textPrimary, th.textMuted].map((c,i) => (
                      <div key={i} style={{ width:8, height:8, borderRadius:'50%', background:c, border:'1px solid rgba(0,0,0,0.3)' }} />
                    ))}
                  </div>
                </div>
                {isActive && (
                  <div style={{ position:'absolute', top:8, right:8, background:th.accent, borderRadius:6, padding:'2px 8px', fontSize:10, fontWeight:600, color:'#000' }}>Actif</div>
                )}
                {isCustom && !isActive && (
                  <button onClick={e => { e.stopPropagation(); onDeletePreset(p.id) }}
                    style={{ position:'absolute', top:6, right:6, width:20, height:20, borderRadius:6, border:'none', background:'rgba(0,0,0,0.6)', color:'#888', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:10, transition:'all 0.12s' }}
                    onMouseEnter={e => { e.currentTarget.style.background='rgba(255,60,60,0.7)'; e.currentTarget.style.color='#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.background='rgba(0,0,0,0.6)'; e.currentTarget.style.color='#888' }}
                  ><Icon name="x" size={10} /></button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Edition ──────────────────────────────────────────────────
function EditionContent({ world, onUpdate, onSavePreset }) {
  const [bgUrl, setBgUrl] = useState(world.bgImage || '')
  const [presetName, setPresetName] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)
  const theme = THEMES[world.theme || 'warm'] || THEMES.warm
  const set = patch => onUpdate({ ...world, ...patch })

  const handleSave = () => {
    const name = presetName.trim() || 'Mon preset'
    onSavePreset(name)
    setPresetName('')
    setShowSaveInput(false)
  }

  return (
    <div style={{ display:'flex', gap:20, alignItems:'flex-start' }}>
      {/* Left: bg preview + bg selector */}
      <div style={{ width:200, flexShrink:0, display:'flex', flexDirection:'column', gap:12 }}>
        {/* Large preview */}
        <div style={{ width:200, height:260, borderRadius:14, overflow:'hidden', border:'1px solid rgba(255,255,255,0.1)', position:'relative', background:'rgba(0,0,0,0.3)' }}>
          {world.bgImage
            ? <img src={world.bgImage} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', filter:`brightness(${world.bgBrightness ?? 0.45})` }} />
            : <div style={{ width:'100%', height:'100%', background: theme.defaultBg, display:'flex', alignItems:'center', justifyContent:'center', color:'#444', fontSize:13 }}>Aucun fond</div>
          }
        </div>

        {/* Mini thumbnails */}
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          <div onClick={() => { setBgUrl(''); set({ bgImage:'' }) }}
            style={{ width:30, height:30, borderRadius:6, background:'rgba(255,255,255,0.06)', border: !world.bgImage ? '2px solid var(--accent,#c8a064)' : '2px solid transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, color:'#555' }}>
            <Icon name="x" size={10} />
          </div>
          {ALL_BG_URLS.map((url,i) => (
            <div key={i} onClick={() => { setBgUrl(url); set({ bgImage:url }) }}
              style={{ width:30, height:30, borderRadius:6, backgroundImage:`url(${url})`, backgroundSize:'cover', backgroundPosition:'center', cursor:'pointer', border: world.bgImage===url ? '2px solid var(--accent,#c8a064)' : '2px solid transparent', transition:'border 0.1s' }} />
          ))}
        </div>

        {/* URL field */}
        <input value={bgUrl} onChange={e => setBgUrl(e.target.value)}
          onBlur={() => set({ bgImage: bgUrl })}
          onKeyDown={e => { if(e.key==='Enter') set({ bgImage: bgUrl }) }}
          placeholder="URL personnalisée…"
          style={{ width:'100%', padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', color:'#ccc', fontSize:11, outline:'none', boxSizing:'border-box' }}
        />

      </div>

      {/* Center: fonts (two columns side by side) */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', gap:4, marginBottom:12 }}>
          <span style={{ fontSize:12, color:'#888', borderBottom:'1px solid rgba(255,255,255,0.15)', paddingBottom:4, flex:1, textAlign:'center' }}>Titre</span>
          <span style={{ fontSize:12, color:'#888', borderBottom:'1px solid rgba(255,255,255,0.08)', paddingBottom:4, flex:1, textAlign:'center' }}>Corps</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
          {/* Title fonts col */}
          <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
            {TITLE_FONTS.map(f => {
              const active = (world.fontTitle || 'Lora') === f.id
              return (
                <button key={f.id} onClick={() => set({ fontTitle:f.id })} style={{
                  display:'block', width:'100%', padding:'8px 12px', borderRadius:8, textAlign:'left',
                  border:'none', cursor:'pointer', transition:'all 0.1s',
                  background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                  fontFamily: f.css, fontSize:14, fontWeight: active ? 600 : 400,
                  color: active ? '#fff' : '#888',
                }}
                  onMouseEnter={e => { if(!active) e.currentTarget.style.background='rgba(255,255,255,0.05)' }}
                  onMouseLeave={e => { if(!active) e.currentTarget.style.background= active ? 'rgba(255,255,255,0.1)' : 'transparent' }}
                >{f.label}</button>
              )
            })}
          </div>
          {/* Body fonts col */}
          <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
            {BODY_FONTS.map(f => {
              const active = (world.fontBody || 'DM Sans') === f.id
              return (
                <button key={f.id} onClick={() => set({ fontBody:f.id })} style={{
                  display:'block', width:'100%', padding:'8px 12px', borderRadius:8, textAlign:'left',
                  border:'none', cursor:'pointer', transition:'all 0.1s',
                  background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                  fontFamily: f.css, fontSize:14, fontWeight: active ? 600 : 400,
                  color: active ? '#fff' : '#888',
                }}
                  onMouseEnter={e => { if(!active) e.currentTarget.style.background='rgba(255,255,255,0.05)' }}
                  onMouseLeave={e => { if(!active) e.currentTarget.style.background= active ? 'rgba(255,255,255,0.1)' : 'transparent' }}
                >{f.label}</button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom bar (absolute) — brightness slider + save preset */}
      <div style={{ position:'fixed', bottom:24, left:24, right:24, display:'flex', alignItems:'center', gap:14, padding:'10px 20px', background:'rgba(0,0,0,0.6)', backdropFilter:'blur(20px)', borderRadius:14, border:'1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontFamily: TITLE_FONTS.find(f=>f.id===world.fontTitle)?.css, fontSize:14, fontWeight:600, color:'#888' }}>Aa</span>
        <input type="range" min={0.1} max={0.9} step={0.05}
          value={world.bgBrightness ?? 0.45}
          onChange={e => set({ bgBrightness: parseFloat(e.target.value) })}
          style={{ flex:1, accentColor: world.accentColor || theme.accent, cursor:'pointer', height:4 }}
        />
        <span style={{ fontSize:11, color:'#555', minWidth:28, textAlign:'right' }}>{Math.round((world.bgBrightness ?? 0.45) * 100)}%</span>

        <div style={{ width:1, height:20, background:'rgba(255,255,255,0.08)', marginLeft:4 }} />

        {showSaveInput ? (
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <input autoFocus value={presetName} onChange={e => setPresetName(e.target.value)}
              onKeyDown={e => { if(e.key==='Enter') handleSave(); if(e.key==='Escape') setShowSaveInput(false) }}
              placeholder="Nom du preset…"
              style={{ width:140, padding:'5px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.06)', color:'#ddd', fontSize:11, outline:'none' }}
            />
            <button onClick={handleSave}
              style={{ padding:'5px 12px', borderRadius:8, border:'none', background: world.accentColor || theme.accent, color:'#000', fontSize:11, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}
            ><Icon name="check" size={11} /> Sauvegarder</button>
            <button onClick={() => setShowSaveInput(false)}
              style={{ padding:'5px 8px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'#666', fontSize:11, cursor:'pointer' }}
            ><Icon name="x" size={11} /></button>
          </div>
        ) : (
          <button onClick={() => setShowSaveInput(true)}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 14px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)', color:'#888', fontSize:11, cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.12s' }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.12)'; e.currentTarget.style.color='#ccc' }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='#888' }}
          ><Icon name="save" size={11} /> Sauvegarder le preset</button>
        )}
      </div>
    </div>
  )
}

function SettingsModal({ world, onUpdateWorld, cards, onClose }) {
  const [name, setName] = useState(world.name || '')
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ world, cards }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${world.name || 'monde'}.json`; a.click()
  }
  return (
    <Modal title="Paramètres" onClose={onClose} width={400}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-dim,#5a5a5a)', display: 'block', marginBottom: 6 }}>Nom du monde</label>
          <input value={name} onChange={e => setName(e.target.value)}
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: '8px 12px', color: '#f0f0f0', fontSize: 13, outline: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn variant="subtle" onClick={onClose}>Annuler</Btn>
          <Btn variant="primary" onClick={() => { onUpdateWorld({ ...world, name }); onClose() }}>Enregistrer</Btn>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
          <Btn variant="subtle" onClick={exportData}><Icon name="eye" size={12} /> Exporter JSON</Btn>
        </div>
      </div>
    </Modal>
  )
}

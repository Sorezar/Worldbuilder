import React, { useState } from 'react'
import { Icon, Btn, Modal, Input, ColorPicker } from '../components/ui.jsx'
import { BUILTIN_TYPES } from '../data/types.js'

export default function HomeView({ world, setWorld, cards, customTypes, onOpenCard, onCreateCard }) {
  const [editingWelcome, setEditingWelcome] = useState(false)
  const [welcomeDraft, setWelcomeDraft] = useState(world.welcomeText || '')
  const [showTheme, setShowTheme] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const recentCards = [...cards].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 8)
  const allTypes = [...(customTypes || [])]

  const saveWelcome = () => { setWorld({ ...world, welcomeText: welcomeDraft }); setEditingWelcome(false) }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '48px 56px' }} className="anim-fadeup">
      {/* Title */}
      <h1 style={{ fontFamily: "'Lora', serif", fontSize: 44, fontWeight: 700, color: '#f0e6d3', marginBottom: 14, lineHeight: 1.1 }}>
        Bienvenue
      </h1>

      {/* Welcome text */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: '#6a5a48', fontSize: 14, marginBottom: 44 }}>
        <Icon name="tag" size={14} style={{ marginTop: 2, opacity: 0.5, flexShrink: 0 }} />
        {editingWelcome ? (
          <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <input autoFocus value={welcomeDraft} onChange={e => setWelcomeDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveWelcome(); if (e.key === 'Escape') setEditingWelcome(false) }}
              style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid rgba(200,160,100,0.4)', color: '#c8b89a', fontSize: 14, outline: 'none', paddingBottom: 2 }}
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
          <h2 style={{ fontFamily: "'Lora', serif", fontSize: 18, color: '#c8b89a', marginBottom: 18, fontWeight: 500 }}>
            Espaces de travail récents
          </h2>
          {recentCards.length === 0 ? (
            <div style={{
              padding: '28px 0', color: '#4a3a28', fontSize: 14,
              border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 12, textAlign: 'center',
            }}>
              Aucun document —{' '}
              <span onClick={() => onCreateCard('character')} style={{ color: '#c8a064', cursor: 'pointer' }}>
                créer un premier document
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {recentCards.map(card => (
                <RecentCard key={card.id} card={card} customTypes={customTypes} onClick={() => onOpenCard(card.id)} />
              ))}
              <div onClick={() => onCreateCard('character')}
                style={{ width: 148, minHeight: 118, borderRadius: 12, cursor: 'pointer', border: '1px dashed rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#4a3a28', fontSize: 13, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,160,100,0.3)'; e.currentTarget.style.color = '#c8a064' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#4a3a28' }}
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
          <h2 style={{ fontFamily: "'Lora', serif", fontSize: 18, color: '#c8b89a', marginBottom: 14, fontWeight: 500 }}>Gérer</h2>
          {[
            { label: 'Types', icon: 'settings' },
            { label: 'Médias', icon: 'image' },
            { label: 'Thème', icon: 'eye', action: () => setShowTheme(true) },
            { label: 'Paramètres', icon: 'settings', action: () => setShowSettings(true) },
          ].map(item => (
            <button key={item.label} onClick={item.action}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', marginBottom: 6, borderRadius: 8, border: 'none', background: 'rgba(0,0,0,0.3)', color: '#c8b89a', fontSize: 13, cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#f0e6d3' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.3)'; e.currentTarget.style.color = '#c8b89a' }}
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
  const type = allTypes.find(t => t.id === card.typeId) || { icon: '📄', color: '#9a8a70', name: 'Document' }
  return (
    <div onClick={onClick} style={{ width: 148, borderRadius: 12, overflow: 'hidden', border: `1px solid ${type.color || '#333'}20`, background: 'rgba(0,0,0,0.28)', cursor: 'pointer', transition: 'transform 0.15s, border-color 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = (type.color || '#888') + '50' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = (type.color || '#333') + '20' }}
    >
      <div style={{ height: 68, background: card.image ? `url(${card.image}) center/cover` : (type.color || '#5a5040') + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
        {!card.image && (type.icon || '📄')}
      </div>
      <div style={{ padding: '8px 10px' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#f0e6d3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
        <div style={{ fontSize: 10, color: '#4a3a28', marginTop: 3 }}>
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
    return { ...c, x: 300 + r * Math.cos(angle), y: 140 + r * Math.sin(angle), color: type?.color || BUILTIN_COLORS[c.typeId] || '#9a8a70' }
  })
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]))

  return (
    <div>
      <h3 style={{ fontFamily: "'Lora', serif", fontSize: 15, color: '#7a6a58', marginBottom: 12, fontWeight: 400 }}>Vue d'ensemble</h3>
      <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, overflow: 'hidden' }}>
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
              <text x={n.x} y={n.y + 18} textAnchor="middle" fill="#7a6a58" fontSize={9} fontFamily="'DM Sans', sans-serif">
                {n.name.slice(0, 10)}{n.name.length > 10 ? '…' : ''}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

function ThemeModal({ world, onUpdateWorld, onClose }) {
  const [bg, setBg] = useState(world.bgImage || '')
  const PRESETS = [
    'https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?w=1600&q=80',
    'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&q=80',
    'https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?w=1600&q=80',
    'https://images.unsplash.com/photo-1462332420958-a05d1e002413?w=1600&q=80',
    'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1600&q=80',
  ]
  const applyBg = url => { setBg(url); onUpdateWorld({ ...world, bgImage: url }) }
  return (
    <Modal title="Thème" onClose={onClose} width={440}>
      <p style={{ fontSize: 12, color: '#5a4a38', marginBottom: 10 }}>Fond d'écran — cliquez pour appliquer</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 12 }}>
        {PRESETS.map(url => (
          <div key={url} onClick={() => applyBg(url)}
            style={{ height: 44, borderRadius: 7, backgroundImage: `url(${url})`, backgroundSize: 'cover', cursor: 'pointer', border: bg === url ? '2px solid #c8a064' : '2px solid transparent', transition: 'border 0.1s' }} />
        ))}
      </div>
      <input value={bg} onChange={e => setBg(e.target.value)} placeholder="URL personnalisée…"
        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: '7px 12px', color: '#e2d9c8', fontSize: 12, outline: 'none', marginBottom: 16 }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Btn variant="subtle" onClick={onClose}>Fermer</Btn>
        <Btn variant="primary" onClick={() => { applyBg(bg); onClose() }}>Appliquer</Btn>
      </div>
    </Modal>
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
          <label style={{ fontSize: 12, color: '#5a4a38', display: 'block', marginBottom: 6 }}>Nom du monde</label>
          <input value={name} onChange={e => setName(e.target.value)}
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: '8px 12px', color: '#e2d9c8', fontSize: 13, outline: 'none' }}
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

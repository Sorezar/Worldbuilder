import React from 'react'
import { Icon } from '../ui.jsx'

export default function MapWidget({ card, cards }) {
  // Show map background if this card has map data
  const bgImage = card.data?.backgroundImage

  if (bgImage) {
    return (
      <div style={{ height: '100%', borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
        <img src={bgImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.6)', borderRadius: 4, padding: '2px 6px', fontSize: 9, color: 'var(--text-muted,#8a8a8a)' }}>Carte géo</div>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4, color: 'var(--text-darker,#2e2e2e)' }}>
      <Icon name="globe" size={20} style={{ opacity: 0.3 }} />
      <span style={{ fontSize: 10 }}>Carte géographique</span>
    </div>
  )
}

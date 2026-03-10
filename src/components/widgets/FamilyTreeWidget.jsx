import React from 'react'
import { Icon } from '../ui.jsx'

export default function FamilyTreeWidget({ card, cards }) {
  const nodes = card.data?.nodes || []

  if (nodes.length > 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6, color: 'var(--text-dim,#5a5a5a)' }}>
        <Icon name="connect" size={20} style={{ opacity: 0.5 }} />
        <span style={{ fontSize: 10 }}>{nodes.length} membres</span>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4, color: 'var(--text-darker,#2e2e2e)' }}>
      <Icon name="connect" size={20} style={{ opacity: 0.3 }} />
      <span style={{ fontSize: 10 }}>Arbre généalogique</span>
    </div>
  )
}

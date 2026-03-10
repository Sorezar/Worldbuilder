import React from 'react'

export default function TextWidget({ widget, card, onUpdateCard }) {
  const upd = patch => onUpdateCard(card.id, patch)
  const title = widget?.config?.title || 'Texte'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 10, color: 'var(--text-darker,#2e2e2e)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4, flexShrink: 0 }}>{title}</div>
      <textarea
        value={card.text || ''} onChange={e => upd({ text: e.target.value })}
        placeholder="Décrivez cet élément…"
        style={{ width: '100%', flex: 1, background: 'transparent', border: 'none', color: 'var(--text-muted,#8a8a8a)', fontSize: 13, lineHeight: 1.85, resize: 'none', outline: 'none', fontFamily: "var(--font-body)", overflow: 'auto' }}
      />
    </div>
  )
}

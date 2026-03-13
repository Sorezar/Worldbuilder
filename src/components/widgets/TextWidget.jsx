import React from 'react'

export default function TextWidget({ widget, card, onUpdateCard }) {
  const upd = patch => onUpdateCard(card.id, patch)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <textarea
        value={card.text || ''} onChange={e => upd({ text: e.target.value })}
        placeholder="Décrivez cet élément…"
        style={{ width: '100%', flex: 1, background: 'transparent', border: 'none', color: '#ccc', fontSize: 13, lineHeight: 1.85, resize: 'none', outline: 'none', fontFamily: "var(--font-body)", overflow: 'auto' }}
      />
    </div>
  )
}

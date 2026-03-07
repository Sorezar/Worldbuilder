import React, { useState } from 'react'
import { Icon, Btn } from './ui.jsx'

export default function ViewHeader({ card, type, onClose, onUpdate, children }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(card.name)

  const commit = () => {
    if (draft.trim()) onUpdate(card.id, { name: draft.trim() })
    setEditing(false)
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
      borderBottom: '1px solid rgba(255,200,120,0.08)', flexShrink: 0,
    }}>
      <span style={{ fontSize: 16 }}>{type?.icon || '📄'}</span>
      {editing ? (
        <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
          onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(200,160,100,0.4)', color: '#f0f0f0', fontSize: 15, fontFamily: "'Lora',serif", fontWeight: 500, outline: 'none', flex: 1, minWidth: 0 }}
        />
      ) : (
        <span onDoubleClick={() => { setDraft(card.name); setEditing(true) }}
          style={{ fontFamily: "'Lora',serif", fontSize: 15, fontWeight: 500, color: '#f0f0f0', cursor: 'text', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {card.name}
        </span>
      )}
      <span style={{ fontSize: 10, color: type?.color || '#8a8a8a', background: (type?.color || '#5a5040') + '18', padding: '2px 7px', borderRadius: 4 }}>
        {type?.name || 'Document'}
      </span>
      {children}
      <Btn size="icon_sm" variant="ghost" onClick={onClose} title="Fermer"><Icon name="x" size={14} /></Btn>
    </div>
  )
}

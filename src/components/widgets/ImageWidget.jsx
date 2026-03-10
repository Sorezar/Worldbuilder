import React, { useRef } from 'react'
import { Icon } from '../ui.jsx'

export default function ImageWidget({ card, onUpdateCard, config }) {
  const fileRef = useRef()
  const upd = patch => onUpdateCard(card.id, patch)
  const fit = config?.fit || 'cover'

  const handleUpload = e => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => upd({ image: ev.target.result })
    reader.readAsDataURL(file)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
      {card.image ? (
        <div style={{ flex: 1, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-14,rgba(255,200,120,0.15))', position: 'relative', cursor: 'pointer' }}
          onClick={() => fileRef.current?.click()}>
          <img src={card.image} alt="" style={{ width: '100%', height: '100%', objectFit: fit }} />
          <button onClick={e => { e.stopPropagation(); upd({ image: '' }) }}
            style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 4, width: 18, height: 18, cursor: 'pointer', color: 'var(--text-secondary,#ccc)', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
      ) : (
        <div onClick={() => fileRef.current?.click()}
          style={{ flex: 1, borderRadius: 10, border: '1px dashed var(--border-14,rgba(255,200,120,0.12))', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', color: 'var(--text-darker,#2e2e2e)', fontSize: 10 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-22)'; e.currentTarget.style.color = 'var(--accent,#c8a064)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-14,rgba(255,200,120,0.12))'; e.currentTarget.style.color = 'var(--text-darker,#2e2e2e)' }}>
          <Icon name="image" size={22} />
          <span>Image</span>
        </div>
      )}
    </div>
  )
}

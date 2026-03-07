import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Icon, Btn } from './ui.jsx'

export default function DraggableWindow({
  title, icon, children, onClose,
  initialX = 120, initialY = 60,
  initialW = 880, initialH = 580,
  minW = 500, minH = 300,
}) {
  const [pos, setPos] = useState({ x: initialX, y: initialY })
  const [size, setSize] = useState({ w: initialW, h: initialH })
  const [maximized, setMaximized] = useState(false)
  const dragging = useRef(null)
  const resizing = useRef(null)
  const windowRef = useRef()

  // Drag the window by title bar
  const onTitleMouseDown = useCallback(e => {
    if (maximized) return
    e.preventDefault()
    dragging.current = { ox: e.clientX - pos.x, oy: e.clientY - pos.y }
  }, [pos, maximized])

  // Resize by bottom-right corner
  const onResizeMouseDown = useCallback(e => {
    e.preventDefault()
    e.stopPropagation()
    resizing.current = { ox: e.clientX - size.w, oy: e.clientY - size.h }
  }, [size])

  useEffect(() => {
    const onMove = e => {
      if (dragging.current) {
        setPos({
          x: Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragging.current.ox)),
          y: Math.max(0, Math.min(window.innerHeight - 40, e.clientY - dragging.current.oy)),
        })
      }
      if (resizing.current) {
        setSize({
          w: Math.max(minW, e.clientX - resizing.current.ox),
          h: Math.max(minH, e.clientY - resizing.current.oy),
        })
      }
    }
    const onUp = () => { dragging.current = null; resizing.current = null }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
  }, [minW, minH])

  const style = maximized
    ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', borderRadius: 0 }
    : { position: 'fixed', top: pos.y, left: pos.x, width: size.w, height: size.h, borderRadius: 18 }

  return (
    <div ref={windowRef} style={{
      ...style, zIndex: 700,
      background: 'rgba(8, 5, 1, 0.65)',
      backdropFilter: 'blur(40px) saturate(1.6)',
      WebkitBackdropFilter: 'blur(40px) saturate(1.6)',
      border: '1px solid rgba(255, 200, 120, 0.14)',
      boxShadow: '0 0 0 1px rgba(255,200,100,0.04), 0 24px 80px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,220,160,0.07)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Title bar */}
      <div
        onMouseDown={onTitleMouseDown}
        style={{
          height: 44, display: 'flex', alignItems: 'center', gap: 9,
          padding: '0 14px 0 16px', flexShrink: 0,
          background: 'rgba(255,200,100,0.03)',
          borderBottom: '1px solid rgba(255,200,120,0.1)',
          cursor: maximized ? 'default' : 'move',
          userSelect: 'none',
        }}
      >
        {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
        <span style={{ fontFamily: "'Lora', serif", fontSize: 14, color: '#f0f0f0', fontWeight: 500, flex: 1 }}>
          {title}
        </span>
        {/* Window controls */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <WinBtn color="#fbbf24" title={maximized ? 'Restaurer' : 'Maximiser'} onClick={() => setMaximized(!maximized)}>
            {maximized ? '⊡' : '⊞'}
          </WinBtn>
          <WinBtn color="#ef4444" title="Fermer" onClick={onClose}>✕</WinBtn>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>

      {/* Resize handle */}
      {!maximized && (
        <div
          onMouseDown={onResizeMouseDown}
          style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 18, height: 18, cursor: 'se-resize',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
            padding: 4,
          }}
        >
          <svg width={10} height={10} viewBox="0 0 10 10" fill="none">
            <path d="M9 1L1 9M9 5L5 9M9 9H9" stroke="rgba(255,200,120,0.25)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  )
}

function WinBtn({ color, title, onClick, children }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 22, height: 22, borderRadius: '50%', border: 'none',
      background: color + '25', color: color + 'cc', fontSize: 10,
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'background 0.1s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = color + '50'}
      onMouseLeave={e => e.currentTarget.style.background = color + '25'}
    >
      {children}
    </button>
  )
}

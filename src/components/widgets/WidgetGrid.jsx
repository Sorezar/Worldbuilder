import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Icon } from '../ui.jsx'
import { WIDGET_TYPES, COLS, ROW_H, GAP, createWidget, resolveCollisions, RESIZE_HANDLES, DOT_SIZE } from '../../data/widgetDefaults.js'
import PropertiesWidget from './PropertiesWidget.jsx'
import TextWidget from './TextWidget.jsx'
import ImageWidget from './ImageWidget.jsx'
import ChartWidget from './ChartWidget.jsx'
import MapWidget from './MapWidget.jsx'
import FamilyTreeWidget from './FamilyTreeWidget.jsx'

// ─── WidgetGrid ─────────────────────────────────────────────
export default function WidgetGrid({
  layout, card, cards, customTypes, allTypes, calendars,
  onUpdateCard, onUpdateLayout, editMode,
  onOpenCard, onCreateCard,
}) {
  const gridRef = useRef()
  const [dragging, setDragging] = useState(null)
  const [resizing, setResizing] = useState(null)
  const [previewLayout, setPreviewLayout] = useState(null) // full pushed layout
  const [showAddMenu, setShowAddMenu] = useState(false)
  const pushRef = useRef({ timer: null, pos: null })

  const getCellSize = useCallback(() => {
    if (!gridRef.current) return { cw: 20, ch: ROW_H }
    const rect = gridRef.current.getBoundingClientRect()
    const cw = (rect.width - GAP * (COLS - 1)) / COLS
    return { cw, ch: ROW_H }
  }, [])

  const onDragStart = useCallback((e, widget) => {
    if (!editMode) return
    e.preventDefault()
    setDragging({ id: widget.id, startX: e.clientX, startY: e.clientY, origX: widget.x, origY: widget.y })
    setPreviewLayout(layout.map(w => ({ ...w })))
  }, [editMode, layout])

  const onResizeStart = useCallback((e, widget, edges) => {
    if (!editMode) return
    e.preventDefault()
    e.stopPropagation()
    setResizing({
      id: widget.id, startX: e.clientX, startY: e.clientY,
      origX: widget.x, origY: widget.y, origW: widget.w, origH: widget.h,
      edges,
    })
    setPreviewLayout(layout.map(w => ({ ...w })))
  }, [editMode, layout])

  useEffect(() => {
    if (!dragging && !resizing) return
    const { cw, ch } = getCellSize()

    const onMove = e => {
      if (dragging) {
        const dx = Math.round((e.clientX - dragging.startX) / (cw + GAP))
        const dy = Math.round((e.clientY - dragging.startY) / (ch + GAP))
        const w = layout.find(w => w.id === dragging.id)
        if (!w) return
        const newX = Math.max(0, Math.min(COLS - w.w, dragging.origX + dx))
        const newY = Math.max(0, dragging.origY + dy)
        const posKey = `d${newX},${newY}`
        if (posKey === pushRef.current.pos) return
        pushRef.current.pos = posKey
        const moved = layout.map(lw => lw.id === dragging.id ? { ...lw, x: newX, y: newY } : { ...lw })
        setPreviewLayout(moved)
        clearTimeout(pushRef.current.timer)
        pushRef.current.timer = setTimeout(() => {
          setPreviewLayout(prev => prev ? resolveCollisions(prev, dragging.id) : prev)
        }, 250)
      }
      if (resizing) {
        const w = layout.find(w => w.id === resizing.id)
        if (!w) return
        const wt = WIDGET_TYPES.find(t => t.id === w.type)
        const minW = wt?.minW || 4
        const minH = wt?.minH || 2
        const dxCells = Math.round((e.clientX - resizing.startX) / (cw + GAP))
        const dyCells = Math.round((e.clientY - resizing.startY) / (ch + GAP))

        let nX = resizing.origX, nY = resizing.origY
        let nW = resizing.origW, nH = resizing.origH

        if (resizing.edges.right) nW = resizing.origW + dxCells
        if (resizing.edges.left) { nX = resizing.origX + dxCells; nW = resizing.origW - dxCells }
        if (resizing.edges.bottom) nH = resizing.origH + dyCells
        if (resizing.edges.top) { nY = resizing.origY + dyCells; nH = resizing.origH - dyCells }

        if (nW < minW) { if (resizing.edges.left) nX = resizing.origX + resizing.origW - minW; nW = minW }
        if (nH < minH) { if (resizing.edges.top) nY = resizing.origY + resizing.origH - minH; nH = minH }
        if (nX < 0) { nW += nX; nX = 0 }
        if (nY < 0) { nH += nY; nY = 0 }
        if (nX + nW > COLS) nW = COLS - nX
        if (nW < minW) nW = minW

        const posKey = `r${nX},${nY},${nW},${nH}`
        if (posKey === pushRef.current.pos) return
        pushRef.current.pos = posKey
        const moved = layout.map(lw => lw.id === resizing.id ? { ...lw, x: nX, y: nY, w: nW, h: nH } : { ...lw })
        setPreviewLayout(moved)
        clearTimeout(pushRef.current.timer)
        pushRef.current.timer = setTimeout(() => {
          setPreviewLayout(prev => prev ? resolveCollisions(prev, resizing.id) : prev)
        }, 250)
      }
    }

    const onUp = () => {
      clearTimeout(pushRef.current.timer)
      pushRef.current = { timer: null, pos: null }
      if (previewLayout) {
        const activeId = dragging?.id || resizing?.id
        onUpdateLayout(activeId ? resolveCollisions(previewLayout, activeId) : previewLayout)
      }
      setDragging(null)
      setResizing(null)
      setPreviewLayout(null)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
  }, [dragging, resizing, previewLayout, layout, onUpdateLayout, getCellSize])

  const removeWidget = id => onUpdateLayout(layout.filter(w => w.id !== id))

  const addWidget = typeId => {
    const w = createWidget(typeId, layout)
    if (w) onUpdateLayout([...layout, w])
    setShowAddMenu(false)
  }

  const updateWidgetConfig = (id, configPatch) => {
    onUpdateLayout(layout.map(w => w.id === id ? { ...w, config: { ...w.config, ...configPatch } } : w))
  }

  // Use preview layout during drag/resize, otherwise the real layout
  const displayLayout = previewLayout || layout
  const activeId = dragging?.id || resizing?.id
  const maxRow = displayLayout.reduce((max, w) => Math.max(max, w.y + w.h), 0)

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px 48px' }}>
      <div ref={gridRef} style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        gridAutoRows: ROW_H,
        gap: GAP,
        position: 'relative',
        minHeight: maxRow * (ROW_H + GAP),
      }}>
        {displayLayout.map(widget => {
          const isActive = activeId === widget.id
          const wasPushed = previewLayout && !isActive && previewLayout.find(pw => pw.id === widget.id)
          const origWidget = layout.find(w => w.id === widget.id)
          const didMove = wasPushed && origWidget && (wasPushed.y !== origWidget.y || wasPushed.x !== origWidget.x)

          return (
            <div key={widget.id} style={{
              gridColumn: `${widget.x + 1} / span ${widget.w}`,
              gridRow: `${widget.y + 1} / span ${widget.h}`,
              position: 'relative',
              borderRadius: 12,
              border: editMode
                ? isActive ? '2px solid var(--accent,#c8a064)' : '2px solid var(--accent-30,rgba(200,160,100,0.3))'
                : '1px solid transparent',
              background: editMode ? 'rgba(255,255,255,0.02)' : 'transparent',
              overflow: editMode ? 'visible' : 'hidden',
              opacity: isActive ? 0.8 : 1,
              transition: previewLayout ? (isActive ? 'none' : 'all 0.15s ease') : 'opacity 0.15s',
              display: 'flex', flexDirection: 'column',
            }}>
              {/* Widget content */}
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', pointerEvents: editMode ? 'none' : 'auto', borderRadius: 10 }}>
                <WidgetRenderer
                  widget={widget} card={card} cards={cards}
                  customTypes={customTypes} allTypes={allTypes} calendars={calendars}
                  onUpdateCard={onUpdateCard} onOpenCard={onOpenCard} onCreateCard={onCreateCard}
                  layout={layout} onUpdateConfig={cfg => updateWidgetConfig(widget.id, cfg)}
                />
              </div>

              {/* Edit overlay — phone-widget style */}
              {editMode && (
                <>
                  {/* Drag surface */}
                  <div onMouseDown={e => onDragStart(e, origWidget || widget)}
                    style={{ position: 'absolute', inset: 8, cursor: 'grab', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ background: 'rgba(0,0,0,0.5)', borderRadius: 6, padding: '3px 8px', fontSize: 10, color: 'var(--text-muted,#8a8a8a)', display: 'flex', alignItems: 'center', gap: 4, pointerEvents: 'none' }}>
                      <Icon name="move" size={10} />
                      {WIDGET_TYPES.find(t => t.id === widget.type)?.name || widget.type}
                    </span>
                  </div>
                  {/* Delete button */}
                  <button onClick={() => removeWidget(widget.id)}
                    style={{ position: 'absolute', top: -8, right: -8, zIndex: 12, width: 18, height: 18, borderRadius: 9, background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.15)', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--danger,#ef4444)'}
                    onMouseLeave={e => e.currentTarget.style.color = '#888'}>
                    ✕
                  </button>
                  {/* 8 resize handles */}
                  {RESIZE_HANDLES.map(h => (
                    <div key={h.id} onMouseDown={e => onResizeStart(e, origWidget || widget, h.edges)}
                      style={{
                        position: 'absolute', ...h.style,
                        width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2,
                        background: 'var(--accent,#c8a064)', border: '1px solid rgba(0,0,0,0.3)',
                        cursor: h.cursor, zIndex: 11,
                      }} />
                  ))}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Add widget button */}
      {editMode && (
        <div style={{ marginTop: 12, position: 'relative' }}>
          <button onClick={() => setShowAddMenu(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--text-dark,#444444)', fontSize: 12, cursor: 'pointer', transition: 'all 0.1s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-22)'; e.currentTarget.style.color = 'var(--accent,#c8a064)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-dark,#444444)' }}>
            <Icon name="plus" size={12} /> Ajouter un widget
          </button>
          {showAddMenu && <AddWidgetMenu onAdd={addWidget} onClose={() => setShowAddMenu(false)} />}
        </div>
      )}
    </div>
  )
}

// ─── Widget renderer (dispatches to correct widget) ─────────
function WidgetRenderer({ widget, card, cards, customTypes, allTypes, calendars, onUpdateCard, onOpenCard, onCreateCard, layout, onUpdateConfig }) {
  switch (widget.type) {
    case 'properties':
      return <PropertiesWidget widget={widget} card={card} cards={cards} customTypes={customTypes} allTypes={allTypes} calendars={calendars} onUpdateCard={onUpdateCard} onOpenCard={onOpenCard} onCreateCard={onCreateCard} layout={layout} onUpdateConfig={onUpdateConfig} />
    case 'text':
      return <TextWidget widget={widget} card={card} onUpdateCard={onUpdateCard} />
    case 'image':
      return <ImageWidget card={card} onUpdateCard={onUpdateCard} config={widget.config} />
    case 'chart':
      return <ChartWidget widget={widget} card={card} cards={cards} customTypes={customTypes} allTypes={allTypes} onUpdateConfig={onUpdateConfig} />
    case 'map':
      return <MapWidget card={card} cards={cards} />
    case 'family_tree':
      return <FamilyTreeWidget card={card} cards={cards} />
    default:
      return <div style={{ padding: 12, color: 'var(--text-darker,#2e2e2e)', fontSize: 11 }}>Widget inconnu: {widget.type}</div>
  }
}

// ─── Add widget menu ────────────────────────────────────────
function AddWidgetMenu({ onAdd, onClose }) {
  const ref = useRef()

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  return (
    <div ref={ref} style={{
      position: 'absolute', bottom: '100%', left: 0, marginBottom: 4, zIndex: 500,
      background: 'var(--bg-panel-92,rgba(10,6,1,0.92))', backdropFilter: 'blur(40px) saturate(1.5)', WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
      border: '1px solid var(--border-14)', borderRadius: 12,
      width: 220, boxShadow: '0 8px 32px rgba(0,0,0,0.8)', overflow: 'hidden',
    }}>
      <div style={{ padding: '8px 12px 4px', fontSize: 10, color: 'var(--text-darker,#2e2e2e)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Widgets</div>
      {WIDGET_TYPES.map(wt => (
        <div key={wt.id} onClick={() => onAdd(wt.id)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted,#8a8a8a)', transition: 'background 0.08s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <span style={{ width: 20, textAlign: 'center', fontSize: 14 }}>{wt.icon}</span>
          <span>{wt.name}</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-darker,#2e2e2e)' }}>{wt.defaultW}x{wt.defaultH}</span>
        </div>
      ))}
    </div>
  )
}

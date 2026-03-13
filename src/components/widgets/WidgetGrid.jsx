import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Icon } from '../ui.jsx'
import { WIDGET_TYPES, WIDGET_GAP, MAX_PER_ROW, createWidget, groupByRows, moveWidget, normalizeRows } from '../../data/widgetDefaults.js'
import PropertiesWidget from './PropertiesWidget.jsx'
import TextWidget from './TextWidget.jsx'
import ImageWidget from './ImageWidget.jsx'
import ChartWidget from './ChartWidget.jsx'
import MapWidget from './MapWidget.jsx'
import FamilyTreeWidget from './FamilyTreeWidget.jsx'
import GraphWidget from './GraphWidget.jsx'

const LONG_PRESS_MS = 150
const ADDABLE_TYPES = WIDGET_TYPES.filter(wt => !['properties', 'image'].includes(wt.id))

// ─── Editable widget title (double-click to rename) ─────────
function WidgetTitle({ name, onRename }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  const inputRef = useRef()

  useEffect(() => { setValue(name) }, [name])
  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])

  const commit = () => {
    setEditing(false)
    const trimmed = value.trim()
    if (trimmed && trimmed !== name) onRename(trimmed)
    else setValue(name)
  }

  if (editing) {
    return (
      <input ref={inputRef} autoFocus value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setValue(name); setEditing(false) } }}
        onBlur={commit}
        onPointerDown={e => e.stopPropagation()}
        style={{ fontSize: 13, color: 'var(--accent,#c8a064)', fontWeight: 600, fontFamily: 'var(--font)', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--accent-30,rgba(200,160,100,0.3))', borderRadius: 4, padding: '1px 6px', outline: 'none', minWidth: 40 }}
      />
    )
  }

  return (
    <span onDoubleClick={() => setEditing(true)}
      style={{ fontSize: 13, color: 'var(--accent,#c8a064)', fontWeight: 600, fontFamily: 'var(--font)', cursor: 'default' }}>
      {name}
    </span>
  )
}

// ─── Error boundary for widgets ──────────────────────────────
class WidgetErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 12, color: '#888', fontSize: 11 }}>
        Erreur dans le widget
        <button onClick={() => this.setState({ error: null })} style={{ marginLeft: 8, background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#aaa', cursor: 'pointer', fontSize: 10, padding: '2px 6px' }}>Réessayer</button>
      </div>
    )
    return this.props.children
  }
}

// ─── WidgetGrid ─────────────────────────────────────────────
export default function WidgetGrid({
  layout, card, cards, customTypes, allTypes, calendars,
  onUpdateCard, onUpdateLayout, editMode,
  onOpenCard, onCreateCard,
}) {
  const [dragging, setDragging] = useState(null)
  // dropTarget: { row, side: 'above'|'below'|'into', posInRow?: number }
  const [dropTarget, setDropTarget] = useState(null)
  const [menuWidgetId, setMenuWidgetId] = useState(null)
  const longPressRef = useRef(null)
  const containerRef = useRef()
  const ghostRef = useRef()

  const rows = groupByRows(layout)

  // ─── Long-press to start drag ──────────────────────────────
  const onPointerDown = useCallback((e, widget) => {
    if (e.button !== 0) return
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top

    longPressRef.current = setTimeout(() => {
      longPressRef.current = null
      el.releasePointerCapture?.(e.pointerId)
      setDragging({ id: widget.id, el, startX, startY, offsetX, offsetY, w: rect.width, h: rect.height })
    }, LONG_PRESS_MS)

    const onMoveCancel = (ev) => {
      if (Math.abs(ev.clientX - startX) > 8 || Math.abs(ev.clientY - startY) > 8) {
        clearTimeout(longPressRef.current)
        longPressRef.current = null
        document.removeEventListener('pointermove', onMoveCancel)
      }
    }
    const onUpCancel = () => {
      clearTimeout(longPressRef.current)
      longPressRef.current = null
      document.removeEventListener('pointermove', onMoveCancel)
      document.removeEventListener('pointerup', onUpCancel)
    }
    document.addEventListener('pointermove', onMoveCancel)
    document.addEventListener('pointerup', onUpCancel)
  }, [])

  // ─── Drag move & drop ─────────────────────────────────────
  useEffect(() => {
    if (!dragging) return

    const onMove = (e) => {
      if (ghostRef.current) {
        ghostRef.current.style.left = (e.clientX - dragging.offsetX) + 'px'
        ghostRef.current.style.top = (e.clientY - dragging.offsetY) + 'px'
      }
      if (!containerRef.current) return
      const rowEls = containerRef.current.querySelectorAll('[data-row-idx]')
      let best = null
      let bestDist = Infinity

      rowEls.forEach(rowEl => {
        const rect = rowEl.getBoundingClientRect()
        const rowIdx = parseInt(rowEl.dataset.rowIdx)
        const rowWidgets = rows[rowIdx] || []
        const rowWidgetCount = rowWidgets.length
        const draggedInRow = rowWidgets.some(w => w.id === dragging.id)
        const effectiveCount = draggedInRow ? rowWidgetCount - 1 : rowWidgetCount

        // Check above/below edges
        const distAbove = Math.abs(e.clientY - rect.top)
        if (distAbove < bestDist && distAbove < 24) {
          bestDist = distAbove
          best = { row: rowWidgets[0]?.row ?? rowIdx, side: 'above' }
        }
        const distBelow = Math.abs(e.clientY - rect.bottom)
        if (distBelow < bestDist && distBelow < 24) {
          bestDist = distBelow
          best = { row: rowWidgets[0]?.row ?? rowIdx, side: 'below' }
        }

        // Check inside row — detect left/right position between widgets
        if (e.clientY > rect.top + 16 && e.clientY < rect.bottom - 16) {
          if (effectiveCount >= MAX_PER_ROW && !draggedInRow) return
          // Find which position within the row
          const widgetEls = rowEl.querySelectorAll('[data-widget-id]')
          let posInRow = rowWidgets.length // default: append at end
          widgetEls.forEach((wEl, i) => {
            const wr = wEl.getBoundingClientRect()
            const midX = wr.left + wr.width / 2
            if (e.clientX < midX && posInRow > i) {
              posInRow = i
            }
          })
          best = { row: rowWidgets[0]?.row ?? rowIdx, side: 'into', posInRow }
          bestDist = -1
        }
      })
      setDropTarget(best)
    }

    const onUp = () => {
      if (dropTarget) {
        const targetRow = dropTarget.row
        if (dropTarget.side === 'above') {
          onUpdateLayout(moveWidget(layout, dragging.id, targetRow, 'new-row'))
        } else if (dropTarget.side === 'below') {
          onUpdateLayout(moveWidget(layout, dragging.id, targetRow + 1, 'new-row'))
        } else {
          // into row at specific position
          const posInRow = dropTarget.posInRow ?? 0
          const next = layout.filter(w => w.id !== dragging.id)
          const draggedWidget = layout.find(w => w.id === dragging.id)
          if (draggedWidget) {
            const updated = { ...draggedWidget, row: targetRow }
            // Find where to insert: collect row widgets in order, insert at posInRow
            const rowWidgets = next.filter(w => w.row === targetRow)
            const otherWidgets = next.filter(w => w.row !== targetRow)
            rowWidgets.splice(posInRow, 0, updated)
            // Rebuild layout: other widgets in order, then this row's widgets
            const result = []
            let inserted = false
            for (const w of next) {
              if (w.row === targetRow) {
                if (!inserted) {
                  result.push(...rowWidgets)
                  inserted = true
                }
              } else {
                result.push(w)
              }
            }
            if (!inserted) result.push(...rowWidgets)
            onUpdateLayout(normalizeRows(result))
          }
        }
      }
      setDragging(null)
      setDropTarget(null)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
  }, [dragging, dropTarget, layout, rows, onUpdateLayout])

  const removeWidget = id => { onUpdateLayout(normalizeRows(layout.filter(w => w.id !== id))); setMenuWidgetId(null) }
  const duplicateWidget = id => {
    const w = layout.find(x => x.id === id)
    if (!w) return
    const copy = { ...w, id: '_dup_' + Date.now() + Math.random().toString(36).slice(2, 6) }
    onUpdateLayout(normalizeRows([...layout, copy]))
    setMenuWidgetId(null)
  }
  const toggleHideTitle = id => {
    onUpdateLayout(layout.map(w => w.id === id ? { ...w, config: { ...w.config, hideTitle: !w.config?.hideTitle } } : w))
    setMenuWidgetId(null)
  }

  const addWidget = typeId => {
    const w = createWidget(typeId, layout)
    if (w) onUpdateLayout(normalizeRows([...layout, w]))
  }

  const updateWidgetConfig = (id, configPatch) => {
    onUpdateLayout(layout.map(w => w.id === id ? { ...w, config: { ...w.config, ...configPatch } } : w))
  }

  return (
    <div ref={containerRef} style={{ flex: 1, overflow: 'auto', padding: '12px 16px 48px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: WIDGET_GAP }}>
        {rows.map((rowWidgets, rowIdx) => {
          const rowNum = rowWidgets[0]?.row ?? rowIdx
          const showAbove = dragging && dropTarget?.row === rowNum && dropTarget?.side === 'above'
          const showBelow = dragging && dropTarget?.row === rowNum && dropTarget?.side === 'below'
          const isIntoTarget = dragging && dropTarget?.row === rowNum && dropTarget?.side === 'into'

          return (
            <React.Fragment key={rowNum}>
              {showAbove && <DropIndicator horizontal />}

              <div data-row-idx={rowIdx} style={{
                display: 'flex', gap: WIDGET_GAP,
                borderRadius: 10,
                position: 'relative',
              }}>
                {rowWidgets.map((widget, widgetIdx) => {
                  const isDragged = dragging?.id === widget.id
                  const wt = WIDGET_TYPES.find(t => t.id === widget.type)
                  const hideTitle = widget.config?.hideTitle
                  const isConfigOpen = widget.config?.showSettings
                  const extraMenuItems = widget.type === 'graph' || widget.type === 'chart' ? [
                    { icon: 'settings', label: isConfigOpen ? 'Fermer la configuration' : 'Configuration', onClick: () => { updateWidgetConfig(widget.id, { showSettings: !isConfigOpen }); setMenuWidgetId(null) } }
                  ] : []
                  // Show vertical drop indicator before this widget
                  const showInsertBefore = isIntoTarget && dropTarget.posInRow === widgetIdx
                  return (
                    <React.Fragment key={widget.id}>
                      {showInsertBefore && <DropIndicator vertical />}
                      <div data-widget-id={widget.id} style={{
                        flex: widget.flex || 1, minWidth: 0,
                        opacity: isDragged ? 0.3 : 1,
                        position: 'relative',
                        display: 'flex', flexDirection: 'column',
                        transition: 'opacity 0.12s',
                      }}>
                        {/* Title bar */}
                        {!hideTitle && (
                          <div
                            onPointerDown={e => onPointerDown(e, widget)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '4px 2px',
                              cursor: editMode ? 'grab' : 'default',
                              userSelect: 'none',
                            }}>
                            {editMode && <span style={{ fontSize: 10, color: '#555', letterSpacing: 1 }}>⠿</span>}
                            <WidgetTitle
                              name={widget.config?.customName || wt?.name || widget.type}
                              onRename={name => updateWidgetConfig(widget.id, { customName: name })}
                            />
                            <div style={{ flex: 1 }} />
                            <WidgetMenu
                              open={menuWidgetId === widget.id}
                              onToggle={() => setMenuWidgetId(menuWidgetId === widget.id ? null : widget.id)}
                              onHideTitle={() => toggleHideTitle(widget.id)}
                              onDuplicate={() => duplicateWidget(widget.id)}
                              onDelete={() => removeWidget(widget.id)}
                              hideTitle={hideTitle}
                              extraItems={extraMenuItems}
                            />
                          </div>
                        )}

                        {/* Widget content */}
                        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                          <WidgetErrorBoundary key={widget.id}>
                            <WidgetRenderer
                              widget={widget} card={card} cards={cards}
                              customTypes={customTypes} allTypes={allTypes} calendars={calendars}
                              onUpdateCard={onUpdateCard} onOpenCard={onOpenCard} onCreateCard={onCreateCard}
                              layout={layout} onUpdateConfig={cfg => updateWidgetConfig(widget.id, cfg)}
                            />
                          </WidgetErrorBoundary>
                        </div>

                        {/* If title hidden, show menu overlay */}
                        {hideTitle && (
                          <div style={{ position: 'absolute', top: 2, right: 2, zIndex: 5 }}>
                            <WidgetMenu
                              open={menuWidgetId === widget.id}
                              onToggle={() => setMenuWidgetId(menuWidgetId === widget.id ? null : widget.id)}
                              onHideTitle={() => toggleHideTitle(widget.id)}
                              onDuplicate={() => duplicateWidget(widget.id)}
                              onDelete={() => removeWidget(widget.id)}
                              hideTitle={hideTitle}
                              extraItems={extraMenuItems}
                            />
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  )
                })}
                {/* Insert indicator after last widget */}
                {isIntoTarget && dropTarget.posInRow >= rowWidgets.length && <DropIndicator vertical />}
              </div>

              {showBelow && <DropIndicator horizontal />}
            </React.Fragment>
          )
        })}
      </div>

      {/* Add widget buttons — one per type */}
      {editMode && (
        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {ADDABLE_TYPES.map(wt => (
            <button key={wt.id} onClick={() => addWidget(wt.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
                background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, color: '#888', fontSize: 11, cursor: 'pointer',
                transition: 'all 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = '#ccc' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#888' }}>
              <span style={{ fontSize: 13 }}>{wt.icon}</span> {wt.name}
            </button>
          ))}
        </div>
      )}

      {/* Drag ghost */}
      {dragging && (
        <div ref={ghostRef} style={{
          position: 'fixed', pointerEvents: 'none', zIndex: 9999,
          width: dragging.w, height: Math.min(dragging.h, 120),
          opacity: 0.7, borderRadius: 12,
          background: 'var(--bg-panel-55,rgba(10,6,1,0.55))',
          border: '2px solid var(--accent,#c8a064)',
          backdropFilter: 'blur(20px)',
          overflow: 'hidden',
          left: dragging.startX - dragging.offsetX,
          top: dragging.startY - dragging.offsetY,
        }}>
          <div style={{ padding: 8, fontSize: 11, color: 'var(--accent,#c8a064)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="move" size={10} />
            {WIDGET_TYPES.find(t => t.id === layout.find(w => w.id === dragging.id)?.type)?.name || ''}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 3-dot widget menu ───────────────────────────────────────
function WidgetMenu({ open, onToggle, onHideTitle, onDuplicate, onDelete, hideTitle, extraItems }) {
  const ref = useRef()

  useEffect(() => {
    if (!open) return
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onToggle() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open, onToggle])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <span onClick={e => { e.stopPropagation(); onToggle() }}
        style={{ fontSize: 14, cursor: 'pointer', color: '#555', transition: 'color 0.1s', padding: '0 4px', lineHeight: 1 }}
        onMouseEnter={e => e.currentTarget.style.color = '#ccc'}
        onMouseLeave={e => e.currentTarget.style.color = '#555'}>⋮</span>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, zIndex: 500, marginTop: 4,
          background: 'var(--bg-panel-92,rgba(10,6,1,0.92))', backdropFilter: 'blur(40px) saturate(1.5)', WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
          width: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.8)', overflow: 'hidden',
        }}>
          {extraItems && extraItems.map((item, i) => (
            <MenuItemRow key={i} icon={item.icon} label={item.label} onClick={item.onClick} />
          ))}
          {extraItems && extraItems.length > 0 && <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />}
          <MenuItemRow icon="eye_off" label={hideTitle ? 'Afficher la barre de titre' : 'Masquer la barre de titre'} onClick={onHideTitle} />
          <MenuItemRow icon="copy" label="Copier le bloc" onClick={onDuplicate} />
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />
          <MenuItemRow icon="trash" label="Supprimer" onClick={onDelete} danger />
        </div>
      )}
    </div>
  )
}

function MenuItemRow({ icon, label, onClick, danger }) {
  return (
    <div onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 12, color: danger ? '#c06060' : '#ccc', transition: 'background 0.08s' }}
      onMouseEnter={e => e.currentTarget.style.background = danger ? 'rgba(200,80,80,0.08)' : 'rgba(255,255,255,0.05)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <Icon name={icon} size={13} />
      <span>{label}</span>
    </div>
  )
}

// ─── Drop indicators ─────────────────────────────────────────
function DropIndicator({ vertical }) {
  if (vertical) {
    return (
      <div style={{
        width: 3, alignSelf: 'stretch', borderRadius: 2, flexShrink: 0,
        background: 'var(--accent,#c8a064)',
      }} />
    )
  }
  return (
    <div style={{
      height: 3, borderRadius: 2,
      background: 'var(--accent,#c8a064)',
      margin: '0 8px',
    }} />
  )
}

// ─── Widget renderer ─────────────────────────────────────────
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
    case 'graph':
      return <GraphWidget widget={widget} card={card} cards={cards} customTypes={customTypes} onOpenCard={onOpenCard} onUpdateConfig={onUpdateConfig} />
    default:
      return <div style={{ padding: 12, color: '#888', fontSize: 11 }}>Widget inconnu: {widget.type}</div>
  }
}

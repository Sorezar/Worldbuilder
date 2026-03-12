import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Icon, Btn, ColorPicker, EmojiPicker } from '../components/ui.jsx'
import { BUILTIN_TYPES, FIELD_TYPES } from '../data/types.js'
import { uid } from '../store/useStore.js'
import { WIDGET_TYPES, DEFAULT_CARD_LAYOUT, COLS, RESIZE_HANDLES, createWidget, resolveCollisions } from '../data/widgetDefaults.js'

export default function CardTypesView({ customTypes, onUpdateType, onCreateCustomType, onDeleteType }) {
  const typeMap = new Map()
  BUILTIN_TYPES.filter(t => !t.virtual).forEach(t => typeMap.set(t.id, t))
  ;(customTypes||[]).forEach(t => typeMap.set(t.id, t))
  const dedupedTypes = [...typeMap.values()]

  const [selected, setSelected] = useState(dedupedTypes[0]?.id || null)
  const [search,   setSearch]   = useState('')
  const [creating, setCreating] = useState(false)

  const selectedType = typeMap.get(selected)
  const isBuiltin    = BUILTIN_TYPES.some(t => t.id===selected) && !(customTypes||[]).some(t => t.id===selected)
  const rootTypes    = dedupedTypes.filter(t => !t.parentId)
  const filtered     = search ? dedupedTypes.filter(t => t.name.toLowerCase().includes(search.toLowerCase())) : null
  const displayList  = filtered || rootTypes

  return (
    <div style={{ display:'flex', height:'100%' }}>
      {/* Left tree */}
      <div style={{ width:240, flexShrink:0, borderRight:'1px solid var(--border-14,rgba(255,200,120,0.08))', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'10px 10px 8px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', gap:7, alignItems:'center' }}>
          <div style={{ position:'relative', flex:1 }}>
            <Icon name="search" size={11} style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:'var(--text-darker,#2e2e2e)' }} />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher…"
              style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'none', borderRadius:6, padding:'5px 8px 5px 22px', color:'var(--text-secondary,#c0c0c0)', fontSize:12, outline:'none' }} />
          </div>
          <button onClick={() => { setCreating(true); setSelected(null) }} style={{ background:'none', border:'1px solid rgba(255,255,255,0.09)', borderRadius:6, color:'var(--text-dim,#5a5a5a)', cursor:'pointer', padding:'4px 7px', fontSize:11 }}
            onMouseEnter={e=>e.currentTarget.style.color='var(--accent,#c8a064)'} onMouseLeave={e=>e.currentTarget.style.color='var(--text-dim,#5a5a5a)'}>
            <Icon name="plus" size={12} />
          </button>
        </div>
        <div style={{ flex:1, overflow:'auto', padding:'5px 6px' }}>
          {displayList.map(type => (
            <TypeTreeItem key={type.id} type={type} typeMap={typeMap} selected={selected}
              onSelect={id => { setSelected(id); setCreating(false) }}
              filtered={!!search} customTypes={customTypes||[]} />
          ))}
        </div>
        <div style={{ padding:'8px 12px', borderTop:'1px solid rgba(255,255,255,0.05)', fontSize:11, color:'var(--text-darker,#2e2e2e)' }}>
          {dedupedTypes.length} types
        </div>
      </div>

      {/* Right editor */}
      <div style={{ flex:1, overflow:'auto', padding:'20px 24px' }}>
        {creating ? (
          <InlineNewType allTypes={dedupedTypes}
            onCancel={() => { setCreating(false); setSelected(dedupedTypes[0]?.id||null) }}
            onCreate={data => { const t=onCreateCustomType(data); setSelected(t.id); setCreating(false) }}
          />
        ) : selectedType ? (
          <TypeEditor
            key={selected+JSON.stringify(selectedType.defaultProps)}
            type={selectedType} isBuiltin={isBuiltin} allTypes={dedupedTypes}
            onUpdate={patch => onUpdateType(selectedType.id, patch)}
            onDelete={() => {
              if (!BUILTIN_TYPES.some(t => t.id===selectedType.id)) {
                if (window.confirm(`Supprimer "${selectedType.name}" ?`)) { onDeleteType(selectedType.id); setSelected(dedupedTypes[0]?.id||null) }
              }
            }}
          />
        ) : (
          <div style={{ textAlign:'center', paddingTop:60, color:'var(--text-darker,#2e2e2e)' }}>Sélectionnez un type</div>
        )}
      </div>
    </div>
  )
}

// ─── TypeTreeItem ─────────────────────────────────────────────
function TypeTreeItem({ type, typeMap, selected, onSelect, depth=0, filtered, customTypes }) {
  const [expanded, setExpanded] = useState(false)
  const children   = [...typeMap.values()].filter(t => t.parentId===type.id)
  const isSelected = selected===type.id
  const isOverridden = customTypes.some(t => t.id===type.id)

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:`5px 8px 5px ${8+depth*14}px`, borderRadius:6, cursor:'pointer', marginBottom:1, background: isSelected?'var(--accent-10)':'transparent', transition:'background 0.1s' }}
        onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background='rgba(255,255,255,0.04)' }}
        onMouseLeave={e => { if(!isSelected) e.currentTarget.style.background='transparent' }}>
        <span style={{ fontSize:14, width:18, textAlign:'center', flexShrink:0 }}>{type.icon}</span>
        <span onClick={() => onSelect(type.id)} style={{ flex:1, fontSize:12, color: isSelected?'var(--text-primary,#f0f0f0)':'var(--text-muted,#8a8a8a)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{type.name}</span>
        {isOverridden && BUILTIN_TYPES.some(t=>t.id===type.id) && <span style={{ fontSize:9, color:'var(--accent,#c8a064)', opacity:0.6, flexShrink:0 }}>✦</span>}
        {/* Expand arrow — RIGHT */}
        {!filtered && children.length > 0
          ? <span onClick={e => { e.stopPropagation(); setExpanded(!expanded) }} style={{ display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-dark,#444444)', flexShrink:0, width:16 }}>
              <Icon name={expanded?'chevron_down':'chevron_right'} size={10} />
            </span>
          : <span style={{ width:16, flexShrink:0 }} />
        }
      </div>
      {expanded && !filtered && children.map(child => (
        <TypeTreeItem key={child.id} type={child} typeMap={typeMap} selected={selected} onSelect={onSelect} depth={depth+1} customTypes={customTypes} />
      ))}
    </div>
  )
}

// ─── TypeEditor ───────────────────────────────────────────────
const MINI_GAP = 4
const MINI_ROW_FALLBACK = 8 // fallback — actual row height computed as column width (square cells)

function TypeEditor({ type, isBuiltin, allTypes, onUpdate, onDelete }) {
  const [color,      setColor]      = useState(type.color||'#c8a064')
  const [layoutWidgets, setLayoutWidgets] = useState(type.defaultLayout || null)
  const [selectedWidgetId, setSelectedWidgetId] = useState(null)
  const [showAddWidget, setShowAddWidget] = useState(false)

  // Props state (for properties widget config)
  const [props, setProps] = useState(type.defaultProps||[])
  const [addingProp, setAddingProp] = useState(false)
  const [dragPropId, setDragPropId] = useState(null)
  const [dragOverInfo, setDragOverInfo] = useState(null)

  // Grid drag/resize state
  const [dragging, setDragging] = useState(null)
  const [resizing, setResizing] = useState(null)
  const [previewLayout, setPreviewLayout] = useState(null)
  const gridRef = useRef()
  const pushRef = useRef({ timer: null, pos: null })
  const [miniRowH, setMiniRowH] = useState(MINI_ROW_FALLBACK)

  // Compute square cell height from grid width
  useEffect(() => {
    if (!gridRef.current) return
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const cw = Math.floor((e.contentRect.width - MINI_GAP * (COLS - 1)) / COLS)
        if (cw > 0) setMiniRowH(cw)
      }
    })
    ro.observe(gridRef.current)
    return () => ro.disconnect()
  }, [])

  const currentLayout = layoutWidgets || DEFAULT_CARD_LAYOUT
  const displayLayout = previewLayout || currentLayout
  const selectedWidget = selectedWidgetId ? displayLayout.find(w => w.id === selectedWidgetId) : null

  const ensureCustomLayout = () => {
    if (!layoutWidgets) {
      const copy = DEFAULT_CARD_LAYOUT.map(w => ({ ...w }))
      setLayoutWidgets(copy)
      return copy
    }
    return layoutWidgets
  }

  const updateLayout = newLayout => {
    setLayoutWidgets(newLayout)
    onUpdate({ defaultLayout: newLayout })
  }

  // ── Grid drag/resize logic ──
  const getGridCellSize = useCallback(() => {
    if (!gridRef.current) return { cw: miniRowH, ch: miniRowH }
    const rect = gridRef.current.getBoundingClientRect()
    const cw = (rect.width - MINI_GAP * (COLS - 1)) / COLS
    return { cw, ch: cw } // square cells
  }, [miniRowH])

  const onGridDragStart = useCallback((e, widget) => {
    e.preventDefault(); e.stopPropagation()
    const layout = ensureCustomLayout()
    setDragging({ id: widget.id, startX: e.clientX, startY: e.clientY, origX: widget.x, origY: widget.y })
    setPreviewLayout(layout.map(w => ({ ...w })))
  }, [layoutWidgets])

  const onGridResizeStart = useCallback((e, widget, edges) => {
    e.preventDefault(); e.stopPropagation()
    const layout = ensureCustomLayout()
    setResizing({ id: widget.id, startX: e.clientX, startY: e.clientY, origX: widget.x, origY: widget.y, origW: widget.w, origH: widget.h, edges })
    setPreviewLayout(layout.map(w => ({ ...w })))
  }, [layoutWidgets])

  useEffect(() => {
    if (!dragging && !resizing) return
    const layout = layoutWidgets || DEFAULT_CARD_LAYOUT
    const { cw, ch } = getGridCellSize()

    const onMove = e => {
      if (dragging) {
        const dx = Math.round((e.clientX - dragging.startX) / (cw + MINI_GAP))
        const dy = Math.round((e.clientY - dragging.startY) / (ch + MINI_GAP))
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
        const minW = wt?.minW || 4, minH = wt?.minH || 2
        const dxC = Math.round((e.clientX - resizing.startX) / (cw + MINI_GAP))
        const dyC = Math.round((e.clientY - resizing.startY) / (ch + MINI_GAP))
        let nX = resizing.origX, nY = resizing.origY, nW = resizing.origW, nH = resizing.origH
        if (resizing.edges.right) nW = resizing.origW + dxC
        if (resizing.edges.left) { nX = resizing.origX + dxC; nW = resizing.origW - dxC }
        if (resizing.edges.bottom) nH = resizing.origH + dyC
        if (resizing.edges.top) { nY = resizing.origY + dyC; nH = resizing.origH - dyC }
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
        updateLayout(activeId ? resolveCollisions(previewLayout, activeId) : previewLayout)
      }
      setDragging(null); setResizing(null); setPreviewLayout(null)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
  }, [dragging, resizing, previewLayout, layoutWidgets, getGridCellSize])

  const removeWidget = id => {
    const layout = ensureCustomLayout()
    const updated = layout.filter(w => w.id !== id)
    updateLayout(updated)
    if (selectedWidgetId === id) setSelectedWidgetId(null)
  }

  const addWidget = typeId => {
    const layout = ensureCustomLayout()
    const w = createWidget(typeId, layout)
    if (w) updateLayout([...layout, w])
    setShowAddWidget(false)
  }

  // ── Prop editing (for properties widget config) ──
  const handlePropDragStart = (e, propId) => { setDragPropId(propId); e.dataTransfer.effectAllowed = 'move' }
  const handlePropDragOver = (e, propId) => {
    e.preventDefault()
    if (propId === dragPropId) { setDragOverInfo(null); return }
    const rect = e.currentTarget.getBoundingClientRect()
    setDragOverInfo({ propId, position: e.clientY < rect.top + rect.height / 2 ? 'above' : 'below' })
  }
  const handlePropDrop = (e) => {
    e.preventDefault()
    if (!dragPropId || !dragOverInfo || dragPropId === dragOverInfo.propId) { setDragPropId(null); setDragOverInfo(null); return }
    const fromIdx = props.findIndex(p => p.id === dragPropId)
    let toIdx = props.findIndex(p => p.id === dragOverInfo.propId)
    if (fromIdx < 0 || toIdx < 0) { setDragPropId(null); setDragOverInfo(null); return }
    const updated = [...props]
    const [moved] = updated.splice(fromIdx, 1)
    if (fromIdx < toIdx) toIdx--
    if (dragOverInfo.position === 'below') toIdx++
    updated.splice(toIdx, 0, moved)
    setProps(updated); onUpdate({ defaultProps: updated })
    setDragPropId(null); setDragOverInfo(null)
  }
  const handlePropDragEnd = () => { setDragPropId(null); setDragOverInfo(null) }

  const addProp = prop => {
    const updated = [...props, { ...prop, id:uid() }]
    setProps(updated); onUpdate({ defaultProps:updated }); setAddingProp(false)
  }
  const removeProp = id => { const updated = props.filter(p => p.id!==id); setProps(updated); onUpdate({ defaultProps:updated }) }
  const renameProp = (id, name) => { const updated = props.map(p => p.id===id ? { ...p, name } : p); setProps(updated); onUpdate({ defaultProps:updated }) }

  const updateWidgetConfig = configPatch => {
    const layout = ensureCustomLayout()
    const updated = layout.map(w => w.id === selectedWidgetId ? { ...w, config: { ...w.config, ...configPatch } } : w)
    updateLayout(updated)
  }

  const activeGridId = dragging?.id || resizing?.id
  const maxRow = displayLayout.reduce((max, w) => Math.max(max, w.y + w.h), 0)

  return (
    <div className="anim-fadeup">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22, paddingBottom:14, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <EmojiPicker value={type.icon} onChange={ic => onUpdate({ icon: ic })} style={{ flexShrink:0 }} />
          <h2 style={{ fontFamily:"var(--font)", fontSize:18, color:'var(--text-primary,#f0f0f0)', fontWeight:500, margin:0 }}>{type.name}</h2>
          {isBuiltin && <span style={{ fontSize:10, color:'var(--text-dim,#5a5a5a)', background:'rgba(255,255,255,0.04)', padding:'2px 6px', borderRadius:4 }}>Integre</span>}
        </div>
        {!BUILTIN_TYPES.some(t=>t.id===type.id) && (
          <button onClick={onDelete} style={{ background:'none', border:'none', color:'var(--text-darker,#2e2e2e)', cursor:'pointer', fontSize:12 }}
            onMouseEnter={e=>e.currentTarget.style.color='var(--danger,#e05040)'} onMouseLeave={e=>e.currentTarget.style.color='var(--text-darker,#2e2e2e)'}>
            <Icon name="trash" size={14} />
          </button>
        )}
      </div>

      {/* Layout par défaut — Grid editor */}
      <section style={{ marginBottom:26 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <h3 style={{ fontFamily:"var(--font)", fontSize:15, color:'var(--text-secondary,#c0c0c0)', fontWeight:500, margin:0 }}>Layout par defaut</h3>
          {layoutWidgets && (
            <button onClick={() => { setLayoutWidgets(null); onUpdate({ defaultLayout: null }); setSelectedWidgetId(null) }}
              style={{ background:'none', border:'none', color:'var(--text-darker,#2e2e2e)', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', gap:4 }}
              onMouseEnter={e => e.currentTarget.style.color='var(--accent,#c8a064)'}
              onMouseLeave={e => e.currentTarget.style.color='var(--text-darker,#2e2e2e)'}>
              <Icon name="refresh" size={10} /> Reinitialiser
            </button>
          )}
        </div>

        {/* Mini grid */}
        <div ref={gridRef} onClick={() => setSelectedWidgetId(null)} style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridAutoRows: miniRowH,
          gap: MINI_GAP,
          position: 'relative',
          minHeight: Math.max(4, maxRow) * (miniRowH + MINI_GAP),
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.06)',
          padding: 6,
        }}>
          {displayLayout.map(widget => {
            const wt = WIDGET_TYPES.find(t => t.id === widget.type)
            const isSelected = selectedWidgetId === widget.id
            const isActive = activeGridId === widget.id

            return (
              <div key={widget.id}
                onClick={e => { e.stopPropagation(); setSelectedWidgetId(isSelected ? null : widget.id) }}
                style={{
                  gridColumn: `${widget.x + 1} / span ${widget.w}`,
                  gridRow: `${widget.y + 1} / span ${widget.h}`,
                  background: isSelected ? 'var(--accent-12,rgba(200,160,100,0.12))' : 'rgba(255,255,255,0.04)',
                  border: isSelected ? '2px solid var(--accent-30,rgba(200,160,100,0.3))' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  fontSize: 11, color: isSelected ? 'var(--accent,#c8a064)' : 'var(--text-muted,#8a8a8a)',
                  cursor: 'pointer', position: 'relative',
                  overflow: 'visible',
                  opacity: isActive ? 0.7 : 1,
                  transition: previewLayout ? (isActive ? 'none' : 'all 0.15s ease') : 'opacity 0.15s, background 0.1s',
                  userSelect: 'none',
                }}>
                <span style={{ pointerEvents: 'none' }}>{wt?.icon}</span>
                <span style={{ pointerEvents: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wt?.name}</span>

                {isSelected && (
                  <>
                    {/* Drag surface */}
                    <div onMouseDown={e => onGridDragStart(e, widget)}
                      onClick={e => e.stopPropagation()}
                      style={{ position: 'absolute', inset: 6, cursor: 'grab', zIndex: 10 }} />
                    {/* 8 resize handles */}
                    {RESIZE_HANDLES.map(h => (
                      <div key={h.id} onMouseDown={e => onGridResizeStart(e, widget, h.edges)}
                        onClick={e => e.stopPropagation()}
                        style={{
                          position: 'absolute', ...h.style,
                          width: 6, height: 6, borderRadius: 3,
                          background: 'var(--accent,#c8a064)', border: '1px solid rgba(0,0,0,0.3)',
                          cursor: h.cursor, zIndex: 11,
                        }} />
                    ))}
                    {/* Delete button */}
                    <button onClick={e => { e.stopPropagation(); removeWidget(widget.id) }}
                      style={{ position: 'absolute', top: -7, right: -7, zIndex: 12, width: 14, height: 14, borderRadius: 7, background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.15)', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, padding: 0 }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--danger,#ef4444)'}
                      onMouseLeave={e => e.currentTarget.style.color = '#888'}>
                      ✕
                    </button>
                  </>
                )}
              </div>
            )
          })}

          {/* No ghost needed — pushed widgets animate to new positions */}
        </div>

        {/* Add widget */}
        <div style={{ marginTop: 8, position: 'relative' }}>
          {showAddWidget ? (
            <LayoutAddWidgetMenu
              onAdd={addWidget}
              onClose={() => setShowAddWidget(false)}
            />
          ) : (
            <button onClick={() => setShowAddWidget(true)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 11px', width:'100%', background:'rgba(255,255,255,0.02)', border:'1px dashed rgba(255,255,255,0.07)', borderRadius:7, color:'var(--text-dark,#444444)', fontSize:11, cursor:'pointer', transition:'all 0.1s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent-22)'; e.currentTarget.style.color='var(--accent,#c8a064)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; e.currentTarget.style.color='var(--text-dark,#444444)' }}>
              <Icon name="plus" size={11} /> Ajouter un widget
            </button>
          )}
        </div>
      </section>

      {/* Selected widget config */}
      {selectedWidget && (
        <section style={{ marginBottom:26, padding:'14px 16px', background:'rgba(255,255,255,0.02)', borderRadius:12, border:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12 }}>
            <span style={{ fontSize:14 }}>{WIDGET_TYPES.find(t => t.id === selectedWidget.type)?.icon}</span>
            <h3 style={{ fontFamily:"var(--font)", fontSize:14, color:'var(--accent,#c8a064)', fontWeight:500, margin:0 }}>
              {WIDGET_TYPES.find(t => t.id === selectedWidget.type)?.name} — Configuration
            </h3>
          </div>

          {selectedWidget.type === 'properties' && (() => {
            const claimedByOther = new Set()
            displayLayout.forEach(w => {
              if (w.type === 'properties' && w.id !== selectedWidget.id && Array.isArray(w.config?.propIds)) {
                w.config.propIds.forEach(id => claimedByOther.add(id))
              }
            })
            return <>
              {/* Prop filter for this widget */}
              <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-dim,#5a5a5a)', marginBottom: 8 }}>Propriétés affichées</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer', fontSize: 12, color: 'var(--text-muted,#8a8a8a)' }}>
                  <input type="radio" name={`propFilter_${selectedWidget.id}`}
                    checked={!selectedWidget.config?.propIds || selectedWidget.config.propIds === 'all'}
                    onChange={() => updateWidgetConfig({ propIds: 'all' })}
                    style={{ accentColor: 'var(--accent,#c8a064)' }} />
                  Toutes (hors sélectionnées ailleurs)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--text-muted,#8a8a8a)' }}>
                  <input type="radio" name={`propFilter_${selectedWidget.id}`}
                    checked={Array.isArray(selectedWidget.config?.propIds)}
                    onChange={() => updateWidgetConfig({ propIds: [] })}
                    style={{ accentColor: 'var(--accent,#c8a064)' }} />
                  Sélection
                </label>
                {Array.isArray(selectedWidget.config?.propIds) && (
                  <div style={{ marginTop: 6, marginLeft: 20 }}>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--accent,#c8a064)', cursor: 'pointer' }}
                        onClick={() => updateWidgetConfig({ propIds: props.filter(p => !claimedByOther.has(p.id)).map(p => p.id) })}>
                        Tout sélectionner
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--accent,#c8a064)', cursor: 'pointer' }}
                        onClick={() => updateWidgetConfig({ propIds: [] })}>
                        Tout désélectionner
                      </span>
                    </div>
                    {props.map(p => {
                      const claimed = claimedByOther.has(p.id)
                      return (
                        <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0', cursor: claimed ? 'default' : 'pointer', fontSize: 12, color: claimed ? 'var(--text-darker,#2e2e2e)' : 'var(--text-muted,#8a8a8a)', opacity: claimed ? 0.5 : 1 }}>
                          <input type="checkbox"
                            disabled={claimed}
                            checked={(selectedWidget.config?.propIds || []).includes(p.id)}
                            onChange={e => {
                              const current = selectedWidget.config?.propIds || []
                              const updated = e.target.checked ? [...current, p.id] : current.filter(id => id !== p.id)
                              updateWidgetConfig({ propIds: updated })
                            }}
                            style={{ accentColor: 'var(--accent,#c8a064)' }} />
                          <span style={{ fontSize: 10 }}>{p.emoji || 'T'}</span>
                          {p.name}{claimed ? ' (autre widget)' : ''}
                        </label>
                      )
                    })}
                    {props.length === 0 && <span style={{ fontSize: 11, color: 'var(--text-darker,#2e2e2e)' }}>Aucune propriété définie</span>}
                  </div>
                )}
              </div>

              {/* Type default props management */}
              <div style={{ fontSize: 11, color: 'var(--text-dim,#5a5a5a)', marginBottom: 8 }}>Propriétés du type</div>
              {props.length===0 && !addingProp && <p style={{ color:'var(--text-darker,#2e2e2e)', fontSize:12, marginBottom:10 }}>Aucune propriete</p>}
              <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:8 }}>
                {props.map(p => <PropRow key={p.id} prop={p} allTypes={allTypes} onRename={n=>renameProp(p.id,n)} onRemove={()=>removeProp(p.id)}
                  onEditProp={patch => { const updated = props.map(x => x.id===p.id ? { ...x, ...patch } : x); setProps(updated); onUpdate({ defaultProps:updated }) }}
                  draggable onDragStart={e => handlePropDragStart(e, p.id)} onDragOver={e => handlePropDragOver(e, p.id)}
                  onDrop={handlePropDrop} onDragEnd={handlePropDragEnd}
                  isDragging={dragPropId === p.id}
                  insertBefore={dragOverInfo?.propId === p.id && dragOverInfo?.position === 'above' && dragPropId !== p.id}
                  insertAfter={dragOverInfo?.propId === p.id && dragOverInfo?.position === 'below' && dragPropId !== p.id} />)}
              </div>
              {addingProp
                ? <DropdownPropPicker allTypes={allTypes} onAdd={addProp} onCancel={() => setAddingProp(false)} />
                : <button onClick={() => setAddingProp(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 11px', width:'100%', background:'rgba(255,255,255,0.02)', border:'1px dashed rgba(255,255,255,0.07)', borderRadius:7, color:'var(--text-dark,#444444)', fontSize:12, cursor:'pointer', transition:'all 0.1s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent-22)'; e.currentTarget.style.color='var(--accent,#c8a064)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; e.currentTarget.style.color='var(--text-dark,#444444)' }}>
                    <Icon name="plus" size={12} /> Ajouter une propriete
                  </button>
              }
            </>
          })()}

          {selectedWidget.type === 'text' && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-dim,#5a5a5a)', marginBottom: 6 }}>Titre</div>
              <input value={selectedWidget.config?.title || ''}
                onChange={e => updateWidgetConfig({ title: e.target.value })}
                placeholder="Texte"
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '5px 8px', color: 'var(--text-primary,#f0f0f0)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          )}

          {selectedWidget.type === 'image' && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:12, color:'var(--text-dim,#5a5a5a)' }}>Ajustement :</span>
              {['cover', 'contain'].map(fit => (
                <button key={fit} onClick={() => updateWidgetConfig({ fit })}
                  style={{
                    padding:'4px 10px', borderRadius:5, fontSize:11, cursor:'pointer', border:'1px solid',
                    background: selectedWidget.config?.fit === fit ? 'var(--accent-12)' : 'rgba(255,255,255,0.03)',
                    borderColor: selectedWidget.config?.fit === fit ? 'var(--accent-30)' : 'rgba(255,255,255,0.08)',
                    color: selectedWidget.config?.fit === fit ? 'var(--accent,#c8a064)' : 'var(--text-muted,#8a8a8a)',
                  }}>
                  {fit === 'cover' ? 'Remplir' : 'Contenir'}
                </button>
              ))}
            </div>
          )}

          {selectedWidget.type === 'chart' && (() => {
            const numericProps = props.filter(p => p.fieldType === 'number')
            return (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-dim,#5a5a5a)', marginBottom: 8 }}>Propriétés affichées</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer', fontSize: 12, color: 'var(--text-muted,#8a8a8a)' }}>
                <input type="radio" name={`chartFilter_${selectedWidget.id}`}
                  checked={!selectedWidget.config?.propIds || selectedWidget.config.propIds === 'all'}
                  onChange={() => updateWidgetConfig({ propIds: 'all' })}
                  style={{ accentColor: 'var(--accent,#c8a064)' }} />
                Toutes les stats numériques
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--text-muted,#8a8a8a)' }}>
                <input type="radio" name={`chartFilter_${selectedWidget.id}`}
                  checked={Array.isArray(selectedWidget.config?.propIds)}
                  onChange={() => updateWidgetConfig({ propIds: [] })}
                  style={{ accentColor: 'var(--accent,#c8a064)' }} />
                Sélection
              </label>
              {Array.isArray(selectedWidget.config?.propIds) && (
                <div style={{ marginTop: 6, marginLeft: 20 }}>
                  {numericProps.map(p => (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted,#8a8a8a)' }}>
                      <input type="checkbox"
                        checked={(selectedWidget.config?.propIds || []).includes(p.id)}
                        onChange={e => {
                          const current = selectedWidget.config?.propIds || []
                          const updated = e.target.checked ? [...current, p.id] : current.filter(id => id !== p.id)
                          updateWidgetConfig({ propIds: updated })
                        }}
                        style={{ accentColor: 'var(--accent,#c8a064)' }} />
                      <span style={{ fontSize: 10 }}>#</span>
                      {p.name}
                    </label>
                  ))}
                  {numericProps.length === 0 && <span style={{ fontSize: 11, color: 'var(--text-darker,#2e2e2e)' }}>Aucune propriété numérique</span>}
                </div>
              )}
            </div>
            )
          })()}

          {!['properties', 'image', 'text', 'chart'].includes(selectedWidget.type) && (
            <p style={{ color:'var(--text-darker,#2e2e2e)', fontSize:11 }}>Aucune option pour ce widget</p>
          )}
        </section>
      )}

      {/* Couleur */}
      <section>
        <h3 style={{ fontFamily:"var(--font)", fontSize:15, color:'var(--text-secondary,#c0c0c0)', marginBottom:12, fontWeight:500 }}>Couleur</h3>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:color, border:'2px solid rgba(255,255,255,0.1)' }} />
          <span style={{ fontSize:12, color:'var(--text-dim,#5a5a5a)' }}>{color}</span>
        </div>
        <ColorPicker value={color} onChange={c => { setColor(c); onUpdate({ color:c }) }} />
      </section>
    </div>
  )
}

// ─── PropRow — inline rename on click + type/emoji editing ────
const EMOJI_GRID = [
  '😀','😂','😍','🥳','😎','🤔','😢','😡','🥺','🤩',
  '👤','👥','👑','🧙','🧝','🧛','🧟','🦸','👻','💀',
  '⚔️','🛡','🗡','🏹','🔮','✨','💎','🔥','❄️','⚡',
  '🌍','🗺','🏰','🏛','🏙','🏡','⛪','🗿','🌋','🏔',
  '📍','🌊','🌲','🌸','🍃','🌿','🦎','🐉','🦅','🐺',
  '📜','📖','📚','📝','📅','📌','🔖','🏷','📊','📈',
  '⚜️','🪶','🎭','🎪','🎉','🎵','🔔','💡','🕯','🧪',
  '⚗️','🌀','⛩','🔭','⚖️','🧭','🗝','💰','🎲','🃏',
  '❤️','💔','💜','💙','💚','💛','🧡','🤎','🖤','🤍',
  '⭐','✦','◆','●','■','▲','☰','#','☀️','🌙',
]

function PropRow({ prop, allTypes, onRename, onRemove, onEditProp, draggable, onDragStart, onDragOver, onDrop, onDragEnd, isDragging, insertBefore, insertAfter }) {
  const [showEditor, setShowEditor] = useState(false)
  const isRef = prop.fieldType === FIELD_TYPES.CARD_REF
  const emoji = prop.emoji
  const badge = emoji || (isRef ? '🔗' : prop.fieldType==='number' ? '#' : prop.fieldType==='date' ? '📅' : 'T')
  const targets = isRef && prop.targetTypeIds?.length
    ? prop.targetTypeIds.map(tid => allTypes.find(t=>t.id===tid)?.name||tid).join(', ')
    : null

  return (
    <div draggable={draggable} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd}
      style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 11px', background:'rgba(255,255,255,0.03)', borderRadius:7, border:'1px solid rgba(255,255,255,0.05)', position:'relative', opacity: isDragging ? 0.4 : 1, transition:'opacity 0.1s' }}>
      {insertBefore && <div style={{ position:'absolute', top:-2, left:8, right:8, height:2, background:'var(--accent)', borderRadius:1, pointerEvents:'none' }} />}
      {insertAfter && <div style={{ position:'absolute', bottom:-2, left:8, right:8, height:2, background:'var(--accent)', borderRadius:1, pointerEvents:'none' }} />}
      <span style={{ fontSize:11, color:'var(--text-darker,#2e2e2e)', cursor:'grab', flexShrink:0, lineHeight:1, letterSpacing:1, userSelect:'none' }}>⠿</span>
      <span onClick={() => setShowEditor(true)} title="Modifier"
        style={{ fontSize:10, color:'var(--text-dark,#444444)', background: showEditor ? 'var(--accent-15)' : 'rgba(255,255,255,0.04)', padding:'1px 6px', borderRadius:3, flexShrink:0, cursor:'pointer', transition:'background 0.1s' }}>{badge}</span>
      <span onClick={() => setShowEditor(true)} title="Cliquer pour modifier"
        style={{ fontSize:12, flex:1, color:'var(--text-secondary,#c0c0c0)', cursor:'pointer', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{prop.name}</span>
      {targets && <span style={{ fontSize:10, color:'var(--text-dim,#5a5a5a)', flexShrink:0 }}>→ {targets}</span>}
      {prop.multiple && <span style={{ fontSize:9, color:'var(--text-dark,#444444)', flexShrink:0 }}>×n</span>}
      <button onClick={onRemove} style={{ background:'none', border:'none', color:'var(--text-darker,#2e2e2e)', cursor:'pointer', padding:'0 2px', fontSize:10, lineHeight:1, flexShrink:0 }}
        onMouseEnter={e=>e.currentTarget.style.color='var(--danger,#e05040)'} onMouseLeave={e=>e.currentTarget.style.color='var(--text-darker,#2e2e2e)'}>✕</button>
      {showEditor && (
        <PropEditorPopup prop={prop} displayName={prop.name} onRename={onRename} onRemove={onRemove}
          onEditProp={onEditProp} allTypes={allTypes} onClose={() => setShowEditor(false)} />
      )}
    </div>
  )
}

// ─── PropEditorPopup (same as CardWindow) ─────────────────────
function PropEditorPopup({ prop, displayName, onRename, onRemove, onEditProp, allTypes, onClose }) {
  const [name, setName] = useState(displayName || prop.name)
  const [emoji, setEmoji] = useState(prop.emoji || '')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiSearch, setEmojiSearch] = useState('')
  const [showTypeMenu, setShowTypeMenu] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const PRIMITIVE_TYPES = [
    { id: 'text', label: 'Texte', icon: '☰' },
    { id: 'number', label: 'Numérique', icon: '#' },
    { id: 'date', label: 'Date', icon: '📅' },
  ]
  const cardTypes = (allTypes || []).filter(t => !t.virtual)

  const getCurrentTypeLabel = () => {
    const prim = PRIMITIVE_TYPES.find(t => t.id === prop.fieldType)
    if (prim && prop.fieldType !== 'card_ref') return prim.label
    const targetId = prop.targetTypeIds?.[0]
    if (targetId) {
      const ct = (allTypes || []).find(t => t.id === targetId)
      if (ct) return ct.name
    }
    return 'Texte'
  }

  const commitName = () => {
    if (name.trim() && name.trim() !== (displayName || prop.name)) onRename?.(name.trim())
  }
  const selectEmoji = em => {
    setEmoji(em)
    if (onEditProp) onEditProp({ emoji: em })
    setShowEmojiPicker(false)
  }
  const changeToPrimitive = typeId => {
    if (onEditProp) onEditProp({ fieldType: typeId, targetTypeIds: undefined, multiple: false })
    setShowTypeMenu(false)
  }
  const changeToCardRef = cardTypeId => {
    if (onEditProp) onEditProp({ fieldType: 'card_ref', targetTypeIds: [cardTypeId], multiple: true })
    setShowTypeMenu(false)
  }
  const isCurrentPrimitive = id => prop.fieldType === id && prop.fieldType !== 'card_ref'
  const isCurrentCardRef = typeId => prop.fieldType === 'card_ref' && prop.targetTypeIds?.[0] === typeId

  const filteredEmojis = emojiSearch ? EMOJI_GRID.filter(e => e.includes(emojiSearch)) : EMOJI_GRID

  return (
    <div ref={ref} style={{
      position: 'absolute', top: '100%', left: -16, zIndex: 500, marginTop: 2,
      background: 'var(--bg-panel-92,rgba(10,6,1,0.92))', backdropFilter: 'blur(40px) saturate(1.5)', WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
      border: '1px solid var(--border-14)', borderRadius: 12,
      width: 240, boxShadow: '0 8px 32px rgba(0,0,0,0.8)', overflow: 'visible',
    }}>
      {/* Emoji + Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
        <button onClick={() => { setShowEmojiPicker(v => !v); setShowTypeMenu(false) }}
          style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border-14)', background: showEmojiPicker ? 'var(--accent-18)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>
          {emoji || '☰'}
        </button>
        <input autoFocus value={name} onChange={e => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={e => { if (e.key === 'Enter') { commitName(); onClose() } if (e.key === 'Escape') onClose() }}
          style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '5px 8px', color: 'var(--text-primary,#f0f0f0)', fontSize: 13, outline: 'none', fontFamily: "var(--font-body)" }}
        />
      </div>

      {/* Emoji picker panel */}
      {showEmojiPicker && (
        <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <input value={emojiSearch} onChange={e => setEmojiSearch(e.target.value)}
            placeholder="Rechercher des icônes…"
            style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '4px 8px', color: 'var(--text-secondary,#c0c0c0)', fontSize: 11, outline: 'none', marginBottom: 6, boxSizing: 'border-box' }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 2, maxHeight: 140, overflowY: 'auto' }}>
            {filteredEmojis.map((em, i) => (
              <button key={i} onClick={() => selectEmoji(em)}
                style={{ width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: emoji === em ? 'var(--accent-20)' : 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, padding: 0, transition: 'background 0.08s' }}
                onMouseEnter={e => { if (emoji !== em) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                onMouseLeave={e => { if (emoji !== em) e.currentTarget.style.background = 'transparent' }}>
                {em}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Type */}
      <div style={{ position: 'relative' }}>
        <div onClick={() => { setShowTypeMenu(v => !v); setShowEmojiPicker(false) }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.1s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <span style={{ fontSize: 12, color: 'var(--text-dim,#5a5a5a)' }}>Type</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted,#8a8a8a)', display: 'flex', alignItems: 'center', gap: 4 }}>
            {getCurrentTypeLabel()}
            <Icon name="chevron_right" size={9} style={{ color: 'var(--text-dark,#444444)' }} />
          </span>
        </div>

        {showTypeMenu && (
          <div style={{
            position: 'absolute', top: 0, left: '100%', marginLeft: 4, zIndex: 510,
            background: 'var(--bg-panel-92,rgba(10,6,1,0.92))', backdropFilter: 'blur(40px) saturate(1.5)', WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
            border: '1px solid var(--border-14)', borderRadius: 10,
            width: 180, boxShadow: '0 8px 32px rgba(0,0,0,0.8)', overflow: 'hidden', maxHeight: 320, overflowY: 'auto',
          }}>
            {PRIMITIVE_TYPES.map(opt => (
              <TypeMenuItem key={opt.id} icon={opt.icon} label={opt.label}
                active={isCurrentPrimitive(opt.id)} onClick={() => changeToPrimitive(opt.id)} />
            ))}
            {cardTypes.length > 0 && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '2px 0', padding: '4px 11px 2px' }}>
                <span style={{ fontSize: 9, color: 'var(--text-darker,#2e2e2e)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Types de cartes</span>
              </div>
            )}
            {cardTypes.filter(ct => !ct.parentId).map(ct => {
              const children = cardTypes.filter(c => c.parentId === ct.id)
              return (
                <React.Fragment key={ct.id}>
                  <TypeMenuItem icon={ct.icon} label={ct.name}
                    active={isCurrentCardRef(ct.id)} onClick={() => changeToCardRef(ct.id)}
                    color={ct.color} />
                  {children.map(child => (
                    <TypeMenuItem key={child.id} icon={child.icon} label={child.name}
                      active={isCurrentCardRef(child.id)} onClick={() => changeToCardRef(child.id)}
                      color={child.color} indent />
                  ))}
                </React.Fragment>
              )
            })}
          </div>
        )}
      </div>

      {/* Delete */}
      {onRemove && (
        <div onClick={() => { onRemove(); onClose() }}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', cursor: 'pointer', color: 'var(--danger-muted,#8a5a5a)', fontSize: 12, transition: 'background 0.1s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <Icon name="trash" size={12} />
          <span>Supprimer</span>
        </div>
      )}
    </div>
  )
}

function TypeMenuItem({ icon, label, active, onClick, color, indent }) {
  return (
    <div onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: `7px 11px 7px ${indent ? 25 : 11}px`, cursor: 'pointer', fontSize: indent ? 11 : 12,
        color: active ? 'var(--accent,#c8a064)' : (color || 'var(--text-muted,#8a8a8a)'),
        background: active ? 'var(--accent-10)' : 'transparent',
        transition: 'background 0.08s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
      <span style={{ width: 18, textAlign: 'center', fontSize: 13 }}>{icon}</span>
      <span style={{ fontFamily: "var(--font-body)", flex: 1 }}>{label}</span>
      {active && <Icon name="check" size={11} style={{ color: 'var(--accent,#c8a064)', flexShrink: 0 }} />}
    </div>
  )
}

// ─── DropdownPropPicker — liste déroulante avec icônes ─────────
export function DropdownPropPicker({ allTypes, onAdd, onCancel }) {
  const [name,   setName]   = useState('')
  const [search, setSearch] = useState('')
  const ref = useRef()

  useEffect(() => {
    const h = e => { if(ref.current && !ref.current.contains(e.target)) onCancel() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onCancel])

  const SCALARS = [
    { id:'__text',   icon:'T',  label:'Texte',     ft:'text',     color:'var(--text-muted,#8a8a8a)' },
    { id:'__number', icon:'#',  label:'Numérique', ft:'number',   color:'#60a5fa' },
    { id:'__date',   icon:'📅', label:'Date',      ft:'date',     color:'#22c55e' },
  ]
  const creatableTypes = allTypes.filter(t => !t.virtual)
  // Build hierarchical list: roots followed by their children
  const orderedCardRows = []
  const roots = creatableTypes.filter(t => !t.parentId)
  roots.forEach(root => {
    orderedCardRows.push({ id:root.id, icon:root.icon, label:root.name, ft:'card_ref', color:root.color||'#8a8a8a', isCard:true })
    creatableTypes.filter(t => t.parentId === root.id).forEach(child => {
      orderedCardRows.push({ id:child.id, icon:child.icon, label:child.name, ft:'card_ref', color:child.color||'#8a8a8a', isCard:true, indent:true })
    })
  })
  const allRows = [
    ...SCALARS,
    ...orderedCardRows,
  ].filter(r => !search || r.label.toLowerCase().includes(search.toLowerCase()))

  const doAdd = row => {
    const propName = name.trim() || row.label
    onAdd({ name:propName, fieldType:row.ft, multiple:row.isCard||false, targetTypeIds: row.isCard?[row.id]:[] })
  }

  return (
    <div ref={ref} className="anim-slidedown" style={{ background:'var(--bg-panel-85,rgba(8,4,0,0.85))', backdropFilter:'blur(40px) saturate(1.5)', WebkitBackdropFilter:'blur(40px) saturate(1.5)', border:'1px solid var(--border-14)', borderRadius:14, overflow:'hidden', boxShadow:'0 8px 32px rgba(0,0,0,0.7)', marginBottom:6 }}>
      <div style={{ padding:'8px 10px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', gap:6 }}>
        <input autoFocus value={name} onChange={e=>setName(e.target.value)}
          onKeyDown={e => { if(e.key==='Escape') onCancel() }}
          placeholder="Nom de la propriété (optionnel)"
          style={{ flex:1, background:'transparent', border:'none', color:'var(--text-primary,#f0f0f0)', fontSize:13, outline:'none' }} />
      </div>
      <div style={{ padding:'5px 10px', borderBottom:'1px solid rgba(255,255,255,0.04)', position:'relative' }}>
        <Icon name="search" size={11} style={{ position:'absolute', left:19, top:'50%', transform:'translateY(-50%)', color:'var(--text-darker,#2e2e2e)' }} />
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filtrer les types…"
          style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'none', borderRadius:5, padding:'4px 8px 4px 22px', color:'var(--text-secondary,#c0c0c0)', fontSize:11, outline:'none' }} />
      </div>
      <div style={{ padding:'4px 12px 2px', fontSize:10, color:'var(--text-darker,#2e2e2e)', textTransform:'uppercase', letterSpacing:'0.07em' }}>TYPE</div>
      <div style={{ maxHeight:280, overflowY:'auto' }}>
        {allRows.map(row => (
          <div key={row.id} onClick={() => doAdd(row)}
            style={{ display:'flex', alignItems:'center', gap:10, padding:`8px 12px 8px ${row.indent ? 28 : 12}px`, cursor:'pointer', transition:'background 0.08s' }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <span style={{ width:20, textAlign:'center', fontSize: row.isCard ? (row.indent ? 13 : 15) : 13, color: row.isCard?undefined:row.color, flexShrink:0 }}>{row.icon}</span>
            <span style={{ fontSize: row.indent ? 12 : 13, color: row.indent ? 'var(--text-muted,#8a8a8a)' : 'var(--text-secondary,#c0c0c0)', flex:1 }}>{row.label}</span>
            {row.isCard && <span style={{ fontSize:10, color:'var(--text-darker,#2e2e2e)' }}>🔗</span>}
          </div>
        ))}
        {allRows.length===0 && <div style={{ padding:'10px 12px', fontSize:12, color:'var(--text-darker,#2e2e2e)' }}>Aucun résultat</div>}
      </div>
      <div style={{ padding:'5px 12px', borderTop:'1px solid rgba(255,255,255,0.04)' }}>
        <button onClick={onCancel} style={{ background:'none', border:'none', color:'var(--text-dark,#444444)', cursor:'pointer', fontSize:11 }}>Annuler</button>
      </div>
    </div>
  )
}

// ─── LayoutAddWidgetMenu ──────────────────────────────────────
function LayoutAddWidgetMenu({ onAdd, onClose }) {
  const ref = useRef()
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  return (
    <div ref={ref} style={{
      background: 'var(--bg-panel-92,rgba(10,6,1,0.92))', backdropFilter: 'blur(40px) saturate(1.5)', WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
      border: '1px solid var(--border-14)', borderRadius: 10,
      overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
    }}>
      {WIDGET_TYPES.map(wt => (
        <div key={wt.id} onClick={() => onAdd(wt.id)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted,#8a8a8a)', transition: 'background 0.08s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <span style={{ width: 20, textAlign: 'center', fontSize: 14 }}>{wt.icon}</span>
          <span style={{ flex: 1 }}>{wt.name}</span>
          <span style={{ fontSize: 10, color: 'var(--text-darker,#2e2e2e)' }}>{wt.defaultW}×{wt.defaultH}</span>
        </div>
      ))}
    </div>
  )
}

// ─── InlineNewType ────────────────────────────────────────────
function InlineNewType({ allTypes, onCancel, onCreate }) {
  const [name,     setName]     = useState('')
  const [icon,     setIcon]     = useState('📌')
  const [color,    setColor]    = useState('#c8a064')
  const [parentId, setParentId] = useState('')
  const creatableTypes = allTypes.filter(t => !t.virtual)
  return (
    <div className="anim-fadeup" style={{ maxWidth:560 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24, paddingBottom:16, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <EmojiPicker value={icon} onChange={setIcon} />
        <input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="Nom du nouveau type…"
          onKeyDown={e => { if(e.key==='Enter'&&name.trim()) onCreate({name:name.trim(),icon,color,parentId:parentId||null,defaultProps:[]}); if(e.key==='Escape') onCancel() }}
          style={{ flex:1, background:'transparent', border:'none', borderBottom:'1px solid var(--accent-30)', color:'var(--text-primary,#f0f0f0)', fontSize:22, fontFamily:"var(--font)", fontWeight:600, outline:'none', paddingBottom:4 }} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:22 }}>
        <div>
          <div style={{ fontSize:11, color:'var(--text-dark,#444444)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>Sous-type de</div>
          <select value={parentId} onChange={e=>setParentId(e.target.value)}
            style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:8, padding:'7px 10px', color:'var(--text-secondary,#c0c0c0)', fontSize:12, outline:'none', cursor:'pointer' }}>
            <option value="">— Type racine —</option>
            {creatableTypes.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize:11, color:'var(--text-dark,#444444)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>Couleur</div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:26, height:26, borderRadius:6, background:color, border:'2px solid rgba(255,255,255,0.1)', flexShrink:0 }} />
            <ColorPicker value={color} onChange={setColor} />
          </div>
        </div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <Btn variant="primary" disabled={!name.trim()} onClick={() => onCreate({name:name.trim(),icon,color,parentId:parentId||null,defaultProps:[]})}>Créer le type</Btn>
        <Btn variant="subtle" onClick={onCancel}>Annuler</Btn>
      </div>
    </div>
  )
}

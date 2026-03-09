import React, { useState, useRef, useCallback, useEffect } from 'react'
import { usePanZoom } from '../hooks/usePanZoom.js'
import { BUILTIN_TYPES } from '../data/types.js'
import ViewHeader from '../components/ViewHeader.jsx'
import ViewToolbar, { ToolBtn, ToolSep } from '../components/ViewToolbar.jsx'
import { Icon } from '../components/ui.jsx'
import { uid } from '../store/useStore.js'

const TOOLS = ['select', 'text', 'image', 'group']

export default function CanvasView({ card, cards, customTypes, allTypes, onUpdate, onDelete, onClose, onOpenCard }) {
  const data = card.data || { elements: [], viewX: 0, viewY: 0, zoom: 1 }
  const elements = data.elements || []
  const svgRef = useRef()
  const containerRef = useRef()
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [tool, setTool] = useState('select')
  const [selected, setSelected] = useState(null)
  const [editingText, setEditingText] = useState(null)
  const [dragState, setDragState] = useState(null)
  const { pan, zoom, onBgMouseDown, onMouseMove: panMove, onMouseUp: panUp, onWheel, reset, setPan, setZoom } = usePanZoom(1)
  const type = allTypes.find(t => t.id === card.typeId)
  const moved = useRef(false)

  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setSize({ w: e.contentRect.width, h: e.contentRect.height })
    })
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const updateData = useCallback((patch) => {
    onUpdate(card.id, { data: { ...data, ...patch } })
  }, [card.id, data, onUpdate])

  const updateElement = useCallback((elId, patch) => {
    updateData({ elements: elements.map(e => e.id === elId ? { ...e, ...patch } : e) })
  }, [elements, updateData])

  const addElement = useCallback((el) => {
    updateData({ elements: [...elements, el] })
    setSelected(el.id)
  }, [elements, updateData])

  const deleteElement = useCallback((elId) => {
    updateData({ elements: elements.filter(e => e.id !== elId) })
    if (selected === elId) setSelected(null)
  }, [elements, selected, updateData])

  // Screen coords to canvas coords
  const toCanvas = useCallback((clientX, clientY) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: (clientX - rect.left - pan.x) / zoom, y: (clientY - rect.top - pan.y) / zoom }
  }, [pan, zoom])

  // SVG mouse down
  const handleSvgMouseDown = useCallback((e) => {
    if (e.target === svgRef.current || e.target.tagName === 'rect') {
      if (tool === 'select') {
        setSelected(null)
        onBgMouseDown(e)
      } else if (tool === 'text') {
        const pos = toCanvas(e.clientX, e.clientY)
        const el = { id: uid(), type: 'text', text: 'Texte', x: pos.x, y: pos.y, fontSize: 16, color: '#f0f0f0' }
        addElement(el)
        setEditingText(el.id)
        setTool('select')
      }
    }
  }, [tool, onBgMouseDown, toCanvas, addElement])

  // Element mouse down (drag)
  const handleElMouseDown = useCallback((e, elId) => {
    e.stopPropagation()
    if (tool !== 'select') return
    moved.current = false
    const el = elements.find(x => x.id === elId)
    if (!el) return
    setSelected(elId)
    const pos = toCanvas(e.clientX, e.clientY)
    setDragState({ id: elId, offX: pos.x - el.x, offY: pos.y - el.y })
  }, [tool, elements, toCanvas])

  const handleMouseMove = useCallback((e) => {
    if (dragState) {
      moved.current = true
      const pos = toCanvas(e.clientX, e.clientY)
      updateElement(dragState.id, { x: pos.x - dragState.offX, y: pos.y - dragState.offY })
    } else {
      panMove(e)
    }
  }, [dragState, toCanvas, updateElement, panMove])

  const handleMouseUp = useCallback((e) => {
    if (dragState && !moved.current) {
      const el = elements.find(x => x.id === dragState.id)
      if (el?.type === 'card') onOpenCard(el.cardId)
      if (el?.type === 'text') setEditingText(el.id)
    }
    setDragState(null)
    panUp()
  }, [dragState, elements, onOpenCard, panUp])

  const handleWheel = useCallback((e) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (rect) onWheel(e, rect)
  }, [onWheel])

  // Drop card from sidebar
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const cardId = e.dataTransfer.getData('text/cardId')
    if (!cardId) return
    const pos = toCanvas(e.clientX, e.clientY)
    addElement({ id: uid(), type: 'card', cardId, x: pos.x - 75, y: pos.y - 20, w: 150, h: 60 })
  }, [toCanvas, addElement])

  // Image upload
  const handleImageUpload = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const img = new Image()
        img.onload = () => {
          let w = img.width, h = img.height
          const max = 400
          if (w > max) { h = h * max / w; w = max }
          if (h > max) { w = w * max / h; h = max }
          // Compress
          const canvas = document.createElement('canvas')
          canvas.width = Math.min(img.width, 1024)
          canvas.height = Math.min(img.height, 1024) * (img.height / img.width)
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          const src = canvas.toDataURL('image/jpeg', 0.7)
          const center = toCanvas(size.w / 2 + (svgRef.current?.getBoundingClientRect()?.left || 0), size.h / 2 + (svgRef.current?.getBoundingClientRect()?.top || 0))
          addElement({ id: uid(), type: 'image', src, x: center.x - w / 2, y: center.y - h / 2, w, h })
        }
        img.src = ev.target.result
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }, [toCanvas, size, addElement])

  // Add group
  const handleAddGroup = useCallback(() => {
    const center = toCanvas(
      size.w / 2 + (svgRef.current?.getBoundingClientRect()?.left || 0),
      size.h / 2 + (svgRef.current?.getBoundingClientRect()?.top || 0)
    )
    addElement({ id: uid(), type: 'group', label: 'Groupe', x: center.x - 100, y: center.y - 75, w: 200, h: 150, color: '#c8a064' })
  }, [toCanvas, size, addElement])

  // Delete on keyboard
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Delete' && selected && !editingText) deleteElement(selected)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [selected, editingText, deleteElement])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ViewHeader card={card} type={type} onClose={onClose} onUpdate={onUpdate} />

      <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
        onDragOver={e => e.preventDefault()} onDrop={handleDrop}
      >
        <svg ref={svgRef} width={size.w} height={size.h}
          onMouseDown={handleSvgMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{ display: 'block', cursor: tool === 'text' ? 'crosshair' : dragState ? 'grabbing' : 'grab', userSelect: 'none' }}
        >
          <defs>
            <pattern id={`dots-${card.id}`} width={32 * zoom} height={32 * zoom} patternUnits="userSpaceOnUse"
              patternTransform={`translate(${pan.x % (32 * zoom)},${pan.y % (32 * zoom)})`}>
              <circle cx={0} cy={0} r={0.8} fill="rgba(255,255,255,0.04)" />
            </pattern>
          </defs>
          <rect width={size.w} height={size.h} fill={`url(#dots-${card.id})`} />

          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {elements.map(el => {
              const isSel = selected === el.id
              if (el.type === 'group') return <CanvasGroup key={el.id} el={el} isSel={isSel} onMouseDown={e => handleElMouseDown(e, el.id)} onLabelChange={label => updateElement(el.id, { label })} />
              if (el.type === 'image') return <CanvasImage key={el.id} el={el} isSel={isSel} onMouseDown={e => handleElMouseDown(e, el.id)} />
              if (el.type === 'text') return <CanvasText key={el.id} el={el} isSel={isSel} editing={editingText === el.id} onMouseDown={e => handleElMouseDown(e, el.id)} onChange={text => updateElement(el.id, { text })} onDone={() => setEditingText(null)} />
              if (el.type === 'card') return <CanvasCard key={el.id} el={el} isSel={isSel} cards={cards} allTypes={allTypes} onMouseDown={e => handleElMouseDown(e, el.id)} />
              return null
            })}
          </g>
        </svg>

        {/* Zoom indicator */}
        <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 11, color: 'var(--text-darker,#2e2e2e)', zIndex: 10 }}>
          {Math.round(zoom * 100)}%
        </div>

        <ViewToolbar>
          <ToolBtn icon="cursor" label="Sélection" active={tool === 'select'} onClick={() => setTool('select')} />
          <ToolBtn icon="text_icon" label="Texte" active={tool === 'text'} onClick={() => setTool('text')} />
          <ToolBtn icon="image" label="Image" onClick={handleImageUpload} />
          <ToolBtn icon="group" label="Groupe" onClick={handleAddGroup} />
          <ToolSep />
          <ToolBtn icon="eye" label="Reset vue" onClick={reset} />
          {selected && <><ToolSep /><ToolBtn icon="trash" label="Supprimer" onClick={() => deleteElement(selected)} /></>}
        </ViewToolbar>
      </div>
    </div>
  )
}

function CanvasCard({ el, isSel, cards, allTypes, onMouseDown }) {
  const refCard = cards.find(c => c.id === el.cardId)
  const type = refCard ? allTypes.find(t => t.id === refCard.typeId) : null
  return (
    <g onMouseDown={onMouseDown} style={{ cursor: 'pointer' }}>
      <rect x={el.x} y={el.y} width={el.w || 150} height={el.h || 60} rx={10}
        fill="var(--bg-panel-85,rgba(10,6,1,0.8))" stroke={isSel ? 'var(--accent,#c8a064)' : 'var(--border-14,rgba(255,200,120,0.15))'} strokeWidth={isSel ? 2 : 1} />
      {refCard?.image && (
        <image href={refCard.image} x={el.x + 10} y={el.y + 10} width={36} height={36} clipPath="inset(0 round 6px)" />
      )}
      <text x={el.x + (refCard?.image ? 54 : 12)} y={el.y + 24} fontSize={12} fill="var(--text-primary,#f0f0f0)" fontFamily="var(--font-body)">
        {refCard ? refCard.name : '???'}
      </text>
      {type && (
        <text x={el.x + (refCard?.image ? 54 : 12)} y={el.y + 42} fontSize={9} fill={type.color || '#5a5a5a'}>
          {type.icon} {type.name}
        </text>
      )}
    </g>
  )
}

function CanvasText({ el, isSel, editing, onMouseDown, onChange, onDone }) {
  const [draft, setDraft] = useState(el.text)
  useEffect(() => { setDraft(el.text) }, [el.text])

  if (editing) {
    return (
      <foreignObject x={el.x - 4} y={el.y - el.fontSize * 0.8} width={300} height={el.fontSize * 2 + 12}>
        <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
          onBlur={() => { onChange(draft); onDone() }}
          onKeyDown={e => { if (e.key === 'Enter') { onChange(draft); onDone() }; if (e.key === 'Escape') onDone() }}
          style={{ background: 'var(--bg-panel-92,rgba(10,6,1,0.9))', border: '1px solid var(--border-14)', borderRadius: 4, padding: '2px 6px', color: el.color || 'var(--text-primary,#f0f0f0)', fontSize: el.fontSize || 16, fontFamily: "'DM Sans', sans-serif", outline: 'none', width: '100%' }}
        />
      </foreignObject>
    )
  }
  return (
    <text x={el.x} y={el.y} fontSize={el.fontSize || 16} fill={el.color || '#f0f0f0'}
      fontFamily="'DM Sans', sans-serif" style={{ cursor: 'pointer' }}
      onMouseDown={onMouseDown}
      stroke={isSel ? 'var(--accent-30)' : 'none'} strokeWidth={isSel ? 4 : 0} paintOrder="stroke">
      {el.text}
    </text>
  )
}

function CanvasImage({ el, isSel, onMouseDown }) {
  return (
    <g onMouseDown={onMouseDown} style={{ cursor: 'pointer' }}>
      {isSel && <rect x={el.x - 2} y={el.y - 2} width={(el.w || 200) + 4} height={(el.h || 150) + 4} rx={8} fill="none" stroke="var(--accent,#c8a064)" strokeWidth={2} strokeDasharray="6,3" />}
      <image href={el.src} x={el.x} y={el.y} width={el.w || 200} height={el.h || 150} style={{ borderRadius: 6 }} />
    </g>
  )
}

function CanvasGroup({ el, isSel, onMouseDown, onLabelChange }) {
  const [editLabel, setEditLabel] = useState(false)
  const [draft, setDraft] = useState(el.label)

  return (
    <g onMouseDown={onMouseDown} style={{ cursor: 'pointer' }}>
      <rect x={el.x} y={el.y} width={el.w || 200} height={el.h || 150} rx={12}
        fill={(el.color || '#c8a064') + '0c'} stroke={(el.color || '#c8a064') + '30'} strokeWidth={isSel ? 2 : 1} strokeDasharray="8,4" />
      {editLabel ? (
        <foreignObject x={el.x + 8} y={el.y + 4} width={150} height={24}>
          <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
            onBlur={() => { onLabelChange(draft); setEditLabel(false) }}
            onKeyDown={e => { if (e.key === 'Enter') { onLabelChange(draft); setEditLabel(false) } }}
            style={{ background: 'transparent', border: 'none', color: el.color || '#c8a064', fontSize: 11, outline: 'none', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', width: '100%' }}
          />
        </foreignObject>
      ) : (
        <text x={el.x + 10} y={el.y + 18} fontSize={11} fill={el.color || '#c8a064'} fontWeight={600}
          style={{ textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'text' }}
          onDoubleClick={(e) => { e.stopPropagation(); setDraft(el.label); setEditLabel(true) }}>
          {el.label || 'Groupe'}
        </text>
      )}
    </g>
  )
}

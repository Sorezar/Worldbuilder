import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Icon, Btn } from '../components/ui.jsx'
import { BUILTIN_TYPES } from '../data/types.js'

const BUILTIN_COLORS = { character:'#c084fc',location:'#f59e0b',faction:'#ef4444',item:'#06b6d4',event:'#22c55e',lore:'#a78bfa',ecology:'#84cc16' }

function getColor(card, customTypes) {
  const t = customTypes.find(x => x.id === card.typeId)
  return t?.color || BUILTIN_COLORS[card.typeId] || '#9a8a70'
}
function getIcon(card, customTypes) {
  const t = [...BUILTIN_TYPES, ...customTypes].find(x => x.id === card.typeId)
  return t?.icon || '📄'
}

export default function GraphView({ cards, customTypes, onOpenCard }) {
  const svgRef = useRef()
  const containerRef = useRef()
  const [positions, setPositions] = useState({})
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [filter, setFilter] = useState('')
  const [hovered, setHovered] = useState(null)
  const dragging = useRef(null)
  const panning = useRef(null)
  const moved = useRef(false)
  const dragOff = useRef({ x: 0, y: 0 })

  // Init positions
  useEffect(() => {
    setPositions(prev => {
      const next = { ...prev }
      cards.forEach((c, i) => {
        if (!next[c.id]) {
          const angle = (i / cards.length) * Math.PI * 2
          const r = Math.min(800, 600) * 0.28
          next[c.id] = { x: 400 + r * Math.cos(angle) + (Math.random()-0.5)*60, y: 300 + r * Math.sin(angle) + (Math.random()-0.5)*60 }
        }
      })
      return next
    })
  }, [cards.length])

  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setSize({ w: e.contentRect.width, h: e.contentRect.height })
    })
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Get all relation refs from a card
  const getRefs = (card) => {
    const refs = []
    Object.values(card.props || {}).forEach(v => {
      if (Array.isArray(v)) refs.push(...v.filter(x => typeof x === 'string' && cards.find(c => c.id === x)))
      else if (typeof v === 'string' && cards.find(c => c.id === v)) refs.push(v)
    });
    (card.extraProps || []).forEach(ep => {
      if (Array.isArray(ep.value)) refs.push(...ep.value.filter(x => typeof x === 'string' && cards.find(c => c.id === x)))
      else if (typeof ep.value === 'string' && cards.find(c => c.id === ep.value)) refs.push(ep.value)
    })
    return [...new Set(refs)]
  }

  const onNodeMouseDown = (e, id) => {
    e.stopPropagation()
    moved.current = false
    const rect = svgRef.current.getBoundingClientRect()
    const pos = positions[id] || { x: 0, y: 0 }
    dragOff.current = { x: (e.clientX - rect.left - pan.x) / zoom - pos.x, y: (e.clientY - rect.top - pan.y) / zoom - pos.y }
    dragging.current = id
  }

  const onSvgMouseDown = (e) => {
    if (dragging.current) return
    panning.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }

  const onMouseMove = useCallback(e => {
    if (dragging.current) {
      moved.current = true
      const rect = svgRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left - pan.x) / zoom - dragOff.current.x
      const y = (e.clientY - rect.top - pan.y) / zoom - dragOff.current.y
      setPositions(prev => ({ ...prev, [dragging.current]: { x, y } }))
    } else if (panning.current) {
      setPan({ x: e.clientX - panning.current.x, y: e.clientY - panning.current.y })
    }
  }, [pan, zoom])

  const onMouseUp = useCallback((e, id) => {
    if (id && !moved.current) onOpenCard(id)
    dragging.current = null; panning.current = null
  }, [onOpenCard])

  const onWheel = (e) => {
    e.preventDefault()
    setZoom(z => Math.min(3, Math.max(0.15, z * (e.deltaY > 0 ? 0.9 : 1.1))))
  }

  const filteredCards = filter ? cards.filter(c => c.name.toLowerCase().includes(filter.toLowerCase())) : cards
  const filteredIds = new Set(filteredCards.map(c => c.id))

  // Build edges (deduplicated)
  const edges = []
  const edgeSet = new Set()
  cards.forEach(c => {
    getRefs(c).forEach(refId => {
      const key = [c.id, refId].sort().join('-')
      if (!edgeSet.has(key) && positions[c.id] && positions[refId]) {
        edgeSet.add(key)
        edges.push({ from: c.id, to: refId })
      }
    })
  })

  return (
    <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--bg-base-50,rgba(8,4,0,0.5))', backdropFilter: 'blur(40px) saturate(1.4)', WebkitBackdropFilter: 'blur(40px) saturate(1.4)', borderRadius: 16, border: '1px solid var(--border-09,rgba(255,200,120,0.09))' }}>
      {/* Controls */}
      <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 10, display: 'flex', gap: 8 }}>
        <div style={{ position: 'relative' }}>
          <Icon name="search" size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark,#4a3a28)' }} />
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrer…"
            style={{ background: 'rgba(10,6,1,0.8)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '7px 10px 7px 26px', color: 'var(--text-secondary,#c8b89a)', fontSize: 12, outline: 'none', width: 150 }}
          />
        </div>
        <Btn variant="dark" size="sm" onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1) }}>
          <Icon name="eye" size={12} /> Reset
        </Btn>
      </div>

      <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 10, fontSize: 11, color: 'var(--text-darker,#3a2a18)' }}>
        Cliquer pour ouvrir · Glisser pour déplacer
      </div>

      {/* Zoom buttons */}
      <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Btn variant="dark" size="icon" onClick={() => setZoom(z => Math.min(3, z * 1.2))}>+</Btn>
        <Btn variant="dark" size="icon" onClick={() => setZoom(z => Math.max(0.15, z * 0.8))}>−</Btn>
        <div style={{ background: 'rgba(10,6,1,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 5, padding: '3px 5px', fontSize: 10, color: 'var(--text-dim,#5a4a38)', textAlign: 'center' }}>{Math.round(zoom*100)}%</div>
      </div>

      {/* Legend */}
      <TypeLegend customTypes={customTypes} />

      <svg ref={svgRef} width={size.w} height={size.h}
        onMouseDown={onSvgMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={() => { dragging.current = null; panning.current = null }}
        onMouseLeave={() => { dragging.current = null; panning.current = null }}
        onWheel={onWheel}
        style={{ display: 'block', cursor: 'grab', userSelect: 'none' }}
      >
        <defs>
          <pattern id="dots" width={32*zoom} height={32*zoom} patternUnits="userSpaceOnUse"
            patternTransform={`translate(${pan.x%(32*zoom)},${pan.y%(32*zoom)})`}>
            <circle cx={0} cy={0} r={0.8} fill="rgba(255,255,255,0.04)" />
          </pattern>
        </defs>
        <rect width={size.w} height={size.h} fill="url(#dots)" />

        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {/* Edges */}
          {edges.map(e => {
            const fp = positions[e.from]; const tp = positions[e.to]
            if (!fp || !tp) return null
            const isHigh = hovered === e.from || hovered === e.to
            return (
              <line key={`${e.from}-${e.to}`}
                x1={fp.x} y1={fp.y} x2={tp.x} y2={tp.y}
                stroke={isHigh ? 'rgba(200,160,100,0.5)' : 'rgba(255,255,255,0.1)'}
                strokeWidth={isHigh ? 1.5 : 1} strokeDasharray="5,4"
              />
            )
          })}

          {/* Nodes */}
          {cards.map(card => {
            const pos = positions[card.id]
            if (!pos) return null
            const color = getColor(card, customTypes)
            const icon = getIcon(card, customTypes)
            const isHov = hovered === card.id
            const isDim = filter && !filteredIds.has(card.id)
            const relCount = getRefs(card).length
            return (
              <g key={card.id}
                transform={`translate(${pos.x},${pos.y})`}
                onMouseDown={e => onNodeMouseDown(e, card.id)}
                onMouseUp={e => onMouseUp(e, card.id)}
                onMouseEnter={() => setHovered(card.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'pointer', opacity: isDim ? 0.2 : 1, transition: 'opacity 0.2s' }}
              >
                {isHov && <circle r={30} fill={color + '0a'} stroke={color + '20'} strokeWidth={1} />}
                <circle r={22} fill={color + '1a'} stroke={color} strokeWidth={isHov ? 2 : 1.5} />
                {card.image
                  ? <image href={card.image} x={-18} y={-18} width={36} height={36} clipPath={`circle(18px at 18px 18px)`} style={{ borderRadius: '50%' }} />
                  : <text textAnchor="middle" dominantBaseline="central" fontSize={14}>{icon}</text>
                }
                <text textAnchor="middle" y={32} fontSize={9} fill={isHov ? 'var(--text-primary,#f0e6d3)' : 'var(--text-muted,#9a8a70)'} fontFamily="var(--font-body)">
                  {card.name.length > 14 ? card.name.slice(0, 13) + '…' : card.name}
                </text>
                {relCount > 0 && (
                  <>
                    <circle cx={16} cy={-16} r={8} fill={color} />
                    <text x={16} y={-16} textAnchor="middle" dominantBaseline="central" fontSize={7} fill="#000" fontWeight="700">{relCount}</text>
                  </>
                )}
              </g>
            )
          })}
        </g>
      </svg>

      {cards.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-darker,#3a2a18)', pointerEvents: 'none' }}>
          <Icon name="graph" size={48} style={{ opacity: 0.12 }} />
          <p style={{ fontSize: 15 }}>Aucun document</p>
        </div>
      )}
    </div>
  )
}

function TypeLegend({ customTypes }) {
  const all = [...BUILTIN_TYPES.filter(t => !t.virtual && !t.parentId), ...(customTypes || []).filter(t => !t.parentId)]
  return (
    <div style={{ position: 'absolute', bottom: 16, left: 14, zIndex: 10, background: 'rgba(10,6,1,0.7)', backdropFilter: 'blur(30px) saturate(1.4)', WebkitBackdropFilter: 'blur(30px) saturate(1.4)', border: '1px solid rgba(255,200,120,0.1)', borderRadius: 14, padding: '11px 15px' }}>
      <div style={{ fontSize: 10, color: 'var(--text-dark,#4a3a28)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>Types</div>
      {all.map(t => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: '#7a6a58', marginBottom: 3 }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: t.color || BUILTIN_COLORS[t.id] || '#9a8a70', flexShrink: 0 }} />
          {t.icon} {t.name}
        </div>
      ))}
    </div>
  )
}

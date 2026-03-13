import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Icon, Btn } from './ui.jsx'
import { BUILTIN_TYPES } from '../data/types.js'

const BUILTIN_COLORS = { character:'#c084fc',location:'#f59e0b',faction:'#ef4444',item:'#06b6d4',event:'#22c55e',lore:'#a78bfa',ecology:'#84cc16' }
const SIM_DEFAULTS = { linkDist: 120, linkStr: 0.4, repulsion: -400, collision: 0.5, gravX: 0.02, gravY: 0.02, nodeSize: 4 }

function load(key, fb) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb } catch { return fb } }
function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)) } catch {} }

function getColor(card, ct) { const t = ct.find(x => x.id === card.typeId); return t?.color || BUILTIN_COLORS[card.typeId] || '#8a8a8a' }
function getIcon(card, ct) { const t = [...BUILTIN_TYPES, ...ct].find(x => x.id === card.typeId); return t?.icon || '📄' }

export function getRefs(card, cardIds) {
  const refs = []
  Object.values(card.props || {}).forEach(v => {
    if (Array.isArray(v)) refs.push(...v.filter(x => typeof x === 'string' && cardIds.has(x)))
    else if (typeof v === 'string' && cardIds.has(v)) refs.push(v)
  });
  (card.extraProps || []).forEach(ep => {
    if (Array.isArray(ep.value)) refs.push(...ep.value.filter(x => typeof x === 'string' && cardIds.has(x)))
    else if (typeof ep.value === 'string' && cardIds.has(ep.value)) refs.push(ep.value)
  })
  return [...new Set(refs)]
}

export function buildEdges(cards, cardIds) {
  const edges = [], seen = new Set()
  cards.forEach(c => {
    getRefs(c, cardIds).forEach(refId => {
      const key = [c.id, refId].sort().join('-')
      if (!seen.has(key)) { seen.add(key); edges.push({ source: c.id, target: refId }) }
    })
  })
  return edges
}

// ─── Force simulation tick ───────────────────────────────────
// Alpha multiplied into forces so they weaken as the sim cools.
function simTick(nodes, edges, params, cx, cy, alpha) {
  const { linkDist, linkStr, repulsion, collision, gravX, gravY, nodeSize } = params
  const r = nodeSize * 5.5

  // Repulsion (many-body, 1/d²)
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i]
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j]
      let dx = a.x - b.x, dy = a.y - b.y
      let d2 = dx * dx + dy * dy
      if (d2 < 1) { dx = (Math.random() - 0.5); dy = (Math.random() - 0.5); d2 = dx * dx + dy * dy }
      const d = Math.sqrt(d2)
      const force = (repulsion * alpha) / d2
      const fx = dx / d * force, fy = dy / d * force
      if (a.fx == null) { a.vx -= fx; a.vy -= fy }
      if (b.fx == null) { b.vx += fx; b.vy += fy }
    }
  }

  // Link spring (clamped so high values don't explode)
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]))
  for (const e of edges) {
    const s = nodeMap[e.source], t = nodeMap[e.target]
    if (!s || !t) continue
    let dx = t.x - s.x, dy = t.y - s.y
    const d = Math.sqrt(dx * dx + dy * dy) || 1
    const displacement = d - linkDist
    // Clamp force to avoid explosion at high linkStr
    const rawForce = displacement * linkStr * alpha
    const maxForce = 8
    const force = Math.max(-maxForce, Math.min(maxForce, rawForce))
    const fx = dx / d * force, fy = dy / d * force
    if (s.fx == null) { s.vx += fx; s.vy += fy }
    if (t.fx == null) { t.vx -= fx; t.vy -= fy }
  }

  // Center gravity
  for (const n of nodes) {
    if (n.fx != null) continue
    n.vx += (cx - n.x) * gravX * alpha
    n.vy += (cy - n.y) * gravY * alpha
  }

  // Collision (only applied when nodes actually overlap)
  if (collision > 0) {
    const minD = r * 2
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i]
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j]
        let dx = a.x - b.x, dy = a.y - b.y
        const d = Math.sqrt(dx * dx + dy * dy) || 1
        if (d < minD) {
          const push = (minD - d) * Math.min(collision, 1) * 0.5
          const px = dx / d * push, py = dy / d * push
          if (a.fx == null) { a.vx += px; a.vy += py }
          if (b.fx == null) { b.vx -= px; b.vy -= py }
        }
      }
    }
  }

  // Velocity damping & update
  for (const n of nodes) {
    if (n.fx != null) { n.x = n.fx; n.y = n.fy; n.vx = 0; n.vy = 0; continue }
    n.vx *= 0.65; n.vy *= 0.65
    n.x += n.vx; n.y += n.vy
  }
}

// ─── Main GraphCore component ────────────────────────────────
export default function GraphCore({ cards, customTypes, onOpenCard, storageKey, compact, externalShowSettings, onToggleSettings }) {
  const sk = storageKey ? `${storageKey}_settings` : null
  const pk = storageKey ? `${storageKey}_positions` : null

  const svgRef = useRef()
  const containerRef = useRef()
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [filter, setFilter] = useState('')
  const [hovered, setHovered] = useState(null)
  const [showSettingsLocal, setShowSettingsLocal] = useState(false)
  const showSettings = externalShowSettings !== undefined ? externalShowSettings : showSettingsLocal
  const setShowSettings = onToggleSettings || setShowSettingsLocal
  const [showLabels, setShowLabels] = useState(() => { const s = sk && load(sk, null); return s?.showLabels ?? true })
  const [hideIsolated, setHideIsolated] = useState(() => { const s = sk && load(sk, null); return s?.hideIsolated ?? false })
  const [params, setParams] = useState(() => { const s = sk && load(sk, null); return s?.params ? { ...SIM_DEFAULTS, ...s.params } : { ...SIM_DEFAULTS } })
  const [hiddenTypes, setHiddenTypes] = useState(() => { const s = sk && load(sk, null); return new Set(s?.hiddenTypes || []) })
  const [, setTick] = useState(0)

  const nodesRef = useRef([])
  const alphaRef = useRef(1)
  const rafRef = useRef(null)
  const dragging = useRef(null)
  const panning = useRef(null)
  const moved = useRef(false)
  const dragOff = useRef({ x: 0, y: 0 })
  const paramsRef = useRef(params)
  paramsRef.current = params

  const cardIds = new Set(cards.map(c => c.id))
  const edges = buildEdges(cards, cardIds)
  const connectedIds = new Set(edges.flatMap(e => [e.source, e.target]))

  // Types present in the graph (for legend), including sub-types
  const presentTypes = useMemo(() => {
    const ct = customTypes || []
    const typeIds = new Set(cards.map(c => c.typeId))
    const all = [...BUILTIN_TYPES.filter(t => !t.virtual && !ct.some(c => c.id === t.id)), ...ct]
    return all.filter(t => typeIds.has(t.id))
  }, [cards, customTypes])

  // Save settings
  useEffect(() => {
    if (sk) save(sk, { params, showLabels, hideIsolated, hiddenTypes: [...hiddenTypes] })
  }, [sk, params, showLabels, hideIsolated, hiddenTypes])

  // Sync nodes with cards — new nodes start near center with small random offset
  useEffect(() => {
    const existing = Object.fromEntries(nodesRef.current.map(n => [n.id, n]))
    const saved = pk ? load(pk, {}) : {}
    const cx = size.w / 2 / Math.max(zoom, 0.5)
    const cy = size.h / 2 / Math.max(zoom, 0.5)
    let hasSaved = false
    nodesRef.current = cards.map((c, i) => {
      if (existing[c.id]) return { ...existing[c.id], id: c.id }
      if (saved[c.id]) { hasSaved = true; return { id: c.id, x: saved[c.id].x, y: saved[c.id].y, vx: 0, vy: 0 } }
      // Start clustered near center — simulation will spread them out
      return { id: c.id, x: cx + (Math.random() - 0.5) * 40, y: cy + (Math.random() - 0.5) * 40, vx: 0, vy: 0 }
    })
    alphaRef.current = hasSaved && Object.keys(existing).length === 0 ? 0.05 : 1
  }, [cards.length, pk])

  // Simulation loop
  const pkRef = useRef(pk)
  pkRef.current = pk
  useEffect(() => {
    let running = true
    const loop = () => {
      if (!running) return
      if (alphaRef.current > 0.001 && nodesRef.current.length > 0) {
        const cx = size.w / 2 / Math.max(zoom, 0.5)
        const cy = size.h / 2 / Math.max(zoom, 0.5)
        simTick(nodesRef.current, edges, paramsRef.current, cx, cy, alphaRef.current)
        alphaRef.current *= 0.995
        setTick(t => t + 1)
        if (alphaRef.current <= 0.001 && pkRef.current) {
          const pos = {}
          nodesRef.current.forEach(n => { pos[n.id] = { x: Math.round(n.x * 10) / 10, y: Math.round(n.y * 10) / 10 } })
          save(pkRef.current, pos)
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { running = false; cancelAnimationFrame(rafRef.current) }
  }, [cards.length, edges.length, size.w, size.h, zoom])

  // Reheat on param change
  useEffect(() => { alphaRef.current = 1 }, [params])

  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setSize({ w: e.contentRect.width, h: e.contentRect.height })
    })
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const nodeMap = Object.fromEntries(nodesRef.current.map(n => [n.id, n]))

  const savePositions = useCallback(() => {
    if (!pk) return
    const pos = {}
    nodesRef.current.forEach(n => { pos[n.id] = { x: Math.round(n.x * 10) / 10, y: Math.round(n.y * 10) / 10 } })
    save(pk, pos)
  }, [pk])

  const onNodeMouseDown = (e, id) => {
    e.stopPropagation()
    moved.current = false
    const rect = svgRef.current.getBoundingClientRect()
    const n = nodeMap[id]
    if (!n) return
    dragOff.current = { x: (e.clientX - rect.left - pan.x) / zoom - n.x, y: (e.clientY - rect.top - pan.y) / zoom - n.y }
    dragging.current = id
    n.fx = n.x; n.fy = n.y
    alphaRef.current = Math.max(alphaRef.current, 0.3)
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
      const n = nodesRef.current.find(n => n.id === dragging.current)
      if (n) { n.fx = x; n.fy = y; n.x = x; n.y = y }
      setTick(t => t + 1)
    } else if (panning.current) {
      setPan({ x: e.clientX - panning.current.x, y: e.clientY - panning.current.y })
    }
  }, [pan, zoom])

  // On mouseUp after drag: node stays PINNED (fx/fy kept), positions saved
  const onMouseUp = useCallback((e, id) => {
    if (dragging.current) {
      // Keep fx/fy so the node stays where the user placed it
      if (moved.current) savePositions()
    }
    if (id && !moved.current) onOpenCard(id)
    dragging.current = null; panning.current = null
  }, [onOpenCard, savePositions])

  // Zoom toward cursor
  const onWheel = useCallback((e) => {
    e.preventDefault()
    const rect = svgRef.current.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(z => {
      const nz = Math.min(3, Math.max(0.15, z * factor))
      const ratio = nz / z
      setPan(p => ({ x: mx - (mx - p.x) * ratio, y: my - (my - p.y) * ratio }))
      return nz
    })
  }, [])

  // Neighbor set for hover highlight
  const hoveredNeighbors = useMemo(() => {
    if (!hovered) return null
    const neighbors = new Set()
    edges.forEach(e => {
      if (e.source === hovered) neighbors.add(e.target)
      else if (e.target === hovered) neighbors.add(e.source)
    })
    return neighbors
  }, [hovered, edges])

  const filteredCards = filter ? cards.filter(c => c.name.toLowerCase().includes(filter.toLowerCase())) : cards
  const filteredIds = new Set(filteredCards.map(c => c.id))

  const visibleCards = cards.filter(c => {
    if (hiddenTypes.has(c.typeId)) return false
    if (hideIsolated && !connectedIds.has(c.id)) return false
    return true
  })
  const nodeR = params.nodeSize * 5.5

  const toggleType = (typeId) => {
    setHiddenTypes(prev => {
      const next = new Set(prev)
      if (next.has(typeId)) next.delete(typeId)
      else next.add(typeId)
      return next
    })
  }

  // Unpin all nodes (used by reset button)
  const unpinAll = () => {
    nodesRef.current.forEach(n => { n.fx = null; n.fy = null })
    alphaRef.current = 1
  }

  return (
    <div ref={containerRef} style={{ flex: 1, height: '100%', position: 'relative', overflow: 'hidden', background: 'var(--bg-base-50,rgba(8,4,0,0.5))', backdropFilter: 'blur(40px) saturate(1.4)', WebkitBackdropFilter: 'blur(40px) saturate(1.4)', borderRadius: compact ? 10 : 16, border: '1px solid var(--border-09,rgba(255,200,120,0.09))' }}>
      {/* Controls */}
      <div style={{ position: 'absolute', top: compact ? 8 : 14, left: compact ? 8 : 14, zIndex: 10, display: 'flex', gap: compact ? 4 : 8, flexWrap: 'wrap' }}>
        {!compact && (
          <div style={{ position: 'relative' }}>
            <Icon name="search" size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark,#444444)' }} />
            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrer…"
              style={{ background: 'var(--bg-panel-85,rgba(10,6,1,0.8))', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '7px 10px 7px 26px', color: 'var(--text-secondary,#c0c0c0)', fontSize: 12, outline: 'none', width: 150 }}
            />
          </div>
        )}
        <Btn variant="dark" size="sm" onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); unpinAll() }}>
          <Icon name="eye" size={12} />{!compact && ' Reset'}
        </Btn>
        <Btn variant="dark" size="sm" onClick={() => setShowSettings(s => !s)} style={showSettings ? { background: 'var(--accent-20,rgba(200,160,80,0.2))', borderColor: 'var(--accent-30,rgba(200,160,80,0.3))' } : undefined}>
          <Icon name="settings" size={12} />{!compact && ' Paramètres'}
        </Btn>
      </div>

      {!compact && (
        <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 10, fontSize: 11, color: 'var(--text-darker,#2e2e2e)' }}>
          Cliquer pour ouvrir · Glisser pour fixer
        </div>
      )}

      {/* Zoom buttons */}
      <div style={{ position: 'absolute', bottom: compact ? 8 : 16, right: compact ? 8 : 16, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Btn variant="dark" size="icon" onClick={() => {
          const nz = Math.min(3, zoom * 1.2), ratio = nz / zoom
          setPan(p => ({ x: size.w / 2 - (size.w / 2 - p.x) * ratio, y: size.h / 2 - (size.h / 2 - p.y) * ratio }))
          setZoom(nz)
        }}>+</Btn>
        <Btn variant="dark" size="icon" onClick={() => {
          const nz = Math.max(0.15, zoom * 0.8), ratio = nz / zoom
          setPan(p => ({ x: size.w / 2 - (size.w / 2 - p.x) * ratio, y: size.h / 2 - (size.h / 2 - p.y) * ratio }))
          setZoom(nz)
        }}>−</Btn>
        <div style={{ background: 'var(--bg-panel-85,rgba(10,6,1,0.7))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 5, padding: '3px 5px', fontSize: 10, color: 'var(--text-dim,#5a5a5a)', textAlign: 'center' }}>{Math.round(zoom * 100)}%</div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <SettingsPanel
          params={params} setParams={setParams}
          showLabels={showLabels} setShowLabels={setShowLabels}
          hideIsolated={hideIsolated} setHideIsolated={setHideIsolated}
          compact={compact}
        />
      )}

      {/* Legend (clickable, only present types) */}
      {!showSettings && presentTypes.length > 0 && (
        <TypeLegend types={presentTypes} hiddenTypes={hiddenTypes} onToggle={toggleType} compact={compact} />
      )}

      <svg ref={svgRef} width={size.w} height={size.h}
        onMouseDown={onSvgMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={() => onMouseUp(null, null)}
        onMouseLeave={() => { dragging.current = null; panning.current = null }}
        onWheel={onWheel}
        style={{ display: 'block', cursor: 'grab', userSelect: 'none' }}
      >
        <defs>
          <pattern id="dots" width={32 * zoom} height={32 * zoom} patternUnits="userSpaceOnUse"
            patternTransform={`translate(${pan.x % (32 * zoom)},${pan.y % (32 * zoom)})`}>
            <circle cx={0} cy={0} r={0.8} fill="rgba(255,255,255,0.04)" />
          </pattern>
        </defs>
        <rect width={size.w} height={size.h} fill="url(#dots)" />

        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {/* Edges */}
          {edges.map(e => {
            const s = nodeMap[e.source], t = nodeMap[e.target]
            if (!s || !t) return null
            if (hiddenTypes.has(cards.find(c => c.id === e.source)?.typeId) || hiddenTypes.has(cards.find(c => c.id === e.target)?.typeId)) return null
            const isHovEdge = hovered && (e.source === hovered || e.target === hovered)
            const isDimEdge = hovered && !isHovEdge
            return (
              <line key={`${e.source}-${e.target}`}
                x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                stroke={isHovEdge ? 'var(--accent-50)' : 'rgba(255,255,255,0.1)'}
                strokeWidth={isHovEdge ? 2 : 1} strokeDasharray={isHovEdge ? 'none' : '5,4'}
                opacity={isDimEdge ? 0.15 : 1}
                style={{ transition: 'opacity 0.25s, stroke 0.25s, stroke-width 0.25s' }}
              />
            )
          })}

          {/* Nodes */}
          {visibleCards.map(card => {
            const n = nodeMap[card.id]
            if (!n) return null
            const color = getColor(card, customTypes)
            const icon = getIcon(card, customTypes)
            const isHov = hovered === card.id
            const isNeighbor = hoveredNeighbors && hoveredNeighbors.has(card.id)
            const isHighlighted = isHov || isNeighbor
            const isPinned = n.fx != null
            const isDimFilter = filter && !filteredIds.has(card.id)
            const isDimHover = hovered && !isHighlighted
            const opacity = isDimFilter ? 0.12 : isDimHover ? 0.15 : 1
            const relCount = getRefs(card, cardIds).length
            return (
              <g key={card.id}
                transform={`translate(${n.x},${n.y})`}
                onMouseDown={e => onNodeMouseDown(e, card.id)}
                onMouseUp={e => onMouseUp(e, card.id)}
                onMouseEnter={() => setHovered(card.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'pointer', opacity, transition: 'opacity 0.25s' }}
              >
                {isHighlighted && <circle r={nodeR + 8} fill={color + '0a'} stroke={color + '20'} strokeWidth={1} />}
                <circle r={nodeR} fill={isHighlighted ? color + '30' : color + '1a'} stroke={color} strokeWidth={isHov ? 2.5 : isNeighbor ? 2 : 1.5} style={{ transition: 'fill 0.25s, stroke-width 0.25s' }} />
                {isPinned && <circle r={3} fill={color} cx={nodeR * 0.5} cy={nodeR * 0.5} opacity={0.5} />}
                {card.image
                  ? <image href={card.image} x={-nodeR + 4} y={-nodeR + 4} width={(nodeR - 4) * 2} height={(nodeR - 4) * 2} clipPath={`circle(${nodeR - 4}px at ${nodeR - 4}px ${nodeR - 4}px)`} style={{ borderRadius: '50%' }} />
                  : <text textAnchor="middle" dominantBaseline="central" fontSize={nodeR * 0.65}>{icon}</text>
                }
                {showLabels && (
                  <text textAnchor="middle" y={nodeR + 12} fontSize={9} fill={isHighlighted ? 'var(--text-primary,#f0f0f0)' : 'var(--text-muted,#8a8a8a)'} fontFamily="var(--font-body)" style={{ transition: 'fill 0.25s' }}>
                    {card.name.length > 14 ? card.name.slice(0, 13) + '…' : card.name}
                  </text>
                )}
                {relCount > 0 && (
                  <>
                    <circle cx={nodeR * 0.72} cy={-nodeR * 0.72} r={8} fill={color} />
                    <text x={nodeR * 0.72} y={-nodeR * 0.72} textAnchor="middle" dominantBaseline="central" fontSize={7} fill="#000" fontWeight="700">{relCount}</text>
                  </>
                )}
              </g>
            )
          })}
        </g>
      </svg>

      {cards.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-darker,#2e2e2e)', pointerEvents: 'none' }}>
          <Icon name="graph" size={48} style={{ opacity: 0.12 }} />
          <p style={{ fontSize: 15 }}>Aucun document</p>
        </div>
      )}
    </div>
  )
}

/* ─── Settings Panel ─── */
function SettingsPanel({ params, setParams, showLabels, setShowLabels, hideIsolated, setHideIsolated, compact }) {
  const set = (key, val) => setParams(p => ({ ...p, [key]: val }))
  const panelStyle = {
    position: 'absolute', bottom: compact ? 8 : 16, left: compact ? 8 : 14, zIndex: 10, width: compact ? 200 : 230,
    background: 'var(--bg-panel-85,rgba(10,6,1,0.85))', backdropFilter: 'blur(30px) saturate(1.4)', WebkitBackdropFilter: 'blur(30px) saturate(1.4)',
    border: '1px solid var(--border-14,rgba(255,200,120,0.1))', borderRadius: 14, padding: compact ? '10px 12px' : '14px 16px',
    maxHeight: 'calc(100% - 80px)', overflowY: 'auto'
  }

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary,#c0c0c0)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Paramètres</span>
        <span onClick={() => setParams({ ...SIM_DEFAULTS })} style={{ cursor: 'pointer', color: 'var(--text-dark,#444444)', fontSize: 11 }} title="Réinitialiser">
          <Icon name="refresh" size={13} />
        </span>
      </div>

      <Toggle label="Afficher les étiquettes" value={showLabels} onChange={setShowLabels} />
      <Toggle label="Masquer les nœuds isolés" value={hideIsolated} onChange={setHideIsolated} />

      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '10px 0' }} />

      <ParamSlider label="Taille des nœuds" value={params.nodeSize} min={1} max={10} step={0.5} onChange={v => set('nodeSize', v)} />
      <ParamSlider label="Link Dist." value={params.linkDist} min={20} max={400} step={5} onChange={v => set('linkDist', v)} />
      <ParamSlider label="Link Str." value={params.linkStr} min={0.01} max={1} step={0.01} onChange={v => set('linkStr', v)} />
      <ParamSlider label="Repulsion" value={params.repulsion} min={-1000} max={0} step={10} onChange={v => set('repulsion', v)} />
      <ParamSlider label="Collision" value={params.collision} min={0} max={1} step={0.05} onChange={v => set('collision', v)} />
      <ParamSlider label="Gravity X" value={params.gravX} min={0} max={0.1} step={0.001} onChange={v => set('gravX', v)} />
      <ParamSlider label="Gravity Y" value={params.gravY} min={0} max={0.1} step={0.001} onChange={v => set('gravY', v)} />
    </div>
  )
}

function Toggle({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted,#8a8a8a)' }}>{label}</span>
      <div onClick={() => onChange(!value)} style={{
        width: 32, height: 18, borderRadius: 9, cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
        background: value ? 'var(--accent-50,#c8a050)' : 'rgba(255,255,255,0.1)'
      }}>
        <div style={{
          width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, transition: 'left 0.2s',
          left: value ? 16 : 2
        }} />
      </div>
    </div>
  )
}

function ParamSlider({ label, value, min, max, step, onChange }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted,#8a8a8a)', marginBottom: 3 }}>
        <span>{label}</span>
        <span style={{ color: 'var(--text-dim,#5a5a5a)', fontVariantNumeric: 'tabular-nums' }}>{step < 1 ? value.toFixed(step < 0.01 ? 3 : step < 0.1 ? 2 : 1) : value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)}
        style={{ width: '100%', accentColor: 'var(--accent-50,#c8a050)', height: 3, cursor: 'pointer' }}
      />
    </div>
  )
}

function TypeLegend({ types, hiddenTypes, onToggle, compact }) {
  return (
    <div style={{ position: 'absolute', bottom: compact ? 8 : 16, left: compact ? 8 : 14, zIndex: 10, background: 'var(--bg-panel-85,rgba(10,6,1,0.7))', backdropFilter: 'blur(30px) saturate(1.4)', WebkitBackdropFilter: 'blur(30px) saturate(1.4)', border: '1px solid var(--border-14,rgba(255,200,120,0.1))', borderRadius: 14, padding: '11px 15px' }}>
      <div style={{ fontSize: 10, color: 'var(--text-dark,#444444)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>Types</div>
      {types.map(t => {
        const hidden = hiddenTypes.has(t.id)
        const color = t.color || BUILTIN_COLORS[t.id] || '#8a8a8a'
        return (
          <div key={t.id} onClick={() => onToggle(t.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: hidden ? 'var(--text-darker,#2e2e2e)' : 'var(--text-muted,#8a8a8a)', marginBottom: 3, cursor: 'pointer', opacity: hidden ? 0.4 : 1, transition: 'opacity 0.2s', textDecoration: hidden ? 'line-through' : 'none' }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: hidden ? 'var(--text-darker,#2e2e2e)' : color, flexShrink: 0, transition: 'background 0.2s' }} />
            {t.icon} {t.name}
          </div>
        )
      })}
    </div>
  )
}

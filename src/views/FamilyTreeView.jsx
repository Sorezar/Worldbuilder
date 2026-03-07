import React, { useState, useRef, useCallback, useEffect } from 'react'
import { usePanZoom } from '../hooks/usePanZoom.js'
import { BUILTIN_TYPES } from '../data/types.js'
import ViewHeader from '../components/ViewHeader.jsx'
import ViewToolbar, { ToolBtn, ToolSep } from '../components/ViewToolbar.jsx'
import { Icon } from '../components/ui.jsx'
import { uid } from '../store/useStore.js'

const EDGE_TYPES = [
  { id: 'parent', label: 'Parent', color: '#a78bfa', dash: '' },
  { id: 'child', label: 'Enfant', color: '#a78bfa', dash: '' },
  { id: 'sibling', label: 'Frère/Sœur', color: '#60a5fa', dash: '' },
  { id: 'half_sibling', label: 'Demi-frère/sœur', color: '#60a5fa', dash: '6,4' },
  { id: 'partner', label: 'Partenaire', color: '#f472b6', dash: '' },
  { id: 'ex', label: 'Ex', color: '#f472b6', dash: '6,4' },
  { id: 'adopted', label: 'Adopté', color: '#34d399', dash: '3,3' },
]

const NODE_W = 140, NODE_H = 70

export default function FamilyTreeView({ card, cards, customTypes, allTypes, onUpdate, onDelete, onClose, onOpenCard, onCreateCard }) {
  const data = card.data || { nodes: [], edges: [] }
  const nodes = data.nodes || []
  const edges = data.edges || []
  const svgRef = useRef()
  const containerRef = useRef()
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [tool, setTool] = useState('select') // select | connect
  const [edgeType, setEdgeType] = useState('parent')
  const [connectFrom, setConnectFrom] = useState(null)
  const [selected, setSelected] = useState(null) // node id
  const [selectedEdge, setSelectedEdge] = useState(null)
  const [dragState, setDragState] = useState(null)
  const [showPicker, setShowPicker] = useState(null) // node id
  const [pickerSearch, setPickerSearch] = useState('')
  const { pan, zoom, onBgMouseDown, onMouseMove: panMove, onMouseUp: panUp, onWheel, reset } = usePanZoom(1)
  const type = allTypes.find(t => t.id === card.typeId)
  const moved = useRef(false)
  const pickerRef = useRef()

  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setSize({ w: e.contentRect.width, h: e.contentRect.height })
    })
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return
    const h = e => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowPicker(null) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [showPicker])

  const updateData = useCallback((patch) => {
    onUpdate(card.id, { data: { ...data, ...patch } })
  }, [card.id, data, onUpdate])

  const toCanvas = useCallback((clientX, clientY) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: (clientX - rect.left - pan.x) / zoom, y: (clientY - rect.top - pan.y) / zoom }
  }, [pan, zoom])

  // Add node
  const addNode = useCallback((x, y) => {
    const node = { id: uid(), cardId: null, x, y }
    updateData({ nodes: [...nodes, node] })
    setSelected(node.id)
    setShowPicker(node.id)
    return node
  }, [nodes, updateData])

  // Delete node
  const deleteNode = useCallback((nodeId) => {
    updateData({
      nodes: nodes.filter(n => n.id !== nodeId),
      edges: edges.filter(e => e.from !== nodeId && e.to !== nodeId),
    })
    if (selected === nodeId) setSelected(null)
  }, [nodes, edges, selected, updateData])

  // Delete edge
  const deleteEdge = useCallback((edgeId) => {
    updateData({ edges: edges.filter(e => e.id !== edgeId) })
    if (selectedEdge === edgeId) setSelectedEdge(null)
  }, [edges, selectedEdge, updateData])

  // Link node to card
  const linkNode = useCallback((nodeId, cardId) => {
    updateData({ nodes: nodes.map(n => n.id === nodeId ? { ...n, cardId } : n) })
    setShowPicker(null)
    setPickerSearch('')
  }, [nodes, updateData])

  // Add edge
  const addEdge = useCallback((from, to, type) => {
    // Avoid duplicates
    if (edges.some(e => (e.from === from && e.to === to) || (e.from === to && e.to === from))) return
    updateData({ edges: [...edges, { id: uid(), from, to, type }] })
  }, [edges, updateData])

  // SVG interactions
  const handleSvgMouseDown = useCallback((e) => {
    if (e.target === svgRef.current || e.target.tagName === 'rect') {
      setSelected(null)
      setSelectedEdge(null)
      setConnectFrom(null)
      onBgMouseDown(e)
    }
  }, [onBgMouseDown])

  const handleNodeMouseDown = useCallback((e, nodeId) => {
    e.stopPropagation()
    moved.current = false
    if (tool === 'connect') {
      if (!connectFrom) {
        setConnectFrom(nodeId)
      } else if (connectFrom !== nodeId) {
        addEdge(connectFrom, nodeId, edgeType)
        setConnectFrom(null)
      }
      return
    }
    setSelected(nodeId)
    setSelectedEdge(null)
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return
    const pos = toCanvas(e.clientX, e.clientY)
    setDragState({ id: nodeId, offX: pos.x - node.x, offY: pos.y - node.y })
  }, [tool, connectFrom, edgeType, nodes, toCanvas, addEdge])

  const handleMouseMove = useCallback((e) => {
    if (dragState) {
      moved.current = true
      const pos = toCanvas(e.clientX, e.clientY)
      const updated = nodes.map(n => n.id === dragState.id ? { ...n, x: pos.x - dragState.offX, y: pos.y - dragState.offY } : n)
      updateData({ nodes: updated })
    } else {
      panMove(e)
    }
  }, [dragState, nodes, toCanvas, updateData, panMove])

  const handleMouseUp = useCallback(() => {
    setDragState(null)
    panUp()
  }, [panUp])

  const handleWheel = useCallback((e) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (rect) onWheel(e, rect)
  }, [onWheel])

  // Add node button (+) near a node
  const handleAddNear = useCallback((nodeId, dx, dy) => {
    const parent = nodes.find(n => n.id === nodeId)
    if (!parent) return
    const node = addNode(parent.x + dx, parent.y + dy)
    if (node) {
      // Auto-connect with current edge type
      addEdge(nodeId, node.id, edgeType)
    }
  }, [nodes, addNode, addEdge, edgeType])

  // Auto-layout by generations
  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0) return
    // Simple BFS-based layout
    const adj = {}
    nodes.forEach(n => { adj[n.id] = [] })
    edges.forEach(e => {
      if (adj[e.from]) adj[e.from].push(e.to)
      if (adj[e.to]) adj[e.to].push(e.from)
    })
    const visited = new Set()
    const levels = {}
    const queue = [nodes[0].id]
    visited.add(nodes[0].id)
    levels[nodes[0].id] = 0
    while (queue.length > 0) {
      const cur = queue.shift()
      for (const nb of (adj[cur] || [])) {
        if (!visited.has(nb)) {
          visited.add(nb)
          levels[nb] = levels[cur] + 1
          queue.push(nb)
        }
      }
    }
    // Assign unvisited nodes
    nodes.forEach(n => { if (!visited.has(n.id)) levels[n.id] = 0 })
    // Group by level
    const groups = {}
    Object.entries(levels).forEach(([id, lv]) => { if (!groups[lv]) groups[lv] = []; groups[lv].push(id) })
    const updated = nodes.map(n => {
      const lv = levels[n.id] || 0
      const group = groups[lv]
      const idx = group.indexOf(n.id)
      const total = group.length
      const spacingX = NODE_W + 40
      const spacingY = NODE_H + 80
      return { ...n, x: (idx - (total - 1) / 2) * spacingX + 400, y: lv * spacingY + 100 }
    })
    updateData({ nodes: updated })
  }, [nodes, edges, updateData])

  // Add center node if empty
  const handleAddFirst = useCallback(() => {
    addNode(400, 300)
  }, [addNode])

  // Eligible cards for picker (characters preferred)
  const usedCardIds = new Set(nodes.filter(n => n.cardId).map(n => n.cardId))
  const eligibleCards = cards.filter(c => {
    if (usedCardIds.has(c.id)) return false
    // Prefer characters but allow all
    return true
  })

  // Delete on keyboard
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Delete') {
        if (selected && !showPicker) deleteNode(selected)
        if (selectedEdge) deleteEdge(selectedEdge)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [selected, selectedEdge, showPicker, deleteNode, deleteEdge])

  // Edge type dropdown state
  const [showEdgeMenu, setShowEdgeMenu] = useState(false)
  const edgeMenuRef = useRef()
  useEffect(() => {
    if (!showEdgeMenu) return
    const h = e => { if (edgeMenuRef.current && !edgeMenuRef.current.contains(e.target)) setShowEdgeMenu(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [showEdgeMenu])

  const currentEdgeType = EDGE_TYPES.find(e => e.id === edgeType) || EDGE_TYPES[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ViewHeader card={card} type={type} onClose={onClose} onUpdate={onUpdate} />

      <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <svg ref={svgRef} width={size.w} height={size.h}
          onMouseDown={handleSvgMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{ display: 'block', cursor: tool === 'connect' ? 'crosshair' : dragState ? 'grabbing' : 'grab', userSelect: 'none' }}
        >
          <defs>
            <pattern id={`dots-ft-${card.id}`} width={32 * zoom} height={32 * zoom} patternUnits="userSpaceOnUse"
              patternTransform={`translate(${pan.x % (32 * zoom)},${pan.y % (32 * zoom)})`}>
              <circle cx={0} cy={0} r={0.8} fill="rgba(255,255,255,0.04)" />
            </pattern>
          </defs>
          <rect width={size.w} height={size.h} fill={`url(#dots-ft-${card.id})`} />

          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {/* Edges */}
            {edges.map(edge => {
              const fromNode = nodes.find(n => n.id === edge.from)
              const toNode = nodes.find(n => n.id === edge.to)
              if (!fromNode || !toNode) return null
              const et = EDGE_TYPES.find(t => t.id === edge.type) || EDGE_TYPES[0]
              const fx = fromNode.x + NODE_W / 2, fy = fromNode.y + NODE_H / 2
              const tx = toNode.x + NODE_W / 2, ty = toNode.y + NODE_H / 2
              const isSel = selectedEdge === edge.id
              return (
                <g key={edge.id}>
                  {/* Invisible fat line for easier click */}
                  <line x1={fx} y1={fy} x2={tx} y2={ty} stroke="transparent" strokeWidth={12}
                    style={{ cursor: 'pointer' }} onClick={() => { setSelectedEdge(edge.id); setSelected(null) }} />
                  <line x1={fx} y1={fy} x2={tx} y2={ty}
                    stroke={isSel ? '#fff' : et.color} strokeWidth={isSel ? 2.5 : 2}
                    strokeDasharray={et.dash} strokeLinecap="round"
                    style={{ pointerEvents: 'none' }} />
                  {/* Label */}
                  <text x={(fx + tx) / 2} y={(fy + ty) / 2 - 8} textAnchor="middle" fontSize={9}
                    fill={et.color} fontFamily="'DM Sans', sans-serif" style={{ pointerEvents: 'none' }}>
                    {et.label}
                  </text>
                </g>
              )
            })}

            {/* Nodes */}
            {nodes.map(node => {
              const refCard = node.cardId ? cards.find(c => c.id === node.cardId) : null
              const cardType = refCard ? allTypes.find(t => t.id === refCard.typeId) : null
              const isSel = selected === node.id
              const isConnFrom = connectFrom === node.id
              return (
                <g key={node.id}>
                  <rect x={node.x} y={node.y} width={NODE_W} height={NODE_H} rx={12}
                    fill="rgba(10,6,1,0.85)" stroke={isConnFrom ? '#f59e0b' : isSel ? '#c8a064' : 'rgba(255,200,120,0.15)'}
                    strokeWidth={isSel || isConnFrom ? 2 : 1}
                    onMouseDown={e => handleNodeMouseDown(e, node.id)}
                    style={{ cursor: tool === 'connect' ? 'crosshair' : 'pointer' }}
                  />
                  {refCard ? (
                    <>
                      {refCard.image && (
                        <image href={refCard.image} x={node.x + 10} y={node.y + 10} width={44} height={44}
                          clipPath="inset(0 round 8px)" style={{ pointerEvents: 'none' }} />
                      )}
                      <text x={node.x + (refCard.image ? 62 : 12)} y={node.y + 30} fontSize={12} fill="#f0f0f0"
                        fontFamily="'DM Sans', sans-serif" style={{ pointerEvents: 'none' }}>
                        {refCard.name.length > 10 ? refCard.name.slice(0, 9) + '…' : refCard.name}
                      </text>
                      {cardType && (
                        <text x={node.x + (refCard.image ? 62 : 12)} y={node.y + 48} fontSize={9} fill={cardType.color || '#5a5a5a'}
                          style={{ pointerEvents: 'none' }}>
                          {cardType.icon} {cardType.name}
                        </text>
                      )}
                    </>
                  ) : (
                    <text x={node.x + NODE_W / 2} y={node.y + NODE_H / 2 + 4} textAnchor="middle" fontSize={11} fill="#444444"
                      fontFamily="'DM Sans', sans-serif" style={{ pointerEvents: 'none' }}>
                      Cliquer pour lier
                    </text>
                  )}

                  {/* + buttons around node on hover (only in select mode) */}
                  {isSel && tool === 'select' && (
                    <>
                      <PlusBtn x={node.x + NODE_W / 2 - 10} y={node.y - 30} onClick={() => handleAddNear(node.id, 0, -(NODE_H + 80))} />
                      <PlusBtn x={node.x + NODE_W / 2 - 10} y={node.y + NODE_H + 10} onClick={() => handleAddNear(node.id, 0, NODE_H + 80)} />
                      <PlusBtn x={node.x - 30} y={node.y + NODE_H / 2 - 10} onClick={() => handleAddNear(node.id, -(NODE_W + 40), 0)} />
                      <PlusBtn x={node.x + NODE_W + 10} y={node.y + NODE_H / 2 - 10} onClick={() => handleAddNear(node.id, NODE_W + 40, 0)} />
                    </>
                  )}
                </g>
              )
            })}
          </g>
        </svg>

        {/* Card picker popup */}
        {showPicker && (() => {
          const node = nodes.find(n => n.id === showPicker)
          if (!node) return null
          const sx = node.x * zoom + pan.x + NODE_W * zoom
          const sy = node.y * zoom + pan.y
          const filtered = eligibleCards.filter(c => c.name.toLowerCase().includes(pickerSearch.toLowerCase()))
          return (
            <div ref={pickerRef} style={{
              position: 'absolute', left: sx + 8, top: Math.min(sy, size.h - 280), zIndex: 600,
              background: 'rgba(10,6,1,0.92)', backdropFilter: 'blur(40px) saturate(1.5)', WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
              border: '1px solid rgba(255,200,120,0.14)', borderRadius: 14,
              width: 220, boxShadow: '0 8px 32px rgba(0,0,0,0.8)', overflow: 'hidden',
            }}>
              <div style={{ padding: '7px 9px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <input autoFocus value={pickerSearch} onChange={e => setPickerSearch(e.target.value)}
                  placeholder="Rechercher un personnage…"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '5px 9px', color: '#f0f0f0', fontSize: 12, outline: 'none' }}
                />
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {filtered.length === 0 && <div style={{ padding: '10px 14px', color: '#2e2e2e', fontSize: 12 }}>Aucun résultat</div>}
                {filtered.map(c => {
                  const t = allTypes.find(x => x.id === c.typeId)
                  return (
                    <div key={c.id} onClick={() => linkNode(showPicker, c.id)}
                      style={{ padding: '7px 13px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: '#c0c0c0' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      {c.image ? <img src={c.image} alt="" style={{ width: 16, height: 16, borderRadius: 3, objectFit: 'cover' }} /> : <span style={{ fontSize: 12 }}>{t?.icon || '📄'}</span>}
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* Zoom */}
        <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 11, color: '#2e2e2e', zIndex: 10 }}>
          {Math.round(zoom * 100)}%
        </div>

        {/* Hint */}
        {connectFrom && (
          <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', fontSize: 12, color: '#c8a064', background: 'rgba(10,6,1,0.85)', padding: '5px 14px', borderRadius: 8, border: '1px solid rgba(200,160,100,0.2)', zIndex: 20 }}>
            Cliquez sur un second nœud pour créer la relation
          </div>
        )}

        <ViewToolbar>
          <ToolBtn icon="cursor" label="Sélection" active={tool === 'select'} onClick={() => { setTool('select'); setConnectFrom(null) }} />
          <ToolBtn icon="connect" label="Connecter" active={tool === 'connect'} onClick={() => { setTool('connect'); setConnectFrom(null) }} />
          <ToolSep />
          {/* Edge type dropdown */}
          <div style={{ position: 'relative' }} ref={edgeMenuRef}>
            <ToolBtn onClick={() => setShowEdgeMenu(v => !v)} active={showEdgeMenu}>
              <span style={{ width: 10, height: 3, background: currentEdgeType.color, borderRadius: 2, display: 'inline-block' }} />
              <span style={{ fontSize: 11 }}>{currentEdgeType.label}</span>
              <Icon name="chevron_down" size={10} />
            </ToolBtn>
            {showEdgeMenu && (
              <div style={{
                position: 'absolute', bottom: '100%', left: 0, marginBottom: 6, zIndex: 600,
                background: 'rgba(10,6,1,0.92)', backdropFilter: 'blur(40px) saturate(1.5)', WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
                border: '1px solid rgba(255,200,120,0.14)', borderRadius: 12, overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.7)', minWidth: 160,
              }}>
                {EDGE_TYPES.map(et => (
                  <div key={et.id} onClick={() => { setEdgeType(et.id); setShowEdgeMenu(false) }}
                    style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: edgeType === et.id ? '#c8a064' : '#c0c0c0' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <span style={{ width: 16, height: 3, background: et.color, borderRadius: 2, display: 'inline-block', borderTop: et.dash ? '1px dashed ' + et.color : 'none' }} />
                    {et.label}
                  </div>
                ))}
              </div>
            )}
          </div>
          <ToolSep />
          <ToolBtn icon="plus" label="Ajouter nœud" onClick={handleAddFirst} />
          <ToolBtn icon="auto_layout" label="Auto-layout" onClick={handleAutoLayout} />
          <ToolSep />
          <ToolBtn icon="eye" label="Reset vue" onClick={reset} />
          {selected && <><ToolSep /><ToolBtn icon="link" label="Lier" onClick={() => { setShowPicker(selected); setPickerSearch('') }} /><ToolBtn icon="trash" label="Supprimer" onClick={() => deleteNode(selected)} /></>}
          {selectedEdge && <><ToolSep /><ToolBtn icon="trash" label="Suppr. relation" onClick={() => deleteEdge(selectedEdge)} /></>}
        </ViewToolbar>
      </div>
    </div>
  )
}

function PlusBtn({ x, y, onClick }) {
  return (
    <g onClick={e => { e.stopPropagation(); onClick() }} style={{ cursor: 'pointer' }}>
      <rect x={x} y={y} width={20} height={20} rx={6} fill="rgba(200,160,100,0.15)" stroke="rgba(200,160,100,0.3)" strokeWidth={1} />
      <line x1={x + 6} y1={y + 10} x2={x + 14} y2={y + 10} stroke="#c8a064" strokeWidth={1.5} />
      <line x1={x + 10} y1={y + 6} x2={x + 10} y2={y + 14} stroke="#c8a064" strokeWidth={1.5} />
    </g>
  )
}

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { usePanZoom } from '../hooks/usePanZoom.js'
import ViewHeader from '../components/ViewHeader.jsx'
import ViewToolbar, { ToolBtn, ToolSep } from '../components/ViewToolbar.jsx'
import { Icon, ColorPicker } from '../components/ui.jsx'
import { uid } from '../store/useStore.js'

const DEFAULT_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#a78bfa', '#f472b6', '#84cc16', '#60a5fa']

export default function GeoMapView({ card, cards, customTypes, allTypes, onUpdate, onDelete, onClose, onOpenCard, onCreateCard }) {
  const data = card.data || { backgroundImage: '', zones: [], labels: [], layers: [{ id: uid(), name: 'Défaut', visible: true }] }
  const zones = data.zones || []
  const labels = data.labels || []
  const layers = data.layers || [{ id: uid(), name: 'Défaut', visible: true }]
  const bgImage = data.backgroundImage || ''

  const svgRef = useRef()
  const containerRef = useRef()
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [tool, setTool] = useState('select') // select | polygon | text
  const [selectedZone, setSelectedZone] = useState(null)
  const [selectedLabel, setSelectedLabel] = useState(null)
  const [drawingPoints, setDrawingPoints] = useState([])
  const [activeLayer, setActiveLayer] = useState(layers[0]?.id)
  const [showLayers, setShowLayers] = useState(false)
  const [showZoneEditor, setShowZoneEditor] = useState(null)
  const [zoneEditorSearch, setZoneEditorSearch] = useState('')
  const [imgSize, setImgSize] = useState({ w: 800, h: 600 })
  const { pan, zoom, onBgMouseDown, onMouseMove: panMove, onMouseUp: panUp, onWheel, reset } = usePanZoom(1)
  const type = allTypes.find(t => t.id === card.typeId)
  const layersRef = useRef()
  const zoneEditorRef = useRef()

  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setSize({ w: e.contentRect.width, h: e.contentRect.height })
    })
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Close popups on outside click
  useEffect(() => {
    const h = e => {
      if (layersRef.current && !layersRef.current.contains(e.target)) setShowLayers(false)
      if (zoneEditorRef.current && !zoneEditorRef.current.contains(e.target)) setShowZoneEditor(null)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const updateData = useCallback((patch) => {
    onUpdate(card.id, { data: { ...data, ...patch } })
  }, [card.id, data, onUpdate])

  const toCanvas = useCallback((clientX, clientY) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: (clientX - rect.left - pan.x) / zoom, y: (clientY - rect.top - pan.y) / zoom }
  }, [pan, zoom])

  // Upload background image
  const handleUploadBg = useCallback(() => {
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
          // Compress to max 2048px
          const maxDim = 2048
          let w = img.width, h = img.height
          if (w > maxDim || h > maxDim) {
            if (w > h) { h = h * maxDim / w; w = maxDim }
            else { w = w * maxDim / h; h = maxDim }
          }
          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, w, h)
          const src = canvas.toDataURL('image/jpeg', 0.75)
          setImgSize({ w, h })
          updateData({ backgroundImage: src })
        }
        img.src = ev.target.result
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }, [updateData])

  // Load image size when bgImage exists
  useEffect(() => {
    if (!bgImage) return
    const img = new Image()
    img.onload = () => setImgSize({ w: img.width, h: img.height })
    img.src = bgImage
  }, [bgImage])

  // SVG interactions
  const handleSvgMouseDown = useCallback((e) => {
    if (e.target === svgRef.current || e.target.tagName === 'rect' || e.target.tagName === 'image') {
      if (tool === 'polygon') {
        // Add point
        const pos = toCanvas(e.clientX, e.clientY)
        setDrawingPoints(prev => {
          const pts = [...prev, [pos.x, pos.y]]
          // Close polygon if clicking near first point
          if (pts.length >= 3) {
            const dx = pts[0][0] - pos.x, dy = pts[0][1] - pos.y
            if (Math.sqrt(dx * dx + dy * dy) < 15 / zoom) {
              pts.pop() // remove the closing click
              const zone = { id: uid(), points: pts, cardId: null, color: DEFAULT_COLORS[zones.length % DEFAULT_COLORS.length], label: '', layerId: activeLayer }
              updateData({ zones: [...zones, zone] })
              setSelectedZone(zone.id)
              setDrawingPoints([])
              return []
            }
          }
          return pts
        })
        return
      }
      if (tool === 'text') {
        const pos = toCanvas(e.clientX, e.clientY)
        const lbl = { id: uid(), text: 'Label', x: pos.x, y: pos.y, fontSize: 14, color: '#f0f0f0', layerId: activeLayer }
        updateData({ labels: [...labels, lbl] })
        setSelectedLabel(lbl.id)
        setTool('select')
        return
      }
      setSelectedZone(null)
      setSelectedLabel(null)
      onBgMouseDown(e)
    }
  }, [tool, toCanvas, zoom, zones, labels, activeLayer, updateData, onBgMouseDown])

  // Close polygon on double click
  const handleDblClick = useCallback(() => {
    if (tool === 'polygon' && drawingPoints.length >= 3) {
      const zone = { id: uid(), points: drawingPoints, cardId: null, color: DEFAULT_COLORS[zones.length % DEFAULT_COLORS.length], label: '', layerId: activeLayer }
      updateData({ zones: [...zones, zone] })
      setSelectedZone(zone.id)
      setDrawingPoints([])
    }
  }, [tool, drawingPoints, zones, activeLayer, updateData])

  const handleMouseMove = useCallback((e) => { panMove(e) }, [panMove])
  const handleMouseUp = useCallback(() => { panUp() }, [panUp])

  const handleWheel = useCallback((e) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (rect) onWheel(e, rect)
  }, [onWheel])

  // Zone actions
  const updateZone = useCallback((zoneId, patch) => {
    updateData({ zones: zones.map(z => z.id === zoneId ? { ...z, ...patch } : z) })
  }, [zones, updateData])

  const deleteZone = useCallback((zoneId) => {
    updateData({ zones: zones.filter(z => z.id !== zoneId) })
    if (selectedZone === zoneId) setSelectedZone(null)
  }, [zones, selectedZone, updateData])

  // Label actions
  const updateLabel = useCallback((labelId, patch) => {
    updateData({ labels: labels.map(l => l.id === labelId ? { ...l, ...patch } : l) })
  }, [labels, updateData])

  const deleteLabel = useCallback((labelId) => {
    updateData({ labels: labels.filter(l => l.id !== labelId) })
    if (selectedLabel === labelId) setSelectedLabel(null)
  }, [labels, selectedLabel, updateData])

  // Layer actions
  const addLayer = useCallback(() => {
    const lyr = { id: uid(), name: `Calque ${layers.length + 1}`, visible: true }
    updateData({ layers: [...layers, lyr] })
    setActiveLayer(lyr.id)
  }, [layers, updateData])

  const toggleLayerVisibility = useCallback((layerId) => {
    updateData({ layers: layers.map(l => l.id === layerId ? { ...l, visible: !l.visible } : l) })
  }, [layers, updateData])

  const deleteLayer = useCallback((layerId) => {
    if (layers.length <= 1) return
    updateData({
      layers: layers.filter(l => l.id !== layerId),
      zones: zones.filter(z => z.layerId !== layerId),
      labels: labels.filter(l => l.layerId !== layerId),
    })
    if (activeLayer === layerId) setActiveLayer(layers.find(l => l.id !== layerId)?.id)
  }, [layers, zones, labels, activeLayer, updateData])

  // Delete on keyboard
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Delete') {
        if (selectedZone) deleteZone(selectedZone)
        if (selectedLabel) deleteLabel(selectedLabel)
      }
      if (e.key === 'Escape' && tool === 'polygon') {
        setDrawingPoints([])
        setTool('select')
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [selectedZone, selectedLabel, tool, deleteZone, deleteLabel])

  const visibleLayers = new Set(layers.filter(l => l.visible).map(l => l.id))

  // Mode A: No background - show upload screen
  if (!bgImage) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <ViewHeader card={card} type={type} onClose={onClose} onUpdate={onUpdate} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 40 }}>
          <div style={{ fontSize: 48, opacity: 0.2 }}>🗺</div>
          <p style={{ fontSize: 16, color: '#8a8a8a', textAlign: 'center' }}>Commencez par télécharger une image de carte</p>
          <p style={{ fontSize: 12, color: '#444444', textAlign: 'center', maxWidth: 320 }}>
            Utilisez une image de carte de votre monde. Vous pourrez ensuite dessiner des zones et les lier à vos cartes.
          </p>
          <button onClick={handleUploadBg} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12,
            background: 'rgba(200,160,100,0.15)', border: '1px solid rgba(200,160,100,0.25)',
            color: '#c8a064', fontSize: 14, cursor: 'pointer', transition: 'all 0.12s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,160,100,0.25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(200,160,100,0.15)'}>
            <Icon name="upload" size={16} /> Télécharger une image
          </button>
        </div>
      </div>
    )
  }

  // Mode B: Map editor
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ViewHeader card={card} type={type} onClose={onClose} onUpdate={onUpdate}>
        {/* Layer selector in header */}
        <div style={{ position: 'relative' }} ref={layersRef}>
          <button onClick={() => setShowLayers(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 7,
            background: showLayers ? 'rgba(200,160,100,0.15)' : 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)', color: '#8a8a8a', fontSize: 11, cursor: 'pointer',
          }}>
            <Icon name="layers" size={12} /> Calques <Icon name="chevron_down" size={10} />
          </button>
          {showLayers && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 600,
              background: 'rgba(10,6,1,0.92)', backdropFilter: 'blur(40px) saturate(1.5)', WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
              border: '1px solid rgba(255,200,120,0.14)', borderRadius: 12, overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.7)', minWidth: 180, padding: '6px 0',
            }}>
              {layers.map(lyr => (
                <div key={lyr.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', fontSize: 12,
                  color: activeLayer === lyr.id ? '#c8a064' : '#c0c0c0', cursor: 'pointer',
                  background: activeLayer === lyr.id ? 'rgba(200,160,100,0.1)' : 'transparent',
                }}
                  onClick={() => setActiveLayer(lyr.id)}
                >
                  <span onClick={e => { e.stopPropagation(); toggleLayerVisibility(lyr.id) }}
                    style={{ cursor: 'pointer', opacity: lyr.visible ? 1 : 0.3 }}>
                    <Icon name="eye" size={12} />
                  </span>
                  <span style={{ flex: 1 }}>{lyr.name}</span>
                  {layers.length > 1 && (
                    <span onClick={e => { e.stopPropagation(); deleteLayer(lyr.id) }}
                      style={{ cursor: 'pointer', opacity: 0.4, fontSize: 10 }}>✕</span>
                  )}
                </div>
              ))}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 4, paddingTop: 4 }}>
                <div onClick={addLayer}
                  style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: '#8a8a8a' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#c8a064'}
                  onMouseLeave={e => e.currentTarget.style.color = '#8a8a8a'}>
                  <Icon name="plus" size={11} /> Nouveau calque
                </div>
              </div>
            </div>
          )}
        </div>
      </ViewHeader>

      <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <svg ref={svgRef} width={size.w} height={size.h}
          onMouseDown={handleSvgMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDblClick}
          onWheel={handleWheel}
          style={{ display: 'block', cursor: tool === 'polygon' ? 'crosshair' : tool === 'text' ? 'crosshair' : 'grab', userSelect: 'none' }}
        >
          <rect width={size.w} height={size.h} fill="rgba(8,4,0,0.3)" />

          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {/* Background image */}
            <image href={bgImage} x={0} y={0} width={imgSize.w} height={imgSize.h} />

            {/* Zones */}
            {zones.filter(z => visibleLayers.has(z.layerId)).map(zone => {
              const isSel = selectedZone === zone.id
              const pts = zone.points.map(p => p.join(',')).join(' ')
              return (
                <g key={zone.id}>
                  <polygon points={pts}
                    fill={zone.color + '30'} stroke={isSel ? '#fff' : zone.color} strokeWidth={isSel ? 2.5 : 1.5}
                    style={{ cursor: 'pointer' }}
                    onClick={e => { e.stopPropagation(); setSelectedZone(zone.id); setSelectedLabel(null) }}
                    onDoubleClick={e => { e.stopPropagation(); setShowZoneEditor(zone.id); setZoneEditorSearch('') }}
                  />
                  {zone.label && (
                    <text x={centroid(zone.points)[0]} y={centroid(zone.points)[1]}
                      textAnchor="middle" dominantBaseline="central" fontSize={12}
                      fill="#fff" fontFamily="'DM Sans', sans-serif" fontWeight={600}
                      style={{ pointerEvents: 'none', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                      {zone.label}
                    </text>
                  )}
                </g>
              )
            })}

            {/* Labels */}
            {labels.filter(l => visibleLayers.has(l.layerId)).map(lbl => {
              const isSel = selectedLabel === lbl.id
              return (
                <text key={lbl.id} x={lbl.x} y={lbl.y}
                  fontSize={lbl.fontSize || 14} fill={lbl.color || '#f0f0f0'}
                  fontFamily="'DM Sans', sans-serif" fontWeight={500}
                  stroke={isSel ? 'rgba(200,160,100,0.4)' : 'none'} strokeWidth={isSel ? 3 : 0} paintOrder="stroke"
                  style={{ cursor: 'pointer', textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}
                  onClick={e => { e.stopPropagation(); setSelectedLabel(lbl.id); setSelectedZone(null) }}
                >
                  {lbl.text}
                </text>
              )
            })}

            {/* Drawing preview */}
            {drawingPoints.length > 0 && (
              <g>
                <polyline points={drawingPoints.map(p => p.join(',')).join(' ')}
                  fill="none" stroke="#c8a064" strokeWidth={2} strokeDasharray="6,4" />
                {drawingPoints.map((p, i) => (
                  <circle key={i} cx={p[0]} cy={p[1]} r={4 / zoom} fill="#c8a064" stroke="#fff" strokeWidth={1 / zoom} />
                ))}
              </g>
            )}
          </g>
        </svg>

        {/* Zone editor popup */}
        {showZoneEditor && (() => {
          const zone = zones.find(z => z.id === showZoneEditor)
          if (!zone) return null
          const c = centroid(zone.points)
          const sx = c[0] * zoom + pan.x
          const sy = c[1] * zoom + pan.y
          const linkedCard = zone.cardId ? cards.find(cc => cc.id === zone.cardId) : null
          const filtered = cards.filter(cc => cc.name.toLowerCase().includes(zoneEditorSearch.toLowerCase()))
          return (
            <div ref={zoneEditorRef} style={{
              position: 'absolute', left: Math.min(sx, size.w - 260), top: Math.min(sy, size.h - 320), zIndex: 600,
              background: 'rgba(10,6,1,0.92)', backdropFilter: 'blur(40px) saturate(1.5)', WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
              border: '1px solid rgba(255,200,120,0.14)', borderRadius: 14,
              width: 240, boxShadow: '0 8px 32px rgba(0,0,0,0.8)', overflow: 'hidden',
            }}>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 10, color: '#444444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Label</div>
                <input value={zone.label || ''} onChange={e => updateZone(zone.id, { label: e.target.value })}
                  placeholder="Nom de la zone…"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '5px 9px', color: '#f0f0f0', fontSize: 12, outline: 'none' }}
                />
              </div>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 10, color: '#444444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Couleur</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {DEFAULT_COLORS.map(c => (
                    <div key={c} onClick={() => updateZone(zone.id, { color: c })} style={{
                      width: 18, height: 18, borderRadius: '50%', background: c, cursor: 'pointer',
                      border: zone.color === c ? '2px solid #fff' : '2px solid transparent',
                    }} />
                  ))}
                </div>
              </div>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 10, color: '#444444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Lier à une carte</div>
                {linkedCard ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: 6 }}>
                    <span style={{ fontSize: 12 }}>{allTypes.find(t => t.id === linkedCard.typeId)?.icon || '📄'}</span>
                    <span style={{ fontSize: 12, color: '#c0c0c0', flex: 1 }}>{linkedCard.name}</span>
                    <span onClick={() => updateZone(zone.id, { cardId: null })} style={{ cursor: 'pointer', fontSize: 10, color: '#8a8a8a' }}>✕</span>
                  </div>
                ) : (
                  <>
                    <input value={zoneEditorSearch} onChange={e => setZoneEditorSearch(e.target.value)}
                      placeholder="Rechercher…"
                      style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '4px 8px', color: '#f0f0f0', fontSize: 11, outline: 'none', marginBottom: 4 }}
                    />
                    <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                      {filtered.slice(0, 20).map(cc => {
                        const t = allTypes.find(x => x.id === cc.typeId)
                        return (
                          <div key={cc.id} onClick={() => { updateZone(zone.id, { cardId: cc.id }); setZoneEditorSearch('') }}
                            style={{ padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, color: '#c0c0c0' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <span style={{ fontSize: 11 }}>{t?.icon || '📄'}</span>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cc.name}</span>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
              <div style={{ padding: '6px 12px', display: 'flex', justifyContent: 'flex-end' }}>
                <span onClick={() => { deleteZone(zone.id); setShowZoneEditor(null) }}
                  style={{ fontSize: 11, color: '#e05040', cursor: 'pointer', padding: '3px 8px' }}>
                  Supprimer
                </span>
              </div>
            </div>
          )
        })()}

        {/* Zoom */}
        <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 11, color: '#2e2e2e', zIndex: 10 }}>
          {Math.round(zoom * 100)}%
        </div>

        {/* Drawing hint */}
        {tool === 'polygon' && drawingPoints.length > 0 && (
          <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', fontSize: 12, color: '#c8a064', background: 'rgba(10,6,1,0.85)', padding: '5px 14px', borderRadius: 8, border: '1px solid rgba(200,160,100,0.2)', zIndex: 20 }}>
            {drawingPoints.length < 3 ? `${3 - drawingPoints.length} point(s) minimum` : 'Double-clic ou clic près du 1er point pour fermer'}
          </div>
        )}

        <ViewToolbar>
          <ToolBtn icon="cursor" label="Sélection" active={tool === 'select'} onClick={() => { setTool('select'); setDrawingPoints([]) }} />
          <ToolBtn icon="polygon" label="Polygone" active={tool === 'polygon'} onClick={() => setTool('polygon')} />
          <ToolBtn icon="text_icon" label="Texte" active={tool === 'text'} onClick={() => setTool('text')} />
          <ToolSep />
          <ToolBtn icon="upload" label="Changer image" onClick={handleUploadBg} />
          <ToolBtn icon="eye" label="Reset vue" onClick={reset} />
          {selectedZone && (
            <>
              <ToolSep />
              <ToolBtn icon="link" label="Éditer zone" onClick={() => { setShowZoneEditor(selectedZone); setZoneEditorSearch('') }} />
              <ToolBtn icon="trash" label="Supprimer" onClick={() => deleteZone(selectedZone)} />
            </>
          )}
          {selectedLabel && (
            <>
              <ToolSep />
              <ToolBtn icon="trash" label="Suppr. label" onClick={() => deleteLabel(selectedLabel)} />
            </>
          )}
        </ViewToolbar>
      </div>
    </div>
  )
}

// Compute centroid of polygon
function centroid(points) {
  if (points.length === 0) return [0, 0]
  let cx = 0, cy = 0
  points.forEach(p => { cx += p[0]; cy += p[1] })
  return [cx / points.length, cy / points.length]
}

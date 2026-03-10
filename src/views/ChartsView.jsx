import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Icon, Btn } from '../components/ui.jsx'
import { BUILTIN_TYPES, getEffectiveProps } from '../data/types.js'
import { resolveCollisions, RESIZE_HANDLES, DOT_SIZE } from '../data/widgetDefaults.js'

const CHART_COLORS = ['#c084fc','#c8a064','#06b6d4','#22c55e','#ef4444','#f59e0b','#a78bfa','#84cc16']
const MAX_CHARTS = 6
const COLS = 12
const ROW_H = 50
const GAP = 8
const MIN_W = 3
const MIN_H = 3
const LONG_PRESS_MS = 400

function getNumericProps(card, effectivePropDefs) {
  const result = {}
  const propDefMap = {}
  ;(effectivePropDefs || []).forEach(p => { propDefMap[p.id] = p })
  Object.entries(card.props||{}).forEach(([k,v]) => {
    const def = propDefMap[k]
    if (def && (def.fieldType === 'date' || def.fieldType === 'card_ref')) return
    const n = parseFloat(v)
    if (!isNaN(n) && v !== '' && v !== null) result[k] = n
  })
  ;(card.extraProps||[]).forEach(ep => {
    if (ep.fieldType === 'date' || ep.fieldType === 'card_ref') return
    const n = parseFloat(ep.value)
    if (!isNaN(n) && ep.value !== '' && ep.value !== null) result[ep.name||ep.id] = n
  })
  return result
}

let _chartUid = 0
const chartUid = () => 'ch_' + (++_chartUid) + '_' + Date.now().toString(36)

function chartOverlaps(a, b) {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y)
}

function findFreeSpot(charts, w, h) {
  for (let y = 0; y < 50; y++) {
    for (let x = 0; x <= COLS - w; x++) {
      const test = { x, y, w, h }
      if (!charts.some(c => chartOverlaps(test, c))) return { x, y }
    }
  }
  return { x: 0, y: charts.reduce((max, c) => Math.max(max, c.y + c.h), 0) }
}

function createChart(charts = []) {
  const { x, y } = findFreeSpot(charts, 6, 5)
  return { id: chartUid(), type: 'radar', stats: [], cardIds: [], title: '', x, y, w: 6, h: 5 }
}

// ─── Main View ───────────────────────────────────────────────
export default function ChartsView({ cards, customTypes }) {
  const [pages, setPages] = useState([{ id: chartUid(), name: 'Page 1', charts: [createChart()] }])
  const [currentPage, setCurrentPage] = useState(0)
  const [zoomedChart, setZoomedChart] = useState(null)
  const [editingTab, setEditingTab] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [selectedChart, setSelectedChart] = useState(null)

  const gridRef = useRef()
  const [dragging, setDragging] = useState(null)
  const [resizing, setResizing] = useState(null)
  const [previewLayout, setPreviewLayout] = useState(null)
  const pushRef = useRef({ timer: null, pos: null })

  const allTypes = [...BUILTIN_TYPES, ...(customTypes||[])]

  const cardsWithStats = useMemo(() =>
    cards.filter(c => Object.keys(getNumericProps(c, getEffectiveProps(c.typeId, customTypes))).length > 0)
  , [cards, customTypes])

  const statKeyLabels = useMemo(() => {
    const labels = {}
    cards.forEach(c => {
      const defs = getEffectiveProps(c.typeId, customTypes)
      defs.forEach(p => { if (!labels[p.id]) labels[p.id] = p.name })
      ;(c.extraProps||[]).forEach(ep => { const k = ep.name||ep.id; if (!labels[k]) labels[k] = ep.name||ep.id })
    })
    return labels
  }, [cards, customTypes])

  const statLabel = k => statKeyLabels[k] || k

  const allStatKeys = useMemo(() => {
    const keys = new Set()
    cards.forEach(c => Object.keys(getNumericProps(c, getEffectiveProps(c.typeId, customTypes))).forEach(k => keys.add(k)))
    return [...keys]
  }, [cards, customTypes])

  const page = pages[currentPage] || pages[0]

  const updateChart = (chartId, patch) => {
    setPages(prev => prev.map((p, i) => i !== currentPage ? p : {
      ...p, charts: p.charts.map(c => c.id === chartId ? { ...c, ...patch } : c)
    }))
  }

  const removeChart = chartId => {
    setPages(prev => prev.map((p, i) => i !== currentPage ? p : {
      ...p, charts: p.charts.filter(c => c.id !== chartId)
    }))
    if (zoomedChart === chartId) setZoomedChart(null)
  }

  const addChart = () => {
    if (page.charts.length >= MAX_CHARTS) return
    const nc = createChart(page.charts)
    const resolved = resolveCollisions([...page.charts, nc], nc.id)
    setPages(prev => prev.map((p, i) => i !== currentPage ? p : { ...p, charts: resolved }))
  }

  const addPage = () => {
    const n = pages.length + 1
    setPages(prev => [...prev, { id: chartUid(), name: `Page ${n}`, charts: [createChart()] }])
    setCurrentPage(pages.length)
  }

  const removePage = idx => {
    if (pages.length <= 1) return
    setPages(prev => prev.filter((_, i) => i !== idx))
    if (currentPage >= pages.length - 1) setCurrentPage(Math.max(0, pages.length - 2))
    else if (currentPage > idx) setCurrentPage(currentPage - 1)
  }

  const renamePage = (pageId, name) => {
    setPages(prev => prev.map(p => p.id === pageId ? { ...p, name: name || p.name } : p))
    setEditingTab(null)
  }

  const startEditTab = (pageId, currentName) => {
    setEditingTab(pageId)
    setEditingName(currentName)
  }

  const buildChartData = (chart) => {
    const targets = cards.filter(c => chart.cardIds.includes(c.id))
    const stats = chart.stats.length > 0 ? chart.stats : allStatKeys
    return targets
      .filter(card => { const np = getNumericProps(card, getEffectiveProps(card.typeId, customTypes)); return stats.some(k => np[k] !== undefined && !isNaN(np[k])) })
      .map((card, i) => ({
        card,
        color: CHART_COLORS[cardsWithStats.indexOf(card) % CHART_COLORS.length] || CHART_COLORS[i % CHART_COLORS.length],
        stats: stats.map(k => ({ key: k, value: getNumericProps(card, getEffectiveProps(card.typeId, customTypes))[k] ?? 0 })),
      }))
  }

  // ─── Drag / Resize ──────────────────────────────
  const displayCharts = previewLayout || page.charts
  const activeId = dragging?.id || resizing?.id
  const maxRow = Math.max(6, displayCharts.reduce((max, c) => Math.max(max, c.y + c.h), 0))

  const getCellSize = useCallback(() => {
    if (!gridRef.current) return { cw: 60, ch: ROW_H }
    const rect = gridRef.current.getBoundingClientRect()
    const cw = (rect.width - GAP * (COLS - 1)) / COLS
    const ch = maxRow > 0 ? (rect.height - GAP * (maxRow - 1)) / maxRow : ROW_H
    return { cw, ch }
  }, [maxRow])

  const onDragStart = useCallback((e, chart) => {
    e.preventDefault()
    setDragging({ id: chart.id, startX: e.clientX, startY: e.clientY, origX: chart.x, origY: chart.y })
    setPreviewLayout(page.charts.map(c => ({ ...c })))
  }, [page.charts])

  const onResizeStart = useCallback((e, chart, edges) => {
    e.preventDefault()
    e.stopPropagation()
    setResizing({
      id: chart.id, startX: e.clientX, startY: e.clientY,
      origX: chart.x, origY: chart.y, origW: chart.w, origH: chart.h,
      edges,
    })
    setPreviewLayout(page.charts.map(c => ({ ...c })))
  }, [page.charts])

  useEffect(() => {
    if (!dragging && !resizing) return
    const { cw, ch } = getCellSize()

    const onMove = e => {
      if (dragging) {
        const dx = Math.round((e.clientX - dragging.startX) / (cw + GAP))
        const dy = Math.round((e.clientY - dragging.startY) / (ch + GAP))
        const c = page.charts.find(c => c.id === dragging.id)
        if (!c) return
        const newX = Math.max(0, Math.min(COLS - c.w, dragging.origX + dx))
        const newY = Math.max(0, dragging.origY + dy)
        const posKey = `d${newX},${newY}`
        if (posKey === pushRef.current.pos) return
        pushRef.current.pos = posKey
        const moved = page.charts.map(lc => lc.id === dragging.id ? { ...lc, x: newX, y: newY } : { ...lc })
        setPreviewLayout(moved)
        clearTimeout(pushRef.current.timer)
        pushRef.current.timer = setTimeout(() => {
          setPreviewLayout(prev => prev ? resolveCollisions(prev, dragging.id) : prev)
        }, 250)
      }
      if (resizing) {
        const dxCells = Math.round((e.clientX - resizing.startX) / (cw + GAP))
        const dyCells = Math.round((e.clientY - resizing.startY) / (ch + GAP))
        let nX = resizing.origX, nY = resizing.origY
        let nW = resizing.origW, nH = resizing.origH
        if (resizing.edges.right) nW = resizing.origW + dxCells
        if (resizing.edges.left) { nX = resizing.origX + dxCells; nW = resizing.origW - dxCells }
        if (resizing.edges.bottom) nH = resizing.origH + dyCells
        if (resizing.edges.top) { nY = resizing.origY + dyCells; nH = resizing.origH - dyCells }
        if (nW < MIN_W) { if (resizing.edges.left) nX = resizing.origX + resizing.origW - MIN_W; nW = MIN_W }
        if (nH < MIN_H) { if (resizing.edges.top) nY = resizing.origY + resizing.origH - MIN_H; nH = MIN_H }
        if (nX < 0) { nW += nX; nX = 0 }
        if (nY < 0) { nH += nY; nY = 0 }
        if (nX + nW > COLS) nW = COLS - nX
        if (nW < MIN_W) nW = MIN_W
        if (nH < MIN_H) nH = MIN_H
        const posKey = `r${nX},${nY},${nW},${nH}`
        if (posKey === pushRef.current.pos) return
        pushRef.current.pos = posKey
        const moved = page.charts.map(lc => lc.id === resizing.id ? { ...lc, x: nX, y: nY, w: nW, h: nH } : { ...lc })
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
        const final = activeId ? resolveCollisions(previewLayout, activeId) : previewLayout
        setPages(prev => prev.map((p, i) => i !== currentPage ? p : { ...p, charts: final }))
      }
      setDragging(null)
      setResizing(null)
      setPreviewLayout(null)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
  }, [dragging, resizing, previewLayout, page.charts, currentPage, getCellSize])

  // Deselect chart when clicking outside it
  useEffect(() => {
    if (!selectedChart || dragging || resizing) return
    const h = e => {
      const el = document.querySelector(`[data-chart-id="${selectedChart}"]`)
      if (el && !el.contains(e.target)) setSelectedChart(null)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [selectedChart, dragging, resizing])

  const zoomed = zoomedChart ? page.charts.find(c => c.id === zoomedChart) : null

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg-base-50,rgba(8,4,0,0.5))', backdropFilter:'blur(40px) saturate(1.4)', WebkitBackdropFilter:'blur(40px) saturate(1.4)', borderRadius:16, border:'1px solid var(--border-09,rgba(255,200,120,0.09))' }}>
      {/* Tab bar */}
      <div style={{ padding:'0 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'end', gap:0, flexShrink:0, overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'end', gap:2, flex:1, overflow:'auto', paddingTop:10 }}>
          {pages.map((p, i) => (
            <div key={p.id}
              onClick={() => { setCurrentPage(i); setZoomedChart(null) }}
              onDoubleClick={() => startEditTab(p.id, p.name)}
              style={{
                padding: editingTab === p.id ? '4px 4px 5px' : '6px 14px 7px',
                borderRadius:'8px 8px 0 0', cursor:'pointer', fontSize:12, position:'relative',
                background: i === currentPage ? 'rgba(255,255,255,0.05)' : 'transparent',
                borderBottom: i === currentPage ? '2px solid var(--accent,#c8a064)' : '2px solid transparent',
                color: i === currentPage ? 'var(--text-primary,#f0f0f0)' : 'var(--text-muted,#8a8a8a)',
                transition:'all 0.12s', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:6,
              }}
              onMouseEnter={e => { if (i !== currentPage) e.currentTarget.style.background='rgba(255,255,255,0.03)' }}
              onMouseLeave={e => { if (i !== currentPage) e.currentTarget.style.background='transparent' }}>
              {editingTab === p.id ? (
                <input autoFocus value={editingName} onChange={e => setEditingName(e.target.value)}
                  onBlur={() => renamePage(p.id, editingName.trim())}
                  onKeyDown={e => { if (e.key === 'Enter') renamePage(p.id, editingName.trim()); if (e.key === 'Escape') setEditingTab(null) }}
                  onClick={e => e.stopPropagation()}
                  style={{ background:'rgba(255,255,255,0.08)', border:'1px solid var(--accent-30)', borderRadius:4, padding:'2px 6px', color:'var(--text-primary,#f0f0f0)', fontSize:12, outline:'none', width:90, fontFamily:'var(--font-body)' }} />
              ) : (
                <span>{p.name}</span>
              )}
              {pages.length > 1 && i === currentPage && editingTab !== p.id && (
                <span onClick={e => { e.stopPropagation(); removePage(i) }}
                  style={{ color:'var(--text-muted,#8a8a8a)', fontSize:9, display:'flex', alignItems:'center', marginLeft:2 }}
                  onMouseEnter={e => e.currentTarget.style.color='var(--danger,#ef4444)'}
                  onMouseLeave={e => e.currentTarget.style.color='var(--text-muted,#8a8a8a)'}>
                  ✕
                </span>
              )}
            </div>
          ))}
          <button onClick={addPage}
            style={{ padding:'6px 10px 7px', borderRadius:'8px 8px 0 0', fontSize:11, cursor:'pointer', border:'none', background:'transparent', color:'var(--text-muted,#8a8a8a)', flexShrink:0 }}
            onMouseEnter={e => e.currentTarget.style.color='var(--accent,#c8a064)'}
            onMouseLeave={e => e.currentTarget.style.color='var(--text-muted,#8a8a8a)'}
            title="Nouvelle page">
            <Icon name="plus" size={11} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflow:'hidden', padding:'16px 20px', display:'flex', flexDirection:'column' }}>
        {zoomed ? (
          <ZoomedChartPanel
            chart={zoomed} chartData={buildChartData(zoomed)}
            allStatKeys={allStatKeys} statLabel={statLabel}
            onUpdate={patch => updateChart(zoomed.id, patch)}
            onClose={() => setZoomedChart(null)}
            cardsWithStats={cardsWithStats} allTypes={allTypes} customTypes={customTypes}
          />
        ) : (
          <>
            <div ref={gridRef} style={{
              flex:1,
              display:'grid',
              gridTemplateColumns:`repeat(${COLS}, 1fr)`,
              gridTemplateRows:`repeat(${maxRow}, 1fr)`,
              gap:GAP,
              overflow:'hidden',
            }}>
              {displayCharts.map(chart => {
                const isActive = activeId === chart.id
                return (
                  <ChartCell
                    key={chart.id}
                    chart={chart}
                    chartData={buildChartData(chart)}
                    allStatKeys={allStatKeys}
                    statLabel={statLabel}
                    cardsWithStats={cardsWithStats}
                    allTypes={allTypes}
                    customTypes={customTypes}
                    onUpdate={patch => updateChart(chart.id, patch)}
                    onRemove={page.charts.length > 1 ? () => removeChart(chart.id) : null}
                    onZoom={() => setZoomedChart(chart.id)}
                    isActive={isActive}
                    isDragging={!!previewLayout}
                    isSelected={selectedChart === chart.id}
                    onSelect={id => setSelectedChart(id)}
                    onDragStart={onDragStart}
                    onResizeStart={onResizeStart}
                  />
                )
              })}
            </div>
            {page.charts.length < MAX_CHARTS && (
              <div style={{ display:'flex', justifyContent:'center', padding:'12px 0' }}>
                <button onClick={addChart}
                  style={{ width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                    background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)',
                    color:'var(--text-muted,#8a8a8a)', cursor:'pointer', transition:'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent-30)'; e.currentTarget.style.color='var(--accent,#c8a064)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'; e.currentTarget.style.color='var(--text-muted,#8a8a8a)' }}
                  title="Ajouter un graphique">
                  <Icon name="plus" size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Card Picker ─────────────────────────────────────────────
function CardPicker({ cardIds, cardsWithStats, allTypes, customTypes, onChange }) {
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState({})

  const visible = useMemo(() =>
    cardsWithStats.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))
  , [cardsWithStats, search])

  const grouped = useMemo(() => {
    const groups = []
    const map = new Map()
    visible.forEach(card => {
      if (!map.has(card.typeId)) { map.set(card.typeId, []); groups.push(card.typeId) }
      map.get(card.typeId).push(card)
    })
    return groups.map(typeId => ({ typeId, type: allTypes.find(t => t.id === typeId), cards: map.get(typeId) }))
  }, [visible, allTypes])

  const toggle = id => onChange(cardIds.includes(id) ? cardIds.filter(x => x !== id) : [...cardIds, id])

  return (
    <div>
      <div style={{ position:'relative', marginBottom:6 }}>
        <Icon name="search" size={10} style={{ position:'absolute', left:7, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted,#8a8a8a)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filtrer…"
          style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'none', borderRadius:5, padding:'4px 7px 4px 22px', color:'var(--text-secondary,#c0c0c0)', fontSize:10, outline:'none', boxSizing:'border-box' }} />
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:6 }}>
        <span onClick={() => onChange(cardsWithStats.map(c => c.id))} style={{ fontSize:10, color:'var(--accent,#c8a064)', cursor:'pointer' }}>Tout</span>
        <span onClick={() => onChange([])} style={{ fontSize:10, color:'var(--accent,#c8a064)', cursor:'pointer' }}>Aucun</span>
        <span style={{ fontSize:9, color:'var(--text-muted,#8a8a8a)', marginLeft:'auto' }}>{cardIds.length}</span>
      </div>
      <div style={{ maxHeight:200, overflowY:'auto' }}>
        {grouped.map(({ typeId, type, cards: groupCards }) => {
          const isCollapsed = !!collapsed[typeId]
          return (
            <div key={typeId} style={{ marginBottom:2 }}>
              <div onClick={() => setCollapsed(p => ({ ...p, [typeId]: !p[typeId] }))}
                style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 4px', cursor:'pointer', fontSize:10, color:'var(--text-secondary,#c0c0c0)', borderRadius:3 }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <Icon name={isCollapsed ? 'chevron_right' : 'chevron_down'} size={8} style={{ flexShrink:0 }} />
                <span style={{ fontSize:11 }}>{type?.icon||'📄'}</span>
                <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{type?.name||typeId}</span>
                <span style={{ fontSize:9, color:'var(--text-muted,#8a8a8a)' }}>{groupCards.length}</span>
              </div>
              {!isCollapsed && groupCards.map(card => {
                const sel = cardIds.includes(card.id)
                const color = CHART_COLORS[cardsWithStats.indexOf(card) % CHART_COLORS.length]
                return (
                  <div key={card.id} onClick={() => toggle(card.id)}
                    style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 6px 3px 18px', borderRadius:4, cursor:'pointer', fontSize:11,
                      color: sel ? 'var(--text-primary,#f0f0f0)' : 'var(--text-muted,#8a8a8a)',
                      background: sel ? color+'14' : 'transparent',
                      transition:'all 0.08s' }}
                    onMouseEnter={e => { if(!sel) e.currentTarget.style.background='rgba(255,255,255,0.03)' }}
                    onMouseLeave={e => { if(!sel) e.currentTarget.style.background = sel ? color+'14' : 'transparent' }}>
                    {sel && <div style={{ width:6, height:6, borderRadius:'50%', background:color, flexShrink:0 }} />}
                    {card.image && <img src={card.image} alt="" style={{ width:14, height:14, borderRadius:3, objectFit:'cover', flexShrink:0 }} />}
                    <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{card.name}</span>
                  </div>
                )
              })}
            </div>
          )
        })}
        {visible.length === 0 && <div style={{ fontSize:10, color:'var(--text-muted,#8a8a8a)', padding:6 }}>Aucune carte</div>}
      </div>
    </div>
  )
}

// ─── Chart Cell (grid-positioned, long-press to edit) ────────
function ChartCell({ chart, chartData, allStatKeys, statLabel, cardsWithStats, allTypes, customTypes, onUpdate, onRemove, onZoom, isActive, isDragging, isSelected, onSelect, onDragStart, onResizeStart }) {
  const [showConfig, setShowConfig] = useState(false)
  const configRef = useRef()
  const longPressRef = useRef({ timer: null })
  const activeStats = chart.stats.length > 0 ? chart.stats : allStatKeys
  const title = chart.title || (chart.type === 'radar' ? 'Radar' : 'Barres')
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    if (!showConfig) return
    const h = e => { if (configRef.current && !configRef.current.contains(e.target)) setShowConfig(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [showConfig])

  useEffect(() => () => clearTimeout(longPressRef.current.timer), [])

  const handleMouseDown = e => {
    if (e.target.closest('button') || e.target.closest('[data-config-popup]')) return

    if (isSelected) {
      // Already selected → start drag immediately
      onDragStart(e, chart)
      return
    }

    // Long press detection
    const sx = e.clientX, sy = e.clientY
    longPressRef.current.timer = setTimeout(() => {
      onSelect(chart.id)
      onDragStart({ clientX: sx, clientY: sy, preventDefault() {} }, chart)
      longPressRef.current.timer = null
      cleanup()
    }, LONG_PRESS_MS)

    const onMoveCancel = ev => {
      if (Math.abs(ev.clientX - sx) > 5 || Math.abs(ev.clientY - sy) > 5) {
        clearTimeout(longPressRef.current.timer)
        longPressRef.current.timer = null
        cleanup()
      }
    }
    const onUpCancel = () => {
      clearTimeout(longPressRef.current.timer)
      longPressRef.current.timer = null
      cleanup()
    }
    const cleanup = () => {
      document.removeEventListener('mousemove', onMoveCancel)
      document.removeEventListener('mouseup', onUpCancel)
    }
    document.addEventListener('mousemove', onMoveCancel)
    document.addEventListener('mouseup', onUpCancel)
  }

  return (
    <div data-chart-id={chart.id} onMouseDown={handleMouseDown} style={{
      gridColumn: `${chart.x + 1} / span ${chart.w}`,
      gridRow: `${chart.y + 1} / span ${chart.h}`,
      background:'rgba(255,255,255,0.025)', borderRadius:14,
      border: isSelected || isActive ? '2px solid var(--accent,#c8a064)' : '1px solid rgba(255,255,255,0.07)',
      display:'flex', flexDirection:'column', overflow: isSelected || showConfig ? 'visible' : 'hidden', position:'relative',
      opacity: isActive ? 0.85 : 1,
      transition: isDragging && !isActive ? 'all 0.15s ease' : (isActive ? 'none' : 'all 0.15s'),
      cursor: isSelected ? 'grab' : 'default',
      userSelect: isSelected ? 'none' : 'auto',
    }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', padding:'8px 12px 4px', gap:6, flexShrink:0 }}>
        <span style={{ fontSize:13, color:'var(--text-primary,#f0f0f0)', fontFamily:'var(--font)', fontWeight:500, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {title}
        </span>
        <button onClick={e => { e.stopPropagation(); onZoom() }}
          onMouseDown={e => e.stopPropagation()}
          style={{ background:'none', border:'none', color:'var(--text-muted,#8a8a8a)', cursor:'pointer', padding:'2px 4px', fontSize:11 }}
          onMouseEnter={e => e.currentTarget.style.color='var(--accent,#c8a064)'}
          onMouseLeave={e => e.currentTarget.style.color='var(--text-muted,#8a8a8a)'}
          title="Plein écran">
          <Icon name="fullscreen" size={12} />
        </button>
        <div style={{ position:'relative' }}>
          <button onClick={e => { e.stopPropagation(); setShowConfig(!showConfig) }}
            onMouseDown={e => e.stopPropagation()}
            style={{ background: showConfig ? 'var(--accent-12)' : 'none', border:'none', color: showConfig ? 'var(--accent,#c8a064)' : 'var(--text-muted,#8a8a8a)', cursor:'pointer', padding:'2px 4px', fontSize:11, borderRadius:4 }}
            onMouseEnter={e => { if(!showConfig) e.currentTarget.style.color='var(--accent,#c8a064)' }}
            onMouseLeave={e => { if(!showConfig) e.currentTarget.style.color='var(--text-muted,#8a8a8a)' }}
            title="Configurer">
            <Icon name="settings" size={12} />
          </button>
          {showConfig && (
            <ChartConfigPopup ref={configRef} chart={chart} allStatKeys={allStatKeys} statLabel={statLabel}
              cardsWithStats={cardsWithStats} allTypes={allTypes} customTypes={customTypes}
              onUpdate={onUpdate} onRemove={onRemove} onClose={() => setShowConfig(false)} />
          )}
        </div>
      </div>

      {/* Legend */}
      {chartData.length > 0 && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', padding:'0 12px 4px', flexShrink:0 }}>
          {chartData.map(({ card, color }) => (
            <div key={card.id} style={{ display:'flex', alignItems:'center', gap:3 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:color, flexShrink:0 }} />
              <span style={{ fontSize:9, color:'var(--text-secondary,#c0c0c0)', whiteSpace:'nowrap' }}>{card.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div style={{ flex:1, padding:'4px 10px 12px', minHeight:0, overflow:'hidden', pointerEvents: isSelected ? 'none' : 'auto' }}>
        {chart.cardIds.length === 0 ? (
          <div onClick={() => setShowConfig(true)}
            style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'var(--text-muted,#8a8a8a)', gap:8, cursor:'pointer', transition:'color 0.12s', pointerEvents:'auto' }}
            onMouseDown={e => e.stopPropagation()}
            onMouseEnter={e => e.currentTarget.style.color='var(--accent,#c8a064)'}
            onMouseLeave={e => e.currentTarget.style.color='var(--text-muted,#8a8a8a)'}>
            <Icon name="chart" size={28} style={{ opacity:0.3 }} />
            <span style={{ fontSize:14, fontWeight:500 }}>Configurer</span>
          </div>
        ) : chartData.length === 0 ? (
          <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted,#8a8a8a)', fontSize:12 }}>
            Aucune donnée
          </div>
        ) : (
          <div
            onWheel={e => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; setZoom(z => Math.min(3, Math.max(1, z + (e.deltaY < 0 ? 0.15 : -0.15)))) }}
            onDoubleClick={zoom > 1 ? () => setZoom(1) : undefined}
            style={{ height:'100%', transform: zoom > 1 ? `scale(${zoom})` : 'none', transformOrigin:'center', transition:'transform 0.1s ease' }}>
            {chart.type === 'radar' ? (
              <RadarChart data={chartData} stats={activeStats} statLabel={statLabel} compact />
            ) : (
              <BarChart data={chartData} stats={activeStats} statLabel={statLabel} compact />
            )}
          </div>
        )}
      </div>

      {/* Zoom indicator */}
      {zoom > 1 && (
        <div onDoubleClick={() => setZoom(1)} style={{ position:'absolute', bottom:6, right:6, background:'rgba(0,0,0,0.6)', borderRadius:4, padding:'2px 6px', fontSize:9, color:'var(--text-muted,#8a8a8a)', zIndex:5, cursor:'pointer' }}>
          {zoom.toFixed(1)}x
        </div>
      )}

      {/* Selected: 8-point resize handles + delete */}
      {isSelected && !isActive && (
        <>
          {RESIZE_HANDLES.map(h => (
            <div key={h.id} onMouseDown={e => { e.stopPropagation(); onResizeStart(e, chart, h.edges) }}
              style={{
                position:'absolute', ...h.style,
                width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2,
                background:'var(--accent,#c8a064)', border:'1px solid rgba(0,0,0,0.3)',
                cursor: h.cursor, zIndex: 11,
              }} />
          ))}
          {onRemove && (
            <button onClick={e => { e.stopPropagation(); onRemove() }}
              onMouseDown={e => e.stopPropagation()}
              style={{ position:'absolute', top:-8, right:-8, zIndex:12, width:18, height:18, borderRadius:9, background:'rgba(0,0,0,0.8)', border:'1px solid rgba(255,255,255,0.15)', color:'#888', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9 }}
              onMouseEnter={e => e.currentTarget.style.color='var(--danger,#ef4444)'}
              onMouseLeave={e => e.currentTarget.style.color='#888'}>
              ✕
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ─── Zoomed Chart Panel ──────────────────────────────────────
function ZoomedChartPanel({ chart, chartData, allStatKeys, statLabel, onUpdate, onClose, cardsWithStats, allTypes, customTypes }) {
  const activeStats = chart.stats.length > 0 ? chart.stats : allStatKeys

  return (
    <div className="anim-fadeup">
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <button onClick={onClose}
          style={{ background:'none', border:'none', color:'var(--text-muted,#8a8a8a)', cursor:'pointer', padding:'4px 8px', fontSize:12, display:'flex', alignItems:'center', gap:5, borderRadius:6 }}
          onMouseEnter={e => e.currentTarget.style.color='var(--accent,#c8a064)'}
          onMouseLeave={e => e.currentTarget.style.color='var(--text-muted,#8a8a8a)'}>
          ← Retour
        </button>
        <input value={chart.title || ''} onChange={e => onUpdate({ title: e.target.value })}
          placeholder={chart.type === 'radar' ? 'Radar' : 'Barres'}
          style={{ flex:1, background:'transparent', border:'none', borderBottom:'1px solid rgba(255,255,255,0.08)', color:'var(--text-primary,#f0f0f0)', fontSize:18, fontFamily:'var(--font)', fontWeight:500, outline:'none', padding:'2px 0' }} />
      </div>

      <div style={{ display:'flex', gap:20 }}>
        {/* Left: config */}
        <div style={{ width:220, flexShrink:0, display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <div style={{ fontSize:11, color:'var(--text-secondary,#c0c0c0)', marginBottom:6 }}>Type</div>
            <div style={{ display:'flex', gap:6 }}>
              <Btn variant={chart.type==='radar'?'active':'subtle'} size="sm" onClick={() => onUpdate({ type:'radar' })}>Radar</Btn>
              <Btn variant={chart.type==='bar'?'active':'subtle'} size="sm" onClick={() => onUpdate({ type:'bar' })}>Barres</Btn>
            </div>
          </div>

          <div>
            <div style={{ fontSize:11, color:'var(--text-secondary,#c0c0c0)', marginBottom:6 }}>Cartes</div>
            <CardPicker cardIds={chart.cardIds} cardsWithStats={cardsWithStats} allTypes={allTypes} customTypes={customTypes}
              onChange={ids => onUpdate({ cardIds: ids })} />
          </div>

          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:11, color:'var(--text-secondary,#c0c0c0)' }}>Statistiques</span>
              <span onClick={() => onUpdate({ stats: chart.stats.length === allStatKeys.length ? [] : [...allStatKeys] })}
                style={{ fontSize:10, color:'var(--text-muted,#8a8a8a)', cursor:'pointer' }}
                onMouseEnter={e => e.currentTarget.style.color='var(--accent,#c8a064)'}
                onMouseLeave={e => e.currentTarget.style.color='var(--text-muted,#8a8a8a)'}>
                {chart.stats.length > 0 && chart.stats.length === allStatKeys.length ? 'Aucun' : 'Tout'}
              </span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
              {allStatKeys.map(k => {
                const active = chart.stats.length === 0 || chart.stats.includes(k)
                return (
                  <label key={k} style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', fontSize:12, color: active ? 'var(--text-secondary,#c0c0c0)' : 'var(--text-muted,#8a8a8a)' }}>
                    <input type="checkbox" checked={active}
                      onChange={() => {
                        if (chart.stats.length === 0) {
                          onUpdate({ stats: allStatKeys.filter(s => s !== k) })
                        } else {
                          const next = chart.stats.includes(k) ? chart.stats.filter(s => s !== k) : [...chart.stats, k]
                          onUpdate({ stats: next.length === allStatKeys.length ? [] : next })
                        }
                      }}
                      style={{ accentColor:'var(--accent,#c8a064)' }} />
                    {statLabel(k)}
                  </label>
                )
              })}
              {allStatKeys.length === 0 && <span style={{ fontSize:10, color:'var(--text-muted,#8a8a8a)' }}>Aucune stat disponible</span>}
            </div>
          </div>
        </div>

        {/* Right: chart large */}
        <div style={{ flex:1 }}>
          {chartData.length > 0 && (
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:16 }}>
              {chartData.map(({ card, color }) => (
                <div key={card.id} style={{ display:'flex', alignItems:'center', gap:5 }}>
                  {card.image && <img src={card.image} alt="" style={{ width:16, height:16, borderRadius:3, objectFit:'cover' }} />}
                  <div style={{ width:8, height:8, borderRadius:'50%', background:color }} />
                  <span style={{ fontSize:11, color:'var(--text-secondary,#c0c0c0)' }}>{card.name}</span>
                </div>
              ))}
            </div>
          )}
          {chart.cardIds.length === 0 ? (
            <div style={{ textAlign:'center', paddingTop:60, color:'var(--text-muted,#8a8a8a)', fontSize:13 }}>Sélectionnez des cartes</div>
          ) : chartData.length === 0 ? (
            <div style={{ textAlign:'center', paddingTop:60, color:'var(--text-muted,#8a8a8a)', fontSize:13 }}>Aucune donnée</div>
          ) : chart.type === 'radar' ? (
            <RadarChart data={chartData} stats={activeStats} statLabel={statLabel} />
          ) : (
            <BarChart data={chartData} stats={activeStats} statLabel={statLabel} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Chart Config Popup ──────────────────────────────────────
const ChartConfigPopup = React.forwardRef(({ chart, allStatKeys, statLabel, cardsWithStats, allTypes, customTypes, onUpdate, onRemove, onClose }, ref) => {
  return (
    <div ref={ref} style={{
      position:'absolute', top:'100%', right:0, marginTop:4, zIndex:100,
      background:'var(--bg-panel-92,rgba(10,6,1,0.92))', backdropFilter:'blur(40px) saturate(1.5)', WebkitBackdropFilter:'blur(40px) saturate(1.5)',
      border:'1px solid var(--border-14)', borderRadius:10,
      width:260, boxShadow:'0 8px 32px rgba(0,0,0,0.8)', overflow:'hidden',
    }}>
      <div style={{ padding:'10px 12px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
        <input value={chart.title || ''} onChange={e => onUpdate({ title: e.target.value })}
          placeholder={chart.type === 'radar' ? 'Radar' : 'Barres'}
          style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'5px 8px', color:'var(--text-primary,#f0f0f0)', fontSize:12, outline:'none', boxSizing:'border-box' }} />
      </div>

      <div style={{ padding:'8px 12px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize:10, color:'var(--text-secondary,#c0c0c0)', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.06em' }}>Type</div>
        <div style={{ display:'flex', gap:4 }}>
          {['radar','bar'].map(t => (
            <button key={t} onClick={() => onUpdate({ type: t })}
              style={{
                flex:1, padding:'4px 0', borderRadius:5, fontSize:11, cursor:'pointer', border:'1px solid',
                background: chart.type === t ? 'var(--accent-12)' : 'rgba(255,255,255,0.03)',
                borderColor: chart.type === t ? 'var(--accent-30)' : 'rgba(255,255,255,0.08)',
                color: chart.type === t ? 'var(--accent,#c8a064)' : 'var(--text-muted,#8a8a8a)',
              }}>
              {t === 'radar' ? 'Radar' : 'Barres'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:'8px 12px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize:10, color:'var(--text-secondary,#c0c0c0)', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.06em' }}>Cartes</div>
        <CardPicker cardIds={chart.cardIds} cardsWithStats={cardsWithStats} allTypes={allTypes} customTypes={customTypes}
          onChange={ids => onUpdate({ cardIds: ids })} />
      </div>

      <div style={{ padding:'8px 12px', borderBottom: onRemove ? '1px solid rgba(255,255,255,0.05)' : 'none', maxHeight:160, overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
          <span style={{ fontSize:10, color:'var(--text-secondary,#c0c0c0)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Stats</span>
          <span onClick={() => onUpdate({ stats: chart.stats.length === allStatKeys.length ? [] : [...allStatKeys] })}
            style={{ fontSize:10, color:'var(--text-muted,#8a8a8a)', cursor:'pointer' }}
            onMouseEnter={e => e.currentTarget.style.color='var(--accent,#c8a064)'}
            onMouseLeave={e => e.currentTarget.style.color='var(--text-muted,#8a8a8a)'}>
            {chart.stats.length > 0 && chart.stats.length === allStatKeys.length ? 'Aucun' : 'Tout'}
          </span>
        </div>
        {allStatKeys.map(k => {
          const active = chart.stats.length === 0 || chart.stats.includes(k)
          return (
            <label key={k} style={{ display:'flex', alignItems:'center', gap:6, padding:'2px 0', cursor:'pointer', fontSize:11, color: active ? 'var(--text-secondary,#c0c0c0)' : 'var(--text-muted,#8a8a8a)' }}>
              <input type="checkbox" checked={active}
                onChange={() => {
                  if (chart.stats.length === 0) {
                    onUpdate({ stats: allStatKeys.filter(s => s !== k) })
                  } else {
                    const next = chart.stats.includes(k) ? chart.stats.filter(s => s !== k) : [...chart.stats, k]
                    onUpdate({ stats: next.length === allStatKeys.length ? [] : next })
                  }
                }}
                style={{ accentColor:'var(--accent,#c8a064)' }} />
              {statLabel(k)}
            </label>
          )
        })}
      </div>

      {onRemove && (
        <div onClick={() => { onRemove(); onClose() }}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 12px', cursor:'pointer', color:'var(--danger-muted,#8a5a5a)', fontSize:11, transition:'background 0.1s' }}
          onMouseEnter={e => e.currentTarget.style.background='var(--danger-06)'}
          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
          <Icon name="trash" size={11} />
          <span>Supprimer</span>
        </div>
      )}
    </div>
  )
})

// ─── Radar Chart ─────────────────────────────────────────────
function RadarChart({ data, stats, statLabel, compact }) {
  if (stats.length < 3) return <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted,#8a8a8a)', fontSize:compact?11:13 }}>Min. 3 statistiques pour le radar</div>
  const SIZE = compact ? 300 : 500
  const cx = SIZE/2, cy = SIZE/2, r = SIZE * 0.32, labelR = SIZE * (compact ? 0.45 : 0.43), n = stats.length
  const angle = i => (i/n)*Math.PI*2 - Math.PI/2
  const globalMax = Math.max(1, ...data.flatMap(d => d.stats.map(s=>s.value)))
  const pt = (i, frac) => ({ x: cx+r*frac*Math.cos(angle(i)), y: cy+r*frac*Math.sin(angle(i)) })
  const fontSize = compact ? 9 : 12
  const labelMaxLen = compact ? 8 : 14
  return (
    <div style={{ display:'flex', justifyContent:'center', height:'100%' }}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ width:'100%', maxWidth: compact ? 320 : 480, height:'auto' }} preserveAspectRatio="xMidYMid meet">
        {[0.2,0.4,0.6,0.8,1.0].map(f => (
          <polygon key={f} points={stats.map((_,i)=>{ const p=pt(i,f); return `${p.x},${p.y}` }).join(' ')} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={f===1?1.5:1} />
        ))}
        {stats.map((_,i) => { const p=pt(i,1); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.09)" strokeWidth={1} /> })}
        {!compact && [0.25,0.5,0.75,1.0].map(f => {
          const p=pt(0,f)
          return <text key={f} x={p.x+4} y={p.y} fontSize={9} fill="var(--text-muted,#8a8a8a)" fontFamily="var(--font-body)" dominantBaseline="central">{Math.round(globalMax*f)}</text>
        })}
        {stats.map((k,i) => {
          const a=angle(i), p={ x:cx+labelR*Math.cos(a), y:cy+labelR*Math.sin(a) }
          const anchor = Math.cos(a)>0.1?'start':Math.cos(a)<-0.1?'end':'middle'
          const lbl = statLabel(k)
          return <text key={i} x={p.x} y={p.y} textAnchor={anchor} dominantBaseline="central" fontSize={fontSize} fill="var(--text-secondary,#c0c0c0)" fontFamily="var(--font-body)" fontWeight="500">{lbl.length>labelMaxLen?lbl.slice(0,labelMaxLen-1)+'…':lbl}</text>
        })}
        {data.map(({ stats:cs, color, card }) => {
          const pts = stats.map((k,i) => { const v=cs.find(s=>s.key===k)?.value||0; const p=pt(i, globalMax>0?v/globalMax:0); return `${p.x},${p.y}` }).join(' ')
          return (
            <g key={card.id}>
              <polygon points={pts} fill={color+'1a'} stroke={color} strokeWidth={compact?1.5:2} strokeLinejoin="round" />
              {stats.map((k,i) => { const v=cs.find(s=>s.key===k)?.value||0; const p=pt(i, globalMax>0?v/globalMax:0); return <circle key={i} cx={p.x} cy={p.y} r={compact?3:4} fill={color} stroke="rgba(0,0,0,0.6)" strokeWidth={compact?1:1.5} /> })}
            </g>
          )
        })}
        <circle cx={cx} cy={cy} r={2} fill="rgba(255,255,255,0.15)" />
      </svg>
    </div>
  )
}

// ─── Bar Chart ───────────────────────────────────────────────
function BarChart({ data, stats, statLabel, compact }) {
  const maxVal = Math.max(1, ...data.flatMap(d => d.stats.map(s=>s.value)))
  const bw = compact ? 16 : 24, gap = compact ? 4 : 6, gg = compact ? 14 : 20, chartH = compact ? 180 : 240
  const totalW = stats.length*(data.length*(bw+gap)+gg)+60
  return (
    <div style={{ overflowX:'auto', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <svg width={Math.max(totalW, compact ? 260 : 400)} height={chartH + (compact ? 40 : 60)} style={{ flexShrink:0 }}>
        <g transform={`translate(${compact?30:40},10)`}>
          {[0,0.25,0.5,0.75,1.0].map(f => {
            const y=chartH*(1-f)
            return (
              <g key={f}>
                <line x1={0} y1={y} x2={totalW-60} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
                <text x={-6} y={y} textAnchor="end" dominantBaseline="central" fontSize={compact?8:9} fill="var(--text-muted,#8a8a8a)">{Math.round(maxVal*f)}</text>
              </g>
            )
          })}
          {stats.map((stat,si) => {
            const gx = si*(data.length*(bw+gap)+gg)
            const statData = data.filter(d => (d.stats.find(s=>s.key===stat)?.value||0)>0)
            return (
              <g key={stat}>
                {statData.map(({ card, stats:cs, color }, di) => {
                  const val=cs.find(s=>s.key===stat)?.value||0
                  const barH=(val/maxVal)*chartH
                  const x=gx+di*(bw+gap)
                  return (
                    <g key={card.id}>
                      <rect x={x} y={chartH-barH} width={bw} height={barH} fill={color+'a0'} stroke={color} strokeWidth={1} rx={compact?2:3} />
                      {!compact && <text x={x+bw/2} y={chartH-barH-4} textAnchor="middle" fontSize={9} fill={color} fontFamily="var(--font-body)">{val}</text>}
                    </g>
                  )
                })}
                {(() => { const lbl = statLabel(stat); const maxLen = compact ? 6 : 10; return <text x={gx+(data.length*(bw+gap))/2} y={chartH + (compact ? 10 : 14)} textAnchor="middle" fontSize={compact ? 9 : 11} fill="var(--text-secondary,#c0c0c0)" fontFamily="var(--font-body)">{lbl.length > maxLen ? lbl.slice(0, maxLen-1)+'…' : lbl}</text> })()}
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}

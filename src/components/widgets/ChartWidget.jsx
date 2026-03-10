import React, { useMemo } from 'react'
import { getEffectiveProps } from '../../data/types.js'

const COLORS = ['#c084fc', '#c8a064', '#06b6d4', '#22c55e', '#ef4444', '#f59e0b']

function getNumericProps(card, effectivePropDefs) {
  const result = {}
  const defMap = {}
  ;(effectivePropDefs || []).forEach(p => { defMap[p.id] = p })
  Object.entries(card.props || {}).forEach(([k, v]) => {
    const def = defMap[k]
    if (def && (def.fieldType === 'date' || def.fieldType === 'card_ref')) return
    const n = parseFloat(v)
    if (!isNaN(n) && v !== '' && v !== null) result[k] = n
  })
  ;(card.extraProps || []).forEach(ep => {
    if (ep.fieldType === 'date' || ep.fieldType === 'card_ref') return
    const n = parseFloat(ep.value)
    if (!isNaN(n) && ep.value !== '' && ep.value !== null) result[ep.id] = n
  })
  return result
}

export default function ChartWidget({ widget, card, cards, customTypes, allTypes, onUpdateConfig }) {
  const allNumericProps = useMemo(() => getNumericProps(card, getEffectiveProps(card.typeId, customTypes)), [card, customTypes])

  const configPropIds = widget.config?.propIds
  const numericProps = useMemo(() => {
    if (!configPropIds || configPropIds === 'all') return allNumericProps
    const filtered = {}
    configPropIds.forEach(id => {
      if (allNumericProps[id] !== undefined) filtered[id] = allNumericProps[id]
    })
    return Object.keys(filtered).length > 0 ? filtered : allNumericProps
  }, [allNumericProps, configPropIds])

  const statKeys = Object.keys(numericProps)

  const statLabels = useMemo(() => {
    const labels = {}
    const defs = getEffectiveProps(card.typeId, customTypes)
    defs.forEach(p => { labels[p.id] = p.name })
    ;(card.extraProps || []).forEach(ep => { labels[ep.id] = ep.name || ep.id })
    return labels
  }, [card, customTypes])

  if (statKeys.length < 3) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-darker,#2e2e2e)', fontSize: 11 }}>
        {statKeys.length === 0 ? 'Aucune stat numérique' : 'Min. 3 stats pour le radar'}
      </div>
    )
  }

  // Mini radar for this card's own stats
  const SIZE = 200, cx = 100, cy = 100, r = 70, n = statKeys.length
  const angle = i => (i / n) * Math.PI * 2 - Math.PI / 2
  const maxVal = Math.max(1, ...statKeys.map(k => numericProps[k]))
  const pt = (i, frac) => ({ x: cx + r * frac * Math.cos(angle(i)), y: cy + r * frac * Math.sin(angle(i)) })

  const points = statKeys.map((k, i) => {
    const frac = maxVal > 0 ? numericProps[k] / maxVal : 0
    const p = pt(i, frac)
    return `${p.x},${p.y}`
  }).join(' ')

  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ width: '100%', height: '100%', maxWidth: SIZE }}>
        {[0.25, 0.5, 0.75, 1.0].map(f => (
          <polygon key={f} points={statKeys.map((_, i) => { const p = pt(i, f); return `${p.x},${p.y}` }).join(' ')}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={f === 1 ? 1 : 0.5} />
        ))}
        {statKeys.map((_, i) => { const p = pt(i, 1); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} /> })}
        <polygon points={points} fill="var(--accent-12,rgba(200,160,100,0.12))" stroke="var(--accent,#c8a064)" strokeWidth={1.5} strokeLinejoin="round" />
        {statKeys.map((k, i) => {
          const frac = maxVal > 0 ? numericProps[k] / maxVal : 0
          const p = pt(i, frac)
          return <circle key={i} cx={p.x} cy={p.y} r={3} fill="var(--accent,#c8a064)" />
        })}
        {statKeys.map((k, i) => {
          const a = angle(i)
          const labelR = r + 18
          const lx = cx + labelR * Math.cos(a)
          const ly = cy + labelR * Math.sin(a)
          const anchor = Math.cos(a) > 0.1 ? 'start' : Math.cos(a) < -0.1 ? 'end' : 'middle'
          const label = statLabels[k] || k
          return <text key={i} x={lx} y={ly} textAnchor={anchor} dominantBaseline="central" fontSize={8} fill="var(--text-dim,#5a5a5a)" fontFamily="var(--font-body)">{label.length > 10 ? label.slice(0, 9) + '…' : label}</text>
        })}
      </svg>
    </div>
  )
}

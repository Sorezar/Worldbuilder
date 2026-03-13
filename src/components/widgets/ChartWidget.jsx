import React, { useState, useMemo } from 'react'
import { Icon } from '../ui.jsx'
import { getEffectiveProps } from '../../data/types.js'

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

const CONFIG_TABS = [
  { id: 'type', label: 'Type' },
  { id: 'stats', label: 'Stats' },
]

export default function ChartWidget({ widget, card, cards, customTypes, allTypes, onUpdateConfig }) {
  const allNumericProps = useMemo(() => getNumericProps(card, getEffectiveProps(card.typeId, customTypes)), [card, customTypes])

  const configPropIds = widget.config?.propIds
  const chartType = widget.config?.chartType || 'radar'
  const numericProps = useMemo(() => {
    if (!configPropIds || configPropIds === 'all') return allNumericProps
    const filtered = {}
    configPropIds.forEach(id => {
      if (allNumericProps[id] !== undefined) filtered[id] = allNumericProps[id]
    })
    return Object.keys(filtered).length > 0 ? filtered : allNumericProps
  }, [allNumericProps, configPropIds])

  const statKeys = Object.keys(numericProps)
  const allKeys = Object.keys(allNumericProps)

  const statLabels = useMemo(() => {
    const labels = {}
    const defs = getEffectiveProps(card.typeId, customTypes)
    defs.forEach(p => { labels[p.id] = p.name })
    ;(card.extraProps || []).forEach(ep => { labels[ep.id] = ep.name || ep.id })
    return labels
  }, [card, customTypes])

  const showSettings = widget.config?.showSettings

  // ─── Config panel (matches ChartsView style) ──────────────
  if (showSettings) {
    return <ChartConfig
      chartType={chartType} allKeys={allKeys} configPropIds={configPropIds}
      statLabels={statLabels} onUpdateConfig={onUpdateConfig}
      onClose={() => onUpdateConfig({ showSettings: false })}
    />
  }

  // ─── Bar chart ────────────────────────────────────────────
  if (chartType === 'bar') {
    if (statKeys.length === 0) {
      return (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-darker,#2e2e2e)', fontSize: 11 }}>
          Aucune stat numérique
        </div>
      )
    }
    const maxVal = Math.max(1, ...statKeys.map(k => numericProps[k]))
    const n = statKeys.length
    const PAD = 20, BOTTOM = 18, TOP = 14
    const barW = Math.min(30, (200 - PAD * 2) / n - 4)
    const totalW = n * (barW + 4) + PAD * 2
    const chartH = 160
    const barAreaH = chartH - BOTTOM - TOP
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox={`0 0 ${totalW} ${chartH}`} style={{ width: '100%', height: '100%', maxWidth: totalW }}>
          {/* Baseline */}
          <line x1={PAD - 4} y1={TOP + barAreaH} x2={totalW - PAD + 4} y2={TOP + barAreaH}
            stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map(f => (
            <line key={f} x1={PAD - 4} y1={TOP + barAreaH * (1 - f)} x2={totalW - PAD + 4} y2={TOP + barAreaH * (1 - f)}
              stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
          ))}
          {statKeys.map((k, i) => {
            const frac = numericProps[k] / maxVal
            const barH = Math.max(2, frac * barAreaH)
            const x = PAD + i * (barW + 4)
            const y = TOP + barAreaH - barH
            const label = statLabels[k] || k
            return (
              <g key={k}>
                <rect x={x} y={y} width={barW} height={barH} rx={2}
                  fill="var(--accent,#c8a064)" fillOpacity={0.4 + 0.5 * frac} />
                <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize={7} fill="var(--text-dim,#5a5a5a)" fontFamily="var(--font-body)">
                  {Math.round(numericProps[k])}
                </text>
                <text x={x + barW / 2} y={TOP + barAreaH + 11} textAnchor="middle" fontSize={6.5} fill="var(--text-dim,#5a5a5a)" fontFamily="var(--font-body)">
                  {label.length > 8 ? label.slice(0, 7) + '…' : label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    )
  }

  // ─── Radar chart (default) ────────────────────────────────
  if (statKeys.length < 3) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-darker,#2e2e2e)', fontSize: 11 }}>
        {statKeys.length === 0 ? 'Aucune stat numérique' : 'Min. 3 stats pour le radar'}
      </div>
    )
  }

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

// ─── Config panel (tabbed, matches ChartsView) ──────────────
function ChartConfig({ chartType, allKeys, configPropIds, statLabels, onUpdateConfig, onClose }) {
  const [tab, setTab] = useState('type')
  const selected = new Set(configPropIds && configPropIds !== 'all' ? configPropIds : allKeys)

  const toggleProp = id => {
    const next = selected.has(id) ? [...selected].filter(x => x !== id) : [...selected, id]
    onUpdateConfig({ propIds: next.length === allKeys.length ? 'all' : next })
  }

  return (
    <div style={{ maxHeight: 260, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Close bar */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--accent,#c8a064)', fontWeight: 600, flex: 1 }}>Configuration</span>
        <span onClick={onClose}
          style={{ fontSize: 10, color: '#888', cursor: 'pointer', padding: '2px 6px', borderRadius: 4, transition: 'color 0.1s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#ccc'}
          onMouseLeave={e => e.currentTarget.style.color = '#888'}>
          <Icon name="check" size={11} /> OK
        </span>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        {CONFIG_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '6px 0', fontSize: 10, cursor: 'pointer', border: 'none',
              background: tab === t.id ? 'rgba(255,255,255,0.04)' : 'transparent',
              borderBottom: tab === t.id ? '2px solid var(--accent,#c8a064)' : '2px solid transparent',
              color: tab === t.id ? 'var(--accent,#c8a064)' : 'var(--text-muted,#8a8a8a)',
              textTransform: 'uppercase', letterSpacing: '0.06em', transition: 'all 0.1s',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '10px 8px' }}>
        {tab === 'type' && (
          <div style={{ display: 'flex', gap: 8 }}>
            {['radar', 'bar'].map(t => {
              const sel = chartType === t
              return (
                <button key={t} onClick={() => onUpdateConfig({ chartType: t })}
                  style={{
                    flex: 1, padding: '10px 0 6px', borderRadius: 8, cursor: 'pointer', border: '2px solid',
                    background: sel ? 'var(--accent-12)' : 'rgba(255,255,255,0.03)',
                    borderColor: sel ? 'var(--accent,#c8a064)' : 'rgba(255,255,255,0.08)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    transition: 'all 0.12s',
                  }}>
                  <svg width={48} height={48} viewBox="0 0 56 56">
                    {t === 'radar' ? (
                      <>
                        <polygon points="28,8 48,22 42,46 14,46 8,22" fill="none"
                          stroke={sel ? 'var(--accent,#c8a064)' : 'rgba(255,255,255,0.15)'} strokeWidth="1" />
                        <polygon points="28,18 40,26 37,40 19,40 16,26" fill="none"
                          stroke={sel ? 'var(--accent,#c8a064)' : 'rgba(255,255,255,0.1)'} strokeWidth="1" />
                        <polygon points="28,12 44,24 39,43 17,43 12,24"
                          fill={sel ? 'var(--accent,#c8a064)' : 'rgba(255,255,255,0.25)'} fillOpacity={sel ? 0.25 : 0.12}
                          stroke={sel ? 'var(--accent,#c8a064)' : 'rgba(255,255,255,0.3)'} strokeWidth="1.5" />
                        {[[28, 8], [48, 22], [42, 46], [14, 46], [8, 22]].map(([cx, cy], i) => (
                          <circle key={i} cx={cx} cy={cy} r={2}
                            fill={sel ? 'var(--accent,#c8a064)' : 'rgba(255,255,255,0.25)'} />
                        ))}
                      </>
                    ) : (
                      <>
                        {[[8, 18, 8, 38], [20, 10, 8, 38], [32, 24, 8, 38], [44, 14, 8, 38]].map(([x, y, w, h2], i) => (
                          <rect key={i} x={x} y={y} width={w} height={h2 - y} rx={2}
                            fill={sel ? 'var(--accent,#c8a064)' : 'rgba(255,255,255,0.25)'}
                            fillOpacity={sel ? 0.5 + i * 0.12 : 0.2 + i * 0.08} />
                        ))}
                        <line x1="4" y1="42" x2="52" y2="42"
                          stroke={sel ? 'var(--accent,#c8a064)' : 'rgba(255,255,255,0.15)'} strokeWidth="1" />
                      </>
                    )}
                  </svg>
                  <span style={{ fontSize: 10, color: sel ? 'var(--accent,#c8a064)' : 'var(--text-darker,#2e2e2e)' }}>
                    {t === 'radar' ? 'Radar' : 'Barres'}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {tab === 'stats' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 6 }}>
              {selected.size < allKeys.length && (
                <span onClick={() => onUpdateConfig({ propIds: 'all' })}
                  style={{ fontSize: 10, color: 'var(--text-muted,#8a8a8a)', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent,#c8a064)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted,#8a8a8a)'}>
                  Tout
                </span>
              )}
              {selected.size > 0 && (
                <span onClick={() => onUpdateConfig({ propIds: [] })}
                  style={{ fontSize: 10, color: 'var(--text-muted,#8a8a8a)', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent,#c8a064)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted,#8a8a8a)'}>
                  Aucun
                </span>
              )}
            </div>
            {allKeys.map(k => {
              const active = selected.has(k)
              return (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', cursor: 'pointer', fontSize: 11, color: active ? 'var(--text-secondary,#c0c0c0)' : 'var(--text-muted,#8a8a8a)' }}>
                  <input type="checkbox" checked={active} onChange={() => toggleProp(k)}
                    style={{ accentColor: 'var(--accent,#c8a064)' }} />
                  {statLabels[k] || k}
                </label>
              )
            })}
            {allKeys.length === 0 && <span style={{ fontSize: 10, color: 'var(--text-muted,#8a8a8a)' }}>Aucune stat disponible</span>}
          </div>
        )}
      </div>
    </div>
  )
}

import React, { useState, useMemo, useEffect } from 'react'
import { Icon, Btn } from '../components/ui.jsx'
import { BUILTIN_TYPES, getEffectiveProps } from '../data/types.js'

const CHART_COLORS = ['#c084fc','#c8a064','#06b6d4','#22c55e','#ef4444','#f59e0b','#a78bfa','#84cc16']

function getNumericProps(card, effectivePropDefs) {
  const result = {}
  // Builtin/type-defined props — only include NUMBER fieldType
  const propDefMap = {}
  ;(effectivePropDefs || []).forEach(p => { propDefMap[p.id] = p })
  Object.entries(card.props||{}).forEach(([k,v]) => {
    const def = propDefMap[k]
    // Skip if it's a date or card_ref field
    if (def && (def.fieldType === 'date' || def.fieldType === 'card_ref')) return
    const n = parseFloat(v)
    if (!isNaN(n) && v !== '' && v !== null) result[k] = n
  })
  // Extra user-added props — check fieldType explicitly
  ;(card.extraProps||[]).forEach(ep => {
    if (ep.fieldType === 'date' || ep.fieldType === 'card_ref') return
    const n = parseFloat(ep.value)
    if (!isNaN(n) && ep.value !== '' && ep.value !== null) result[ep.name||ep.id] = n
  })
  return result
}

export default function ChartsView({ cards, customTypes }) {
  const [selectedCardIds, setSelectedCardIds] = useState([])
  const [selectedStats,   setSelectedStats]   = useState([])
  const [chartType,       setChartType]       = useState('radar')
  const [search,          setSearch]          = useState('')

  const allTypes = [...BUILTIN_TYPES, ...(customTypes||[])]

  const cardsWithStats = useMemo(() =>
    cards.filter(c => Object.keys(getNumericProps(c, getEffectiveProps(c.typeId, customTypes))).length > 0)
  , [cards, customTypes])

  const visibleCards = useMemo(() =>
    cardsWithStats.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))
  , [cardsWithStats, search])

  // Auto-select first 4 cards on mount / when cards change
  useEffect(() => {
    if (selectedCardIds.length === 0 && cardsWithStats.length > 0) {
      setSelectedCardIds(cardsWithStats.slice(0,4).map(c => c.id))
    }
  }, [cardsWithStats.length])

  const allStatKeys = useMemo(() => {
    const keys = new Set()
    const targets = selectedCardIds.length > 0 ? cards.filter(c => selectedCardIds.includes(c.id)) : cards
    targets.forEach(c => Object.keys(getNumericProps(c, getEffectiveProps(c.typeId, customTypes))).forEach(k => keys.add(k)))
    return [...keys]
  }, [cards, selectedCardIds])

  const activeStats = selectedStats.length > 0 ? selectedStats : allStatKeys.slice(0,6)
  const toggleCard = id => setSelectedCardIds(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev,id])
  const toggleStat = k  => setSelectedStats (prev => prev.includes(k)  ? prev.filter(x=>x!==k)  : [...prev,k])

  const chartData = useMemo(() => {
    const targets = selectedCardIds.length > 0 ? cards.filter(c => selectedCardIds.includes(c.id)) : cardsWithStats.slice(0,6)
    return targets
      .filter(card => { const np = getNumericProps(card, getEffectiveProps(card.typeId, customTypes)); return activeStats.some(k => np[k]!==undefined && !isNaN(np[k])) })
      .map((card, i) => ({
        card,
        color: CHART_COLORS[cardsWithStats.indexOf(card) % CHART_COLORS.length] || CHART_COLORS[i%CHART_COLORS.length],
        stats: activeStats.map(k => ({ key:k, value: getNumericProps(card, getEffectiveProps(card.typeId, customTypes))[k]??0 })),
      }))
  }, [cards, customTypes, selectedCardIds, activeStats, cardsWithStats])

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
      {/* Left */}
      <div style={{ width:240, flexShrink:0, borderRight:'1px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'12px 12px 8px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize:12, color:'#7a6a58', marginBottom:8, fontFamily:"'Lora',serif" }}>Cartes</div>
          <div style={{ position:'relative' }}>
            <Icon name="search" size={11} style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:'#4a3a28' }} />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filtrer…"
              style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'none', borderRadius:6, padding:'5px 8px 5px 24px', color:'#c8b89a', fontSize:11, outline:'none' }} />
          </div>
        </div>
        <div style={{ flex:1, overflow:'auto', padding:'6px 8px' }}>
          {visibleCards.length === 0 && (
            <p style={{ color:'#3a2a18', fontSize:12, padding:'10px 6px' }}>Aucune carte avec stats numériques</p>
          )}
          {visibleCards.map((card, i) => {
            const isSel = selectedCardIds.includes(card.id)
            const color = CHART_COLORS[cardsWithStats.indexOf(card) % CHART_COLORS.length]
            const type  = allTypes.find(t => t.id===card.typeId)
            return (
              <div key={card.id} onClick={() => toggleCard(card.id)}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 8px', borderRadius:6, cursor:'pointer', marginBottom:2, transition:'all 0.1s', background: isSel?color+'14':'transparent', border:`1px solid ${isSel?color+'30':'transparent'}` }}
                onMouseEnter={e => { if(!isSel) e.currentTarget.style.background='rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { if(!isSel) e.currentTarget.style.background='transparent' }}>
                {isSel && <div style={{ width:8, height:8, borderRadius:'50%', background:color, flexShrink:0 }} />}
                {card.image ? <img src={card.image} alt="" style={{ width:22, height:22, borderRadius:5, objectFit:'cover', flexShrink:0 }} />
                  : <span style={{ fontSize:14, width:22, textAlign:'center', flexShrink:0 }}>{type?.icon||'📄'}</span>}
                <span style={{ fontSize:12, color: isSel?'#f0e6d3':'#9a8a70', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{card.name}</span>
              </div>
            )
          })}
        </div>

        {allStatKeys.length > 0 && (
          <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'10px 12px' }}>
            <div style={{ fontSize:11, color:'#5a4a38', marginBottom:8 }}>Statistiques</div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {allStatKeys.map(k => (
                <label key={k} style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', fontSize:12, color: activeStats.includes(k)?'#c8b89a':'#5a4a38' }}>
                  <input type="checkbox" checked={activeStats.includes(k)} onChange={() => toggleStat(k)} style={{ accentColor:'#c8a064' }} />
                  {k}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: chart */}
      <div style={{ flex:1, overflow:'auto', padding:'24px 32px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <h2 style={{ fontFamily:"'Lora',serif", fontSize:22, color:'#f0e6d3', fontWeight:500 }}>Graphiques</h2>
          <div style={{ display:'flex', gap:8 }}>
            <Btn variant={chartType==='radar'?'active':'subtle'} size="sm" onClick={() => setChartType('radar')}>Radar</Btn>
            <Btn variant={chartType==='bar'?'active':'subtle'} size="sm" onClick={() => setChartType('bar')}>Barres</Btn>
          </div>
        </div>

        {allStatKeys.length === 0 ? (
          <div style={{ textAlign:'center', paddingTop:80, color:'#3a2a18' }}>
            <Icon name="chart" size={44} style={{ opacity:0.1, marginBottom:14 }} />
            <p style={{ fontSize:15, marginBottom:8 }}>Aucune statistique numérique</p>
            <p style={{ fontSize:12 }}>Ajoutez des propriétés Numérique à vos cartes.</p>
          </div>
        ) : chartData.length === 0 ? (
          <div style={{ textAlign:'center', paddingTop:60, color:'#3a2a18', fontSize:14 }}>Sélectionnez des cartes à gauche</div>
        ) : (
          <>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:24 }}>
              {chartData.map(({ card, color }) => (
                <div key={card.id} style={{ display:'flex', alignItems:'center', gap:7 }}>
                  {card.image && <img src={card.image} alt="" style={{ width:20, height:20, borderRadius:4, objectFit:'cover' }} />}
                  <div style={{ width:10, height:10, borderRadius:'50%', background:color }} />
                  <span style={{ fontSize:13, color:'#c8b89a' }}>{card.name}</span>
                </div>
              ))}
            </div>
            {chartType==='radar' ? <RadarChart data={chartData} stats={activeStats} /> : <BarChart data={chartData} stats={activeStats} />}
          </>
        )}
      </div>
    </div>
  )
}

function RadarChart({ data, stats }) {
  if (stats.length < 3) return <p style={{ color:'#5a4a38', fontSize:13 }}>Sélectionnez au moins 3 statistiques.</p>
  const SIZE=500, cx=250, cy=250, r=SIZE*0.32, labelR=SIZE*0.43, n=stats.length
  const angle = i => (i/n)*Math.PI*2 - Math.PI/2
  const globalMax = Math.max(1, ...data.flatMap(d => d.stats.map(s=>s.value)))
  const pt = (i, frac) => ({ x: cx+r*frac*Math.cos(angle(i)), y: cy+r*frac*Math.sin(angle(i)) })
  return (
    <div style={{ display:'flex', justifyContent:'center' }}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ width:'100%', maxWidth:480, height:'auto' }} preserveAspectRatio="xMidYMid meet">
        {[0.2,0.4,0.6,0.8,1.0].map(f => (
          <polygon key={f} points={stats.map((_,i)=>{ const p=pt(i,f); return `${p.x},${p.y}` }).join(' ')} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={f===1?1.5:1} />
        ))}
        {stats.map((_,i) => { const p=pt(i,1); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.09)" strokeWidth={1} /> })}
        {[0.25,0.5,0.75,1.0].map(f => {
          const p=pt(0,f)
          return <text key={f} x={p.x+4} y={p.y} fontSize={9} fill="#4a3a28" fontFamily="'DM Sans',sans-serif" dominantBaseline="central">{Math.round(globalMax*f)}</text>
        })}
        {stats.map((k,i) => {
          const a=angle(i), p={ x:cx+labelR*Math.cos(a), y:cy+labelR*Math.sin(a) }
          const anchor = Math.cos(a)>0.1?'start':Math.cos(a)<-0.1?'end':'middle'
          return <text key={i} x={p.x} y={p.y} textAnchor={anchor} dominantBaseline="central" fontSize={12} fill="#8a7a68" fontFamily="'DM Sans',sans-serif" fontWeight="500">{k.length>14?k.slice(0,13)+'…':k}</text>
        })}
        {data.map(({ stats:cs, color, card }) => {
          const pts = stats.map((k,i) => { const v=cs.find(s=>s.key===k)?.value||0; const p=pt(i, globalMax>0?v/globalMax:0); return `${p.x},${p.y}` }).join(' ')
          return (
            <g key={card.id}>
              <polygon points={pts} fill={color+'1a'} stroke={color} strokeWidth={2} strokeLinejoin="round" />
              {stats.map((k,i) => { const v=cs.find(s=>s.key===k)?.value||0; const p=pt(i, globalMax>0?v/globalMax:0); return <circle key={i} cx={p.x} cy={p.y} r={4} fill={color} stroke="rgba(0,0,0,0.6)" strokeWidth={1.5} /> })}
            </g>
          )
        })}
        <circle cx={cx} cy={cy} r={3} fill="rgba(255,255,255,0.15)" />
      </svg>
    </div>
  )
}

function BarChart({ data, stats }) {
  const maxVal = Math.max(1, ...data.flatMap(d => d.stats.map(s=>s.value)))
  const bw=24, gap=6, gg=20, chartH=240
  const totalW = stats.length*(data.length*(bw+gap)+gg)+60
  return (
    <div style={{ overflowX:'auto' }}>
      <svg width={Math.max(totalW,400)} height={chartH+60}>
        <g transform="translate(40,10)">
          {[0,0.25,0.5,0.75,1.0].map(f => {
            const y=chartH*(1-f)
            return (
              <g key={f}>
                <line x1={0} y1={y} x2={totalW-60} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
                <text x={-6} y={y} textAnchor="end" dominantBaseline="central" fontSize={9} fill="#4a3a28">{Math.round(maxVal*f)}</text>
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
                      <rect x={x} y={chartH-barH} width={bw} height={barH} fill={color+'a0'} stroke={color} strokeWidth={1} rx={3} />
                      <text x={x+bw/2} y={chartH-barH-4} textAnchor="middle" fontSize={9} fill={color} fontFamily="'DM Sans',sans-serif">{val}</text>
                    </g>
                  )
                })}
                <text x={gx+(data.length*(bw+gap))/2} y={chartH+14} textAnchor="middle" fontSize={11} fill="#7a6a58" fontFamily="'DM Sans',sans-serif">{stat.length>10?stat.slice(0,9)+'…':stat}</text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}

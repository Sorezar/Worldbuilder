import React, { useState, useMemo } from 'react'
import { Icon, Tag } from '../components/ui.jsx'
import { BUILTIN_TYPES, getEffectiveProps } from '../data/types.js'

const BUILTIN_COLORS = { character:'#c084fc', location:'#f59e0b', faction:'#ef4444', item:'#06b6d4', event:'#22c55e', quest:'#16a34a', battle:'#dc2626', festival:'#d97706', prophecy:'#7c3aed', coronation:'#c8a064' }

function getColor(typeId, customTypes) {
  return customTypes?.find(x=>x.id===typeId)?.color || BUILTIN_COLORS[typeId] || '#8a8a8a'
}
function getIcon(typeId, customTypes) {
  return [...BUILTIN_TYPES,...(customTypes||[])].find(x=>x.id===typeId)?.icon || '📅'
}

// All dates → absolute days since 2000-01-01
function parseDateKey(dateStr, calendars) {
  if (!dateStr || typeof dateStr !== 'string') return Infinity
  if (dateStr.startsWith('cal:')) {
    const parts = dateStr.split(':')
    const cal = calendars?.find(c=>c.id===parts[1])
    if (!cal) return 0
    const [y,m,d] = (parts[2]||'1-1-1').split('-').map(Number)
    const dpm = 360/(cal.months?.length||12)
    return ((y||1)-1)*360 + ((m||1)-1)*dpm + ((d||1)-1) - (cal.offsetDays||0)
  }
  const dt = new Date(dateStr)
  if (isNaN(dt.getTime())) return Infinity
  return (dt.getTime() - new Date('2000-01-01').getTime()) / 86400000
}

// Display a date string in a given calendar referential
function displayDate(dateStr, viewCal, calendars) {
  if (!dateStr) return null
  const cals = calendars || []

  if (viewCal === 'real') {
    if (!dateStr.startsWith('cal:')) return dateStr
    const parts = dateStr.split(':')
    const cal = cals.find(c=>c.id===parts[1])
    if (!cal) return parts[2] || dateStr
    const [y,m,d] = (parts[2]||'1-1-1').split('-').map(Number)
    const dpm = 360/(cal.months?.length||12)
    const totalDays = ((y||1)-1)*360+((m||1)-1)*dpm+((d||1)-1)-(cal.offsetDays||0)
    const realMs = new Date('2000-01-01').getTime()+totalDays*86400000
    return new Date(realMs).toLocaleDateString('fr-FR')
  }

  const toCal = cals.find(c=>c.id===viewCal)
  if (!toCal) return dateStr

  let realMs
  if (dateStr.startsWith('cal:')) {
    const parts = dateStr.split(':')
    if (parts[1]===viewCal) {
      const [y,m,d] = (parts[2]||'1-1-1').split('-').map(Number)
      const mNames = toCal.months || Array.from({length:12},(_,i)=>String(i+1))
      return `${d||1} ${mNames[(m||1)-1]||m} ${y||1} ${toCal.epochName||''}`
    }
    const srcCal = cals.find(c=>c.id===parts[1])
    if (!srcCal) return parts[2]||dateStr
    const [y,m,d] = (parts[2]||'1-1-1').split('-').map(Number)
    const dpm = 360/(srcCal.months?.length||12)
    const totalDays = ((y||1)-1)*360+((m||1)-1)*dpm+((d||1)-1)-(srcCal.offsetDays||0)
    realMs = new Date('2000-01-01').getTime()+totalDays*86400000
  } else {
    realMs = new Date(dateStr).getTime()
    if (isNaN(realMs)) return dateStr
  }

  const diffDays = Math.floor((realMs-new Date('2000-01-01').getTime())/86400000)+(toCal.offsetDays||0)
  if (diffDays < 0) return dateStr
  const calMonths = toCal.months?.length||12
  const dpm = 360/calMonths
  const year  = Math.floor(diffDays/360)+1
  const rem   = diffDays%360
  const month = Math.floor(rem/dpm)+1
  const day   = Math.floor(rem%dpm)+1
  const mNames = toCal.months || Array.from({length:12},(_,i)=>String(i+1))
  return `${day} ${mNames[month-1]||month} ${year} ${toCal.epochName||''}`
}

export default function TimelineView({ cards, customTypes, calendars, onOpenCard }) {
  const [selectedChars, setSelectedChars] = useState([])
  const [search,        setSearch]        = useState('')
  const [viewCal,       setViewCal]       = useState('real')

  const allTypes = [...BUILTIN_TYPES,...(customTypes||[])]

  const characterCards = useMemo(() =>
    cards.filter(c => c.typeId==='character' || (customTypes||[]).find(t=>t.id===c.typeId&&t.parentId==='character'))
  , [cards, customTypes])

  // Build timeline entries: any card that has a date prop with a value
  const timelineEntries = useMemo(() => {
    const allEventTypes = new Set(['event','quest','battle','festival','prophecy','coronation'])
    ;(customTypes||[]).forEach(t => { if(t.parentId==='event') allEventTypes.add(t.id) })

    const entries = []
    const seen = new Set() // avoid duplicates per card+propId

    cards.forEach(card => {
      const isEvent = allEventTypes.has(card.typeId)
      const typeOverrides = card.propTypeOverrides || {}

      // Check type-defined props (including inherited)
      const effectiveProps = getEffectiveProps(card.typeId, customTypes)
      effectiveProps.forEach(p => {
        const override = typeOverrides[p.id]
        const fieldType = override?.fieldType || p.fieldType
        if (fieldType !== 'date') return
        const val = card.props?.[p.id]
        if (!val || typeof val !== 'string') return
        const key = card.id + '_' + p.id
        if (seen.has(key)) return
        seen.add(key)
        entries.push({
          id: key, cardId: card.id, card, label: card.name,
          dateStr: val, propName: isEvent ? null : p.name,
          isEvent, sortKey: parseDateKey(val, calendars),
        })
      })

      // Check extra props for date fields
      ;(card.extraProps||[]).forEach(ep => {
        if (ep.fieldType !== 'date' || !ep.value) return
        const key = card.id + '_' + ep.id
        if (seen.has(key)) return
        seen.add(key)
        entries.push({
          id: key, cardId: card.id, card, label: card.name,
          dateStr: ep.value, propName: ep.name || ep.id,
          isEvent: false, sortKey: parseDateKey(ep.value, calendars),
        })
      })

      // For event cards without any date prop matched, try evdate/date directly
      if (isEvent && !entries.some(e => e.cardId === card.id)) {
        const dateVal = card.props?.evdate || card.props?.date || ''
        if (dateVal) {
          entries.push({
            id: card.id + '_event', cardId: card.id, card, label: card.name,
            dateStr: dateVal, propName: null,
            isEvent: true, sortKey: parseDateKey(dateVal, calendars),
          })
        }
      }
    })

    return entries
      .filter(e => e.sortKey !== Infinity)
      .filter(e => !search || e.label.toLowerCase().includes(search.toLowerCase()))
      .sort((a,b) => a.sortKey - b.sortKey)
  }, [cards, customTypes, calendars, search])

  const toggleChar = id => setSelectedChars(prev => prev.includes(id)?prev.filter(x=>x!==id):[...prev,id])

  const isHighlighted = entry => {
    if (!entry.isEvent || selectedChars.length===0) return false
    const p = entry.card.props?.participants
    return Array.isArray(p) ? p.some(cid=>selectedChars.includes(cid)) : selectedChars.includes(p)
  }

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden', background:'var(--bg-base-50,rgba(8,4,0,0.5))', backdropFilter:'blur(40px) saturate(1.4)', WebkitBackdropFilter:'blur(40px) saturate(1.4)', borderRadius:16, border:'1px solid var(--border-09,rgba(255,200,120,0.09))' }}>
      {/* Left panel */}
      <div style={{ width:210, flexShrink:0, borderRight:'1px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'12px 14px 8px', borderBottom:'1px solid rgba(255,255,255,0.06)', fontSize:12, color:'var(--text-muted,#8a8a8a)', fontFamily:"var(--font)" }}>Personnages</div>
        <div style={{ flex:1, overflow:'auto', padding:'6px 8px' }}>
          {characterCards.map(char => {
            const sel = selectedChars.includes(char.id)
            return (
              <div key={char.id} onClick={() => toggleChar(char.id)}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 8px', borderRadius:7, cursor:'pointer', marginBottom:2, background:sel?'rgba(192,132,252,0.12)':'transparent', border:`1px solid ${sel?'rgba(192,132,252,0.25)':'transparent'}`, transition:'all 0.1s' }}
                onMouseEnter={e => { if(!sel) e.currentTarget.style.background='rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { if(!sel) e.currentTarget.style.background='transparent' }}>
                {char.image
                  ? <img src={char.image} alt="" style={{ width:20,height:20,borderRadius:'50%',objectFit:'cover',flexShrink:0 }} />
                  : <div style={{ width:20,height:20,borderRadius:'50%',background:'rgba(192,132,252,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,flexShrink:0 }}>👤</div>}
                <span style={{ fontSize:12, color:sel?'var(--text-primary,#f0f0f0)':'var(--text-muted,#8a8a8a)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{char.name}</span>
              </div>
            )
          })}
          {characterCards.length===0 && <p style={{ color:'var(--text-darker,#2e2e2e)', fontSize:12, padding:'10px 6px' }}>Aucun personnage</p>}
        </div>

        {/* Calendar selector */}
        {(calendars||[]).length > 0 && (
          <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'10px 12px' }}>
            <div style={{ fontSize:10, color:'var(--text-darker,#2e2e2e)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:7 }}>Référentiel</div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              <label style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color:viewCal==='real'?'var(--text-secondary,#c0c0c0)':'var(--text-dim,#5a5a5a)', cursor:'pointer' }}>
                <input type="radio" checked={viewCal==='real'} onChange={() => setViewCal('real')} style={{ accentColor:'var(--accent,#c8a064)' }} />
                Grégorien
              </label>
              {(calendars||[]).map(cal => (
                <label key={cal.id} style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color:viewCal===cal.id?'var(--text-secondary,#c0c0c0)':'var(--text-dim,#5a5a5a)', cursor:'pointer' }}>
                  <input type="radio" checked={viewCal===cal.id} onChange={() => setViewCal(cal.id)} style={{ accentColor:'var(--accent,#c8a064)' }} />
                  {cal.name}
                </label>
              ))}
            </div>
          </div>
        )}

        {selectedChars.length > 0 && (
          <div style={{ padding:'8px 12px', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
            <button onClick={() => setSelectedChars([])} style={{ background:'none', border:'none', color:'var(--text-dim,#5a5a5a)', fontSize:11, cursor:'pointer' }}>✕ Effacer filtre</button>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div style={{ flex:1, overflow:'auto', padding:'24px 36px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
          <h2 style={{ fontFamily:"var(--font)", fontSize:22, color:'var(--text-primary,#f0f0f0)', fontWeight:500, margin:0 }}>Timeline</h2>
          <div style={{ position:'relative' }}>
            <Icon name="search" size={12} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--text-dark,#444444)' }} />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filtrer…"
              style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:8, padding:'6px 10px 6px 26px', color:'var(--text-secondary,#c0c0c0)', fontSize:12, outline:'none', width:160 }} />
          </div>
        </div>

        {timelineEntries.length === 0 ? (
          <div style={{ textAlign:'center', paddingTop:80, color:'var(--text-darker,#2e2e2e)' }}>
            <Icon name="timeline" size={44} style={{ opacity:0.1, marginBottom:14 }} />
            <p style={{ fontSize:15 }}>{search ? 'Aucun élément correspondant' : 'Aucun élément avec date'}</p>
            <p style={{ fontSize:12, marginTop:8 }}>Créez des cartes de type Événement, ou ajoutez des propriétés Date à n'importe quelle carte.</p>
          </div>
        ) : (
          <div style={{ position:'relative', paddingLeft:32 }}>
            <div style={{ position:'absolute', left:11, top:10, bottom:10, width:2, background:'rgba(255,255,255,0.06)', borderRadius:1 }} />

            {timelineEntries.map((entry, i) => {
              const hl = isHighlighted(entry)
              const color = getColor(entry.card.typeId, customTypes)
              const dateLabel = displayDate(entry.dateStr, viewCal, calendars)
              const participantIds = entry.isEvent
                ? (Array.isArray(entry.card.props?.participants) ? entry.card.props.participants : (entry.card.props?.participants ? [entry.card.props.participants] : []))
                : []
              const participants = participantIds.map(id=>cards.find(c=>c.id===id)).filter(Boolean)
              const location = entry.card.props?.location ? cards.find(c=>c.id===entry.card.props.location) : null

              return (
                <div key={entry.id} className="anim-fadeup" style={{ position:'relative', marginBottom:20, animationDelay:`${i*0.025}s` }}>
                  {/* Dot */}
                  <div style={{ position:'absolute', left:-28, top:14, width:14, height:14, borderRadius:'50%', background:hl?color:entry.isEvent?color+'40':'rgba(255,255,255,0.08)', border:`2px solid ${hl?color:entry.isEvent?color:'rgba(255,255,255,0.12)'}`, transition:'all 0.2s', zIndex:1, boxShadow:hl?`0 0 10px ${color}60`:'none' }} />

                  <div onClick={() => onOpenCard(entry.cardId)}
                    style={{ background:hl?`${color}12`:entry.isEvent?`${color}08`:'rgba(0,0,0,0.18)', border:`1px solid ${hl?color+'40':entry.isEvent?color+'20':'rgba(255,255,255,0.06)'}`, borderRadius:14, padding:'12px 16px', cursor:'pointer', transition:'all 0.15s', marginLeft:8 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor=color+'50'; e.currentTarget.style.background=color+'14' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor=hl?color+'40':entry.isEvent?color+'20':'rgba(255,255,255,0.06)'; e.currentTarget.style.background=hl?`${color}12`:entry.isEvent?`${color}08`:'rgba(0,0,0,0.18)' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                      <span style={{ fontSize:16, flexShrink:0, marginTop:1 }}>{getIcon(entry.card.typeId, customTypes)}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3, flexWrap:'wrap' }}>
                          <span style={{ fontFamily:"var(--font)", fontSize:14, color:'var(--text-primary,#f0f0f0)', fontWeight:500 }}>{entry.label}</span>
                          {entry.propName && (
                            <span style={{ fontSize:10, color:'var(--text-dim,#5a5a5a)', background:'rgba(255,255,255,0.06)', padding:'1px 6px', borderRadius:3 }}>{entry.propName}</span>
                          )}
                          {!entry.isEvent && (
                            <span style={{ fontSize:10, color:color, background:color+'14', padding:'1px 6px', borderRadius:3 }}>
                              {allTypes.find(t=>t.id===entry.card.typeId)?.name||entry.card.typeId}
                            </span>
                          )}
                          {entry.isEvent && <Tag label={entry.card.typeId} color={color} size="sm" />}
                          {dateLabel && <span style={{ fontSize:11, color:'var(--text-muted,#8a8a8a)', marginLeft:'auto' }}>📅 {dateLabel}</span>}
                        </div>
                        {entry.isEvent && entry.card.text && (
                          <p style={{ fontSize:12, color:'var(--text-dim,#5a5a5a)', lineHeight:1.5, marginBottom:6, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{entry.card.text}</p>
                        )}
                        {(location || participants.length > 0) && (
                          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginTop:4 }}>
                            {location && <span style={{ fontSize:11, color:'var(--text-dim,#5a5a5a)' }}>📍 {location.name}</span>}
                            {participants.slice(0,4).map(p => (
                              <span key={p.id} style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:11, padding:'1px 6px', background:selectedChars.includes(p.id)?'rgba(192,132,252,0.2)':'rgba(255,255,255,0.05)', border:`1px solid ${selectedChars.includes(p.id)?'rgba(192,132,252,0.35)':'rgba(255,255,255,0.08)'}`, borderRadius:4, color:selectedChars.includes(p.id)?'#c084fc':'var(--text-muted,#8a8a8a)' }}>
                                {p.image?<img src={p.image} alt="" style={{ width:11,height:11,borderRadius:'50%',objectFit:'cover' }} />:'👤'}
                                {p.name}
                              </span>
                            ))}
                            {participants.length > 4 && <span style={{ fontSize:11, color:'var(--text-dark,#444444)' }}>+{participants.length-4}</span>}
                          </div>
                        )}
                      </div>
                      {entry.card.image && entry.isEvent && <img src={entry.card.image} alt="" style={{ width:46,height:46,borderRadius:7,objectFit:'cover',flexShrink:0 }} />}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

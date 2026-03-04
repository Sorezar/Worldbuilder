import React, { useState } from 'react'
import { Icon, Btn } from '../components/ui.jsx'
import { uid } from '../store/useStore.js'

// Un calendrier : { id, name, epochName, offsetDays }
// offsetDays = nombre de jours entre l'epoch "0" du calendrier et le 1er Jan 2000 (réel)
// Exemple : si "1 Jan 1 AP Fracture" = "5 mars 2026", alors offsetDays = jours entre 1/1/2000 et 5/3/2026 - 1 (premier jour du cal)

const REAL_EPOCH = new Date('2000-01-01').getTime() // ms, référence

function calDateToReal(calYear, calMonth, calDay, cal) {
  const dayOfYear = (calMonth - 1) * 30 + calDay - 1 // simplifié 12 mois de 30 jours
  const totalDays = (calYear - 1) * 360 + dayOfYear
  const realMs = REAL_EPOCH + (totalDays - (cal.offsetDays || 0)) * 86400000
  return new Date(realMs)
}

function realToCalDate(realDate, cal) {
  const diffDays = Math.floor((realDate.getTime() - REAL_EPOCH) / 86400000) + (cal.offsetDays || 0)
  const totalDays = Math.max(0, diffDays)
  const year = Math.floor(totalDays / 360) + 1
  const rem = totalDays % 360
  const month = Math.floor(rem / 30) + 1
  const day = (rem % 30) + 1
  return { year, month, day }
}

export function formatCalDate(dateStr, calendars) {
  if (!dateStr || !calendars?.length) return dateStr || '—'
  if (dateStr.startsWith('cal:')) {
    const [, calId, rest] = dateStr.split(':')
    const cal = calendars.find(c => c.id === calId)
    if (!cal) return rest || dateStr
    const [y, m, d] = rest.split('-').map(Number)
    if (!y) return rest
    const monthNames = cal.months?.length ? cal.months : Array.from({length:12},(_,i)=>String(i+1))
    const mName = monthNames[(m||1)-1] || m
    return `${d||1} ${mName} ${y} ${cal.epochName||''}`
  }
  return dateStr
}

export default function CalendarsView({ calendars, onCreate, onUpdate, onDelete, onClose }) {
  const [editing, setEditing] = useState(null) // null | 'new' | cal.id
  const [form,    setForm]    = useState({})

  const DEFAULT_MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
  const startNew = () => {
    setForm({ name:'Nouveau Calendrier', epochName:'AP', offsetDays:0, months:[...DEFAULT_MONTHS] })
    setEditing('new')
  }
  const startEdit = cal => { setForm({ ...cal, months: cal.months || Array.from({length:12},(_,i)=>String(i+1)) }); setEditing(cal.id) }
  const save = () => {
    if (editing === 'new') onCreate({ ...form, id: uid() })
    else onUpdate(editing, form)
    setEditing(null)
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div style={{ position:'relative', background:'rgba(12,8,2,0.97)', border:'1px solid rgba(255,200,120,0.15)', borderRadius:16, width:680, maxHeight:'80vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 80px rgba(0,0,0,0.8)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          <h2 style={{ fontFamily:"'Lora',serif", fontSize:18, color:'#f0e6d3', fontWeight:500, margin:0 }}>📅 Calendriers</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#5a4a38', cursor:'pointer', fontSize:18, lineHeight:1 }}>✕</button>
        </div>

        <div style={{ flex:1, overflow:'auto', padding:20 }}>
          {editing ? (
            <CalendarForm form={form} setForm={setForm} onSave={save} onCancel={() => setEditing(null)} isNew={editing==='new'} />
          ) : (
            <>
              <div style={{ marginBottom:16 }}>
                <Btn variant="primary" onClick={startNew}><Icon name="plus" size={12} /> Nouveau calendrier</Btn>
              </div>
              {calendars.length === 0 && (
                <div style={{ textAlign:'center', padding:'40px 0', color:'#3a2a18', fontSize:13 }}>
                  <p>Aucun calendrier custom</p>
                  <p style={{ marginTop:6, fontSize:11 }}>Par défaut, les dates utilisent le calendrier grégorien réel.</p>
                </div>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {calendars.map(cal => (
                  <CalendarCard key={cal.id} cal={cal} onEdit={() => startEdit(cal)} onDelete={() => { if(window.confirm(`Supprimer "${cal.name}" ?`)) onDelete(cal.id) }} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function CalendarCard({ cal, onEdit, onDelete }) {
  const months = cal.months || []
  return (
    <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'14px 16px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <div>
          <span style={{ fontFamily:"'Lora',serif", fontSize:15, color:'#f0e6d3' }}>{cal.name}</span>
          <span style={{ marginLeft:10, fontSize:11, color:'#5a4a38' }}>Ère : <b style={{ color:'#c8a064' }}>{cal.epochName||'—'}</b></span>
          <span style={{ marginLeft:10, fontSize:11, color:'#5a4a38' }}>Décalage : {cal.offsetDays||0} jours</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onEdit} style={{ background:'none', border:'none', color:'#5a4a38', cursor:'pointer', fontSize:12 }} onMouseEnter={e=>e.currentTarget.style.color='#c8a064'} onMouseLeave={e=>e.currentTarget.style.color='#5a4a38'}>Modifier</button>
          <button onClick={onDelete} style={{ background:'none', border:'none', color:'#5a3030', cursor:'pointer', fontSize:12 }} onMouseEnter={e=>e.currentTarget.style.color='#ef4444'} onMouseLeave={e=>e.currentTarget.style.color='#5a3030'}>Supprimer</button>
        </div>
      </div>
      {months.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
          {months.map((m,i) => <span key={i} style={{ fontSize:10, color:'#7a6a58', background:'rgba(255,255,255,0.04)', padding:'2px 7px', borderRadius:4 }}>{m}</span>)}
        </div>
      )}
    </div>
  )
}

function CalendarForm({ form, setForm, onSave, onCancel, isNew }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setMonth = (i, v) => {
    const months = [...(form.months||[])]
    months[i] = v
    setForm(f => ({ ...f, months }))
  }

  return (
    <div className="anim-fadeup">
      <h3 style={{ fontFamily:"'Lora',serif", fontSize:16, color:'#f0e6d3', marginBottom:20, fontWeight:500 }}>
        {isNew ? 'Nouveau calendrier' : `Modifier : ${form.name}`}
      </h3>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:18 }}>
        <Field label="Nom du calendrier">
          <input value={form.name||''} onChange={e=>set('name',e.target.value)} style={inp} />
        </Field>
        <Field label="Nom de l'ère (ex: AP Fracture, Ere de Lumière)">
          <input value={form.epochName||''} onChange={e=>set('epochName',e.target.value)} placeholder="AP" style={inp} />
        </Field>
      </div>

      <Field label="Décalage par rapport au 1er Jan 2000 (en jours)" style={{ marginBottom:18 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <input type="number" value={form.offsetDays||0} onChange={e=>set('offsetDays',parseInt(e.target.value)||0)} style={{ ...inp, width:120 }} />
          <span style={{ fontSize:11, color:'#4a3a28' }}>
            = Le "Jour 1" du calendrier correspond au {new Date(new Date('2000-01-01').getTime() - (form.offsetDays||0)*86400000).toLocaleDateString('fr-FR')} (grégorien)
          </span>
        </div>
      </Field>

      <div style={{ marginBottom:18 }}>
        <div style={{ fontSize:11, color:'#4a3a28', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Noms des 12 mois</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:6 }}>
          {Array.from({length:12},(_,i) => (
            <input key={i} value={(form.months||[])[i]||''} onChange={e=>setMonth(i,e.target.value)}
              placeholder={`Mois ${i+1}`} style={{ ...inp, fontSize:11 }} />
          ))}
        </div>
      </div>

      <div style={{ display:'flex', gap:8 }}>
        <Btn variant="primary" onClick={onSave}>Enregistrer</Btn>
        <Btn variant="subtle" onClick={onCancel}>Annuler</Btn>
      </div>
    </div>
  )
}

function Field({ label, children, style }) {
  return (
    <div style={style}>
      <div style={{ fontSize:11, color:'#4a3a28', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{label}</div>
      {children}
    </div>
  )
}

const inp = { width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:7, padding:'7px 10px', color:'#e2d9c8', fontSize:13, outline:'none', boxSizing:'border-box' }

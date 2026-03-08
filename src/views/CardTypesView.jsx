import React, { useState, useEffect, useRef } from 'react'
import { Icon, Btn, ColorPicker, EmojiPicker } from '../components/ui.jsx'
import { BUILTIN_TYPES, FIELD_TYPES, getEffectiveProps } from '../data/types.js'
import { uid } from '../store/useStore.js'

export default function CardTypesView({ customTypes, onUpdateType, onCreateCustomType, onDeleteType }) {
  const typeMap = new Map()
  BUILTIN_TYPES.filter(t => !t.virtual).forEach(t => typeMap.set(t.id, t))
  ;(customTypes||[]).forEach(t => typeMap.set(t.id, t))
  const dedupedTypes = [...typeMap.values()]

  const [selected, setSelected] = useState(dedupedTypes[0]?.id || null)
  const [search,   setSearch]   = useState('')
  const [creating, setCreating] = useState(false)

  const selectedType = typeMap.get(selected)
  const isBuiltin    = BUILTIN_TYPES.some(t => t.id===selected) && !(customTypes||[]).some(t => t.id===selected)
  const rootTypes    = dedupedTypes.filter(t => !t.parentId)
  const filtered     = search ? dedupedTypes.filter(t => t.name.toLowerCase().includes(search.toLowerCase())) : null
  const displayList  = filtered || rootTypes

  return (
    <div style={{ display:'flex', height:'100%' }}>
      {/* Left tree */}
      <div style={{ width:240, flexShrink:0, borderRight:'1px solid rgba(255,200,120,0.08)', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'10px 10px 8px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', gap:7, alignItems:'center' }}>
          <div style={{ position:'relative', flex:1 }}>
            <Icon name="search" size={11} style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:'var(--text-darker,#2e2e2e)' }} />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher…"
              style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'none', borderRadius:6, padding:'5px 8px 5px 22px', color:'var(--text-secondary,#c0c0c0)', fontSize:12, outline:'none' }} />
          </div>
          <button onClick={() => { setCreating(true); setSelected(null) }} style={{ background:'none', border:'1px solid rgba(255,255,255,0.09)', borderRadius:6, color:'var(--text-dim,#5a5a5a)', cursor:'pointer', padding:'4px 7px', fontSize:11 }}
            onMouseEnter={e=>e.currentTarget.style.color='#c8a064'} onMouseLeave={e=>e.currentTarget.style.color='#5a5a5a'}>
            <Icon name="plus" size={12} />
          </button>
        </div>
        <div style={{ flex:1, overflow:'auto', padding:'5px 6px' }}>
          {displayList.map(type => (
            <TypeTreeItem key={type.id} type={type} typeMap={typeMap} selected={selected}
              onSelect={id => { setSelected(id); setCreating(false) }}
              filtered={!!search} customTypes={customTypes||[]} />
          ))}
        </div>
        <div style={{ padding:'8px 12px', borderTop:'1px solid rgba(255,255,255,0.05)', fontSize:11, color:'var(--text-darker,#2e2e2e)' }}>
          {dedupedTypes.length} types
        </div>
      </div>

      {/* Right editor */}
      <div style={{ flex:1, overflow:'auto', padding:'20px 24px' }}>
        {creating ? (
          <InlineNewType allTypes={dedupedTypes}
            onCancel={() => { setCreating(false); setSelected(dedupedTypes[0]?.id||null) }}
            onCreate={data => { const t=onCreateCustomType(data); setSelected(t.id); setCreating(false) }}
          />
        ) : selectedType ? (
          <TypeEditor
            key={selected+JSON.stringify(selectedType.defaultProps)}
            type={selectedType} isBuiltin={isBuiltin} allTypes={dedupedTypes}
            onUpdate={patch => onUpdateType(selectedType.id, patch)}
            onDelete={() => {
              if (!BUILTIN_TYPES.some(t => t.id===selectedType.id)) {
                if (window.confirm(`Supprimer "${selectedType.name}" ?`)) { onDeleteType(selectedType.id); setSelected(dedupedTypes[0]?.id||null) }
              }
            }}
          />
        ) : (
          <div style={{ textAlign:'center', paddingTop:60, color:'var(--text-darker,#2e2e2e)' }}>Sélectionnez un type</div>
        )}
      </div>
    </div>
  )
}

// ─── TypeTreeItem ─────────────────────────────────────────────
function TypeTreeItem({ type, typeMap, selected, onSelect, depth=0, filtered, customTypes }) {
  const [expanded, setExpanded] = useState(false)
  const children   = [...typeMap.values()].filter(t => t.parentId===type.id)
  const isSelected = selected===type.id
  const isOverridden = customTypes.some(t => t.id===type.id)

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:`5px 8px 5px ${8+depth*14}px`, borderRadius:6, cursor:'pointer', marginBottom:1, background: isSelected?'rgba(200,160,100,0.1)':'transparent', transition:'background 0.1s' }}
        onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background='rgba(255,255,255,0.04)' }}
        onMouseLeave={e => { if(!isSelected) e.currentTarget.style.background='transparent' }}>
        <span style={{ fontSize:14, width:18, textAlign:'center', flexShrink:0 }}>{type.icon}</span>
        <span onClick={() => onSelect(type.id)} style={{ flex:1, fontSize:12, color: isSelected?'#f0f0f0':'#8a8a8a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{type.name}</span>
        {isOverridden && BUILTIN_TYPES.some(t=>t.id===type.id) && <span style={{ fontSize:9, color:'var(--accent,#c8a064)', opacity:0.6, flexShrink:0 }}>✦</span>}
        {/* Expand arrow — RIGHT */}
        {!filtered && children.length > 0
          ? <span onClick={e => { e.stopPropagation(); setExpanded(!expanded) }} style={{ display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-dark,#444444)', flexShrink:0, width:16 }}>
              <Icon name={expanded?'chevron_down':'chevron_right'} size={10} />
            </span>
          : <span style={{ width:16, flexShrink:0 }} />
        }
      </div>
      {expanded && !filtered && children.map(child => (
        <TypeTreeItem key={child.id} type={child} typeMap={typeMap} selected={selected} onSelect={onSelect} depth={depth+1} customTypes={customTypes} />
      ))}
    </div>
  )
}

// ─── TypeEditor ───────────────────────────────────────────────
function TypeEditor({ type, isBuiltin, allTypes, onUpdate, onDelete }) {
  const [props,      setProps]      = useState(type.defaultProps||[])
  const [color,      setColor]      = useState(type.color||'#c8a064')
  const [addingProp, setAddingProp] = useState(false)

  const addProp = prop => {
    const updated = [...props, { ...prop, id:uid() }]
    setProps(updated); onUpdate({ defaultProps:updated }); setAddingProp(false)
  }
  const removeProp = id => {
    const updated = props.filter(p => p.id!==id)
    setProps(updated); onUpdate({ defaultProps:updated })
  }
  const renameProp = (id, name) => {
    const updated = props.map(p => p.id===id ? { ...p, name } : p)
    setProps(updated); onUpdate({ defaultProps:updated })
  }

  return (
    <div className="anim-fadeup">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22, paddingBottom:14, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <EmojiPicker value={type.icon} onChange={ic => onUpdate({ icon: ic })} style={{ flexShrink:0 }} />
          <h2 style={{ fontFamily:"var(--font)", fontSize:18, color:'var(--text-primary,#f0f0f0)', fontWeight:500, margin:0 }}>{type.name}</h2>
          {isBuiltin && <span style={{ fontSize:10, color:'var(--text-dim,#5a5a5a)', background:'rgba(255,255,255,0.04)', padding:'2px 6px', borderRadius:4 }}>Intégré</span>}
        </div>
        {!BUILTIN_TYPES.some(t=>t.id===type.id) && (
          <button onClick={onDelete} style={{ background:'none', border:'none', color:'#5a3030', cursor:'pointer', fontSize:12 }}
            onMouseEnter={e=>e.currentTarget.style.color='#ef4444'} onMouseLeave={e=>e.currentTarget.style.color='#5a3030'}>
            <Icon name="trash" size={14} />
          </button>
        )}
      </div>

      {/* Propriétés */}
      <section style={{ marginBottom:26 }}>
        <h3 style={{ fontFamily:"var(--font)", fontSize:15, color:'var(--text-secondary,#c0c0c0)', marginBottom:12, fontWeight:500 }}>Propriétés par défaut</h3>
        {props.length===0 && !addingProp && <p style={{ color:'var(--text-darker,#2e2e2e)', fontSize:12, marginBottom:10 }}>Aucune propriété</p>}
        <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:8 }}>
          {props.map(p => <PropRow key={p.id} prop={p} allTypes={allTypes} onRename={n=>renameProp(p.id,n)} onRemove={()=>removeProp(p.id)}
            onEditProp={patch => { const updated = props.map(x => x.id===p.id ? { ...x, ...patch } : x); setProps(updated); onUpdate({ defaultProps:updated }) }} />)}
        </div>
        {addingProp
          ? <DropdownPropPicker allTypes={allTypes} onAdd={addProp} onCancel={() => setAddingProp(false)} />
          : <button onClick={() => setAddingProp(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 11px', width:'100%', background:'rgba(255,255,255,0.02)', border:'1px dashed rgba(255,255,255,0.07)', borderRadius:7, color:'var(--text-dark,#444444)', fontSize:12, cursor:'pointer', transition:'all 0.1s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(200,160,100,0.3)'; e.currentTarget.style.color='#c8a064' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; e.currentTarget.style.color='#444444' }}>
              <Icon name="plus" size={12} /> Ajouter une propriété
            </button>
        }
      </section>

      {/* Couleur */}
      <section>
        <h3 style={{ fontFamily:"var(--font)", fontSize:15, color:'var(--text-secondary,#c0c0c0)', marginBottom:12, fontWeight:500 }}>Couleur</h3>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:color, border:'2px solid rgba(255,255,255,0.1)' }} />
          <span style={{ fontSize:12, color:'var(--text-dim,#5a5a5a)' }}>{color}</span>
        </div>
        <ColorPicker value={color} onChange={c => { setColor(c); onUpdate({ color:c }) }} />
      </section>
    </div>
  )
}

// ─── PropRow — inline rename on click + type/emoji editing ────
function PropRow({ prop, allTypes, onRename, onRemove, onEditProp }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(prop.name)
  const [showTypePicker, setShowTypePicker] = useState(false)
  const pickerRef = useRef()
  const isRef    = prop.fieldType === FIELD_TYPES.CARD_REF
  const emoji    = prop.emoji
  const badge    = emoji || (isRef ? '🔗' : prop.fieldType==='number' ? '#' : prop.fieldType==='date' ? '📅' : 'T')
  const targets  = isRef && prop.targetTypeIds?.length
    ? prop.targetTypeIds.map(tid => allTypes.find(t=>t.id===tid)?.name||tid).join(', ')
    : null
  const commit = () => { if(draft.trim()&&draft.trim()!==prop.name) onRename(draft.trim()); else setDraft(prop.name); setEditing(false) }

  useEffect(() => {
    if (!showTypePicker) return
    const h = e => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowTypePicker(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [showTypePicker])

  const SCALARS = [
    { id:'text',   icon:'T',  label:'Texte',     color:'#8a8a8a' },
    { id:'number', icon:'#',  label:'Numérique', color:'#60a5fa' },
    { id:'date',   icon:'📅', label:'Date',      color:'#22c55e' },
  ]
  const creatableTypes = allTypes.filter(t => !t.virtual)
  const roots = creatableTypes.filter(t => !t.parentId)

  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 11px', background:'rgba(255,255,255,0.03)', borderRadius:7, border:'1px solid rgba(255,255,255,0.05)', position:'relative' }}>
      <span onClick={() => setShowTypePicker(v => !v)} title="Changer le type"
        style={{ fontSize:10, color:'var(--text-dark,#444444)', background: showTypePicker ? 'rgba(200,160,100,0.15)' : 'rgba(255,255,255,0.04)', padding:'1px 6px', borderRadius:3, flexShrink:0, cursor:'pointer', transition:'background 0.1s' }}>{badge}</span>
      {showTypePicker && (
        <div ref={pickerRef} style={{ position:'absolute', top:'100%', left:0, zIndex:600, marginTop:4, background:'rgba(10,6,1,0.92)', backdropFilter:'blur(40px) saturate(1.5)', WebkitBackdropFilter:'blur(40px) saturate(1.5)', border:'1px solid rgba(255,200,120,0.14)', borderRadius:12, overflow:'hidden', boxShadow:'0 8px 32px rgba(0,0,0,0.7)', width:220 }}>
          <div style={{ padding:'6px 10px 4px', fontSize:10, color:'var(--text-darker,#2e2e2e)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Type</div>
          {SCALARS.map(s => {
            const active = !isRef && prop.fieldType === s.id
            return <TypeMenuItem key={s.id} icon={s.icon} label={s.label} color={s.color} active={active}
              onClick={() => { onEditProp({ fieldType: s.id, targetTypeIds: undefined, multiple: false }); setShowTypePicker(false) }} />
          })}
          <div style={{ height:1, background:'rgba(255,255,255,0.05)', margin:'4px 8px' }} />
          <div style={{ padding:'4px 10px 2px', fontSize:10, color:'var(--text-darker,#2e2e2e)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Cartes</div>
          <div style={{ maxHeight:200, overflowY:'auto' }}>
            {roots.map(rt => {
              const children = creatableTypes.filter(t => t.parentId === rt.id)
              const active = isRef && prop.targetTypeIds?.includes(rt.id)
              return <React.Fragment key={rt.id}>
                <TypeMenuItem icon={rt.icon} label={rt.name} color={rt.color} active={active}
                  onClick={() => { onEditProp({ fieldType:'card_ref', targetTypeIds:[rt.id], multiple:true }); setShowTypePicker(false) }} />
                {children.map(ch => {
                  const chActive = isRef && prop.targetTypeIds?.includes(ch.id)
                  return <TypeMenuItem key={ch.id} icon={ch.icon} label={ch.name} color={ch.color} active={chActive} indent
                    onClick={() => { onEditProp({ fieldType:'card_ref', targetTypeIds:[ch.id], multiple:true }); setShowTypePicker(false) }} />
                })}
              </React.Fragment>
            })}
          </div>
          <div style={{ height:1, background:'rgba(255,255,255,0.05)', margin:'4px 8px' }} />
          <div style={{ padding:'4px 10px 2px', fontSize:10, color:'var(--text-darker,#2e2e2e)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Emoji</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:1, padding:'4px 8px 8px', maxHeight:100, overflowY:'auto' }}>
            {['T','#','📅','🔗','👤','📍','⚔️','💎','📅','📖','🌿','📜','🛡','🔮','✨','🌸'].map((em,i) => (
              <button key={i} onClick={() => { onEditProp({ emoji: em }); setShowTypePicker(false) }}
                style={{ background: prop.emoji===em ? 'rgba(200,160,100,0.2)' : 'transparent', border:'none', borderRadius:4, cursor:'pointer', fontSize:12, padding:'4px 0', color:'#c0c0c0', transition:'background 0.08s' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.08)'}
                onMouseLeave={e => { if(prop.emoji!==em) e.currentTarget.style.background='transparent' }}>
                {em}
              </button>
            ))}
          </div>
        </div>
      )}
      {editing
        ? <input autoFocus value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit}
            onKeyDown={e => { if(e.key==='Enter') commit(); if(e.key==='Escape') { setDraft(prop.name); setEditing(false) } }}
            style={{ flex:1, background:'transparent', border:'none', borderBottom:'1px solid rgba(200,160,100,0.4)', color:'var(--text-primary,#f0f0f0)', fontSize:12, outline:'none' }} />
        : <span onClick={() => setEditing(true)} title="Cliquer pour renommer"
            style={{ fontSize:12, flex:1, color:'var(--text-secondary,#c0c0c0)', cursor:'text' }}>{prop.name}</span>
      }
      {targets && <span style={{ fontSize:10, color:'var(--text-dim,#5a5a5a)', flexShrink:0 }}>→ {targets}</span>}
      {prop.multiple && <span style={{ fontSize:9, color:'var(--text-dark,#444444)', flexShrink:0 }}>×n</span>}
      <button onClick={onRemove} style={{ background:'none', border:'none', color:'var(--text-darker,#2e2e2e)', cursor:'pointer', padding:'0 2px', fontSize:10, lineHeight:1, flexShrink:0 }}
        onMouseEnter={e=>e.currentTarget.style.color='#ef4444'} onMouseLeave={e=>e.currentTarget.style.color='#2e2e2e'}>✕</button>
    </div>
  )
}

function TypeMenuItem({ icon, label, color, active, indent, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display:'flex', alignItems:'center', gap:8, padding:`5px 10px 5px ${indent ? 26 : 10}px`, cursor:'pointer', fontSize: indent ? 11 : 12, color: active ? 'var(--accent,#c8a064)' : 'var(--text-muted,#8a8a8a)', background: hov ? 'rgba(255,255,255,0.05)' : 'transparent', transition:'background 0.08s' }}>
      <span style={{ width:16, textAlign:'center', fontSize: indent ? 12 : 13, flexShrink:0 }}>{icon}</span>
      <span style={{ flex:1 }}>{label}</span>
      {active && <Icon name="check" size={10} style={{ color:'var(--accent,#c8a064)', flexShrink:0 }} />}
    </div>
  )
}

// ─── DropdownPropPicker — liste déroulante avec icônes ─────────
export function DropdownPropPicker({ allTypes, onAdd, onCancel }) {
  const [name,   setName]   = useState('')
  const [search, setSearch] = useState('')
  const ref = useRef()

  useEffect(() => {
    const h = e => { if(ref.current && !ref.current.contains(e.target)) onCancel() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onCancel])

  const SCALARS = [
    { id:'__text',   icon:'T',  label:'Texte',     ft:'text',     color:'var(--text-muted,#8a8a8a)' },
    { id:'__number', icon:'#',  label:'Numérique', ft:'number',   color:'#60a5fa' },
    { id:'__date',   icon:'📅', label:'Date',      ft:'date',     color:'#22c55e' },
  ]
  const creatableTypes = allTypes.filter(t => !t.virtual)
  // Build hierarchical list: roots followed by their children
  const orderedCardRows = []
  const roots = creatableTypes.filter(t => !t.parentId)
  roots.forEach(root => {
    orderedCardRows.push({ id:root.id, icon:root.icon, label:root.name, ft:'card_ref', color:root.color||'#8a8a8a', isCard:true })
    creatableTypes.filter(t => t.parentId === root.id).forEach(child => {
      orderedCardRows.push({ id:child.id, icon:child.icon, label:child.name, ft:'card_ref', color:child.color||'#8a8a8a', isCard:true, indent:true })
    })
  })
  const allRows = [
    ...SCALARS,
    ...orderedCardRows,
  ].filter(r => !search || r.label.toLowerCase().includes(search.toLowerCase()))

  const doAdd = row => {
    const propName = name.trim() || row.label
    onAdd({ name:propName, fieldType:row.ft, multiple:row.isCard||false, targetTypeIds: row.isCard?[row.id]:[] })
  }

  return (
    <div ref={ref} className="anim-slidedown" style={{ background:'rgba(8,4,0,0.85)', backdropFilter:'blur(40px) saturate(1.5)', WebkitBackdropFilter:'blur(40px) saturate(1.5)', border:'1px solid rgba(200,160,100,0.14)', borderRadius:14, overflow:'hidden', boxShadow:'0 8px 32px rgba(0,0,0,0.7)', marginBottom:6 }}>
      <div style={{ padding:'8px 10px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', gap:6 }}>
        <input autoFocus value={name} onChange={e=>setName(e.target.value)}
          onKeyDown={e => { if(e.key==='Escape') onCancel() }}
          placeholder="Nom de la propriété (optionnel)"
          style={{ flex:1, background:'transparent', border:'none', color:'var(--text-primary,#f0f0f0)', fontSize:13, outline:'none' }} />
      </div>
      <div style={{ padding:'5px 10px', borderBottom:'1px solid rgba(255,255,255,0.04)', position:'relative' }}>
        <Icon name="search" size={11} style={{ position:'absolute', left:19, top:'50%', transform:'translateY(-50%)', color:'var(--text-darker,#2e2e2e)' }} />
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filtrer les types…"
          style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'none', borderRadius:5, padding:'4px 8px 4px 22px', color:'var(--text-secondary,#c0c0c0)', fontSize:11, outline:'none' }} />
      </div>
      <div style={{ padding:'4px 12px 2px', fontSize:10, color:'var(--text-darker,#2e2e2e)', textTransform:'uppercase', letterSpacing:'0.07em' }}>TYPE</div>
      <div style={{ maxHeight:280, overflowY:'auto' }}>
        {allRows.map(row => (
          <div key={row.id} onClick={() => doAdd(row)}
            style={{ display:'flex', alignItems:'center', gap:10, padding:`8px 12px 8px ${row.indent ? 28 : 12}px`, cursor:'pointer', transition:'background 0.08s' }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <span style={{ width:20, textAlign:'center', fontSize: row.isCard ? (row.indent ? 13 : 15) : 13, color: row.isCard?undefined:row.color, flexShrink:0 }}>{row.icon}</span>
            <span style={{ fontSize: row.indent ? 12 : 13, color: row.indent ? 'var(--text-muted,#8a8a8a)' : 'var(--text-secondary,#c0c0c0)', flex:1 }}>{row.label}</span>
            {row.isCard && <span style={{ fontSize:10, color:'var(--text-darker,#2e2e2e)' }}>🔗</span>}
          </div>
        ))}
        {allRows.length===0 && <div style={{ padding:'10px 12px', fontSize:12, color:'var(--text-darker,#2e2e2e)' }}>Aucun résultat</div>}
      </div>
      <div style={{ padding:'5px 12px', borderTop:'1px solid rgba(255,255,255,0.04)' }}>
        <button onClick={onCancel} style={{ background:'none', border:'none', color:'var(--text-dark,#444444)', cursor:'pointer', fontSize:11 }}>Annuler</button>
      </div>
    </div>
  )
}

// ─── InlineNewType ────────────────────────────────────────────
function InlineNewType({ allTypes, onCancel, onCreate }) {
  const [name,     setName]     = useState('')
  const [icon,     setIcon]     = useState('📌')
  const [color,    setColor]    = useState('#c8a064')
  const [parentId, setParentId] = useState('')
  const creatableTypes = allTypes.filter(t => !t.virtual)
  return (
    <div className="anim-fadeup" style={{ maxWidth:560 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24, paddingBottom:16, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <EmojiPicker value={icon} onChange={setIcon} />
        <input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="Nom du nouveau type…"
          onKeyDown={e => { if(e.key==='Enter'&&name.trim()) onCreate({name:name.trim(),icon,color,parentId:parentId||null,defaultProps:[]}); if(e.key==='Escape') onCancel() }}
          style={{ flex:1, background:'transparent', border:'none', borderBottom:'1px solid rgba(200,160,100,0.3)', color:'var(--text-primary,#f0f0f0)', fontSize:22, fontFamily:"var(--font)", fontWeight:600, outline:'none', paddingBottom:4 }} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:22 }}>
        <div>
          <div style={{ fontSize:11, color:'var(--text-dark,#444444)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>Sous-type de</div>
          <select value={parentId} onChange={e=>setParentId(e.target.value)}
            style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:8, padding:'7px 10px', color:'var(--text-secondary,#c0c0c0)', fontSize:12, outline:'none', cursor:'pointer' }}>
            <option value="">— Type racine —</option>
            {creatableTypes.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize:11, color:'var(--text-dark,#444444)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>Couleur</div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:26, height:26, borderRadius:6, background:color, border:'2px solid rgba(255,255,255,0.1)', flexShrink:0 }} />
            <ColorPicker value={color} onChange={setColor} />
          </div>
        </div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <Btn variant="primary" disabled={!name.trim()} onClick={() => onCreate({name:name.trim(),icon,color,parentId:parentId||null,defaultProps:[]})}>Créer le type</Btn>
        <Btn variant="subtle" onClick={onCancel}>Annuler</Btn>
      </div>
    </div>
  )
}

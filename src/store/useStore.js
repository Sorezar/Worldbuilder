import { useState, useEffect, useCallback } from 'react'
import { BUILTIN_TYPES, getEffectiveProps } from '../data/types.js'

// Re-export theme data from dedicated config file
export { TITLE_FONTS, BODY_FONTS, GENRE_PRESETS, resolveTheme } from '../data/themes.js'

// ─── localStorage helpers ────────────────────────────────────
function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback }
  catch { return fallback }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// ─── Default world ───────────────────────────────────────────
const DEFAULT_WORLD = {
  id: 'world_1',
  name: 'Mon Monde',
  welcomeText: 'Chaque personnage devrait avoir une motivation, même les secondaires.',
  bgImage: 'https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?w=1600&q=80',
  accentColor: '#c8a064',
  bgColor: '#000000',
  fontTitle: 'Lora',
  fontBody: 'DM Sans',
  bgBrightness: 0.45,
  colorMode: 'night',
}

// IDs corrompus par l'ancien bug (v5e) : un preset écrasait l'id du monde
const PRESET_IDS = new Set(['f1','f2','f3','s1','s2','m1','m2','h1','h2','hi1','hi2'])

// ─── useStore hook ───────────────────────────────────────────
export function useStore() {
  // Multi-world support with migration from old single-world format
  const [worlds, setWorldsState] = useState(() => {
    const saved = load('wf_worlds', null)
    if (saved) {
      // Migration : si un monde a un ID de preset (bug v5e), on restaure l'ID d'origine
      const fixed = saved.map(w => {
        if (!PRESET_IDS.has(w.id)) return w
        // Trouver l'ID d'origine : si des données existent sous wf_world_1_*, c'était world_1
        const hasOldData = localStorage.getItem('wf_world_1_cards') !== null
        const restoredId = hasOldData ? 'world_1' : uid()
        return { ...w, id: restoredId }
      })
      const changed = fixed.some((w, i) => w.id !== saved[i].id)
      if (changed) save('wf_worlds', fixed)
      return fixed
    }
    const oldWorld = load('wf_world', DEFAULT_WORLD)
    if (!oldWorld.bgColor) oldWorld.bgColor = '#000000'
    return [oldWorld]
  })
  const [activeWorldId, setActiveWorldIdState] = useState(() => load('wf_active_world', null))

  // Resolve active world
  const resolvedWorldId = activeWorldId && worlds.find(w => w.id === activeWorldId) ? activeWorldId : worlds[0]?.id
  const world = worlds.find(w => w.id === resolvedWorldId) || DEFAULT_WORLD

  // Per-world data keys
  const dk = (suffix) => `wf_${resolvedWorldId}_${suffix}`
  // Fallback to old keys ONLY for the original world (migration from single-world format)
  const loadData = (suffix, oldKey) => {
    const perWorld = load(dk(suffix), null)
    if (perWorld !== null) return perWorld
    // Only fall back to old keys for the original default world
    if (resolvedWorldId === 'world_1') return load(oldKey, [])
    return []
  }

  const [cards,       setCardsState]       = useState(() => loadData('cards', 'wf_cards'))
  const [customTypes, setCustomTypesState] = useState(() => loadData('types', 'wf_types'))
  const [folders,     setFoldersState]     = useState(() => loadData('folders', 'wf_folders'))
  const [calendars,   setCalendarsState]   = useState(() => loadData('calendars', 'wf_calendars'))

  // Reload data when world changes
  useEffect(() => {
    setCardsState(loadData('cards', 'wf_cards'))
    setCustomTypesState(loadData('types', 'wf_types'))
    setFoldersState(loadData('folders', 'wf_folders'))
    setCalendarsState(loadData('calendars', 'wf_calendars'))
  }, [resolvedWorldId])

  // Persist worlds list
  const setWorlds = useCallback(updater => {
    setWorldsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      save('wf_worlds', next)
      return next
    })
  }, [])

  const setActiveWorldId = useCallback(id => {
    setActiveWorldIdState(id)
    save('wf_active_world', id)
  }, [])

  const setWorld = useCallback(v => {
    setWorlds(prev => prev.map(w => w.id === resolvedWorldId ? v : w))
  }, [resolvedWorldId, setWorlds])

  const createWorld = useCallback((data) => {
    const w = { id: uid(), name: 'Nouveau Monde', bgImage: '', accentColor: '#c8a064', bgColor: '#000000', ...data }
    setWorlds(prev => [...prev, w])
    return w
  }, [setWorlds])

  const deleteWorld = useCallback((id) => {
    if (worlds.length <= 1) return
    setWorlds(prev => prev.filter(w => w.id !== id))
    try {
      localStorage.removeItem(`wf_${id}_cards`)
      localStorage.removeItem(`wf_${id}_types`)
      localStorage.removeItem(`wf_${id}_folders`)
      localStorage.removeItem(`wf_${id}_calendars`)
    } catch {}
    if (resolvedWorldId === id) {
      const remaining = worlds.filter(w => w.id !== id)
      setActiveWorldId(remaining[0]?.id)
    }
  }, [worlds, resolvedWorldId, setWorlds, setActiveWorldId])

  const setCustomTypes = useCallback(updater => {
    setCustomTypesState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      save(dk('types'), next)
      return next
    })
  }, [resolvedWorldId])
  const setFolders = useCallback(v => { setFoldersState(v); save(dk('folders'), v) }, [resolvedWorldId])

  // ── Card CRUD ──────────────────────────────────────────────
  const createCard = useCallback((typeId, parentCardId = null, folderId = null) => {
    const allTypes = [...BUILTIN_TYPES, ...customTypes]
    const type = allTypes.find(t => t.id === typeId)
    const effectiveProps = getEffectiveProps(typeId, customTypes)
    const props = {}
    effectiveProps.forEach(p => { props[p.id] = p.multiple ? [] : '' })

    let data = undefined
    if (type?.viewMode === 'family_tree') data = { nodes: [], edges: [] }
    else if (type?.viewMode === 'map') data = { backgroundImage: '', zones: [], labels: [], layers: [{ id: uid(), name: 'Défaut', visible: true }] }
    else if (type?.viewMode === 'canvas') data = { elements: [], viewX: 0, viewY: 0, zoom: 1 }

    const card = {
      id: uid(), typeId,
      name: `Nouveau ${type?.name || 'Document'}`,
      image: '', text: '',
      props, extraProps: [], data,
      parentCardId, folderId, pinned: false,
      createdAt: Date.now(), updatedAt: Date.now(),
    }
    setCardsState(prev => { const next = [...prev, card]; save(dk('cards'), next); return next })
    return card
  }, [customTypes, resolvedWorldId])

  const updateCard = useCallback((id, patch) => {
    setCardsState(prev => { const next = prev.map(c => c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c); save(dk('cards'), next); return next })
  }, [resolvedWorldId])

  const deleteCard = useCallback((id) => {
    setCardsState(prev => {
      const next = prev
        .filter(c => c.id !== id)
        .map(c => {
          const props = { ...c.props }
          Object.keys(props).forEach(k => {
            if (Array.isArray(props[k])) props[k] = props[k].filter(v => v !== id)
            else if (props[k] === id) props[k] = ''
          })
          const extraProps = (c.extraProps || []).map(ep => {
            if (Array.isArray(ep.value)) return { ...ep, value: ep.value.filter(v => v !== id) }
            if (ep.value === id) return { ...ep, value: '' }
            return ep
          })
          return { ...c, props, extraProps }
        })
      save(dk('cards'), next); return next
    })
  }, [resolvedWorldId])

  const duplicateCard = useCallback((id) => {
    setCardsState(prev => {
      const source = prev.find(c => c.id === id)
      if (!source) return prev
      const clone = { ...JSON.parse(JSON.stringify(source)), id: uid(), name: source.name + ' (copie)', createdAt: Date.now(), updatedAt: Date.now() }
      const next = [...prev, clone]; save(dk('cards'), next); return next
    })
  }, [resolvedWorldId])

  // ── Type CRUD ──────────────────────────────────────────────
  const createCustomType = useCallback((data) => {
    const t = { id: uid(), ...data, defaultProps: data.defaultProps || [] }
    setCustomTypes(prev => [...(Array.isArray(prev) ? prev : []), t])
    return t
  }, [setCustomTypes])

  const updateCustomType = useCallback((id, patch) => {
    setCustomTypes(prev => (Array.isArray(prev) ? prev : []).map(t => t.id === id ? { ...t, ...patch } : t))
  }, [setCustomTypes])

  const deleteCustomType = useCallback((id) => {
    setCustomTypes(prev => (Array.isArray(prev) ? prev : []).filter(t => t.id !== id))
  }, [setCustomTypes])

  // ── Folder CRUD ────────────────────────────────────────────
  const createFolder = useCallback((name, parentFolderId = null) => {
    const f = { id: uid(), name, parentFolderId, createdAt: Date.now() }
    setFoldersState(prev => { const next = [...prev, f]; save(dk('folders'), next); return next })
    return f
  }, [resolvedWorldId])

  const updateFolder = useCallback((id, patch) => {
    setFoldersState(prev => { const next = prev.map(f => f.id === id ? { ...f, ...patch } : f); save(dk('folders'), next); return next })
  }, [resolvedWorldId])

  const deleteFolder = useCallback((id) => {
    setFoldersState(prev => { const next = prev.filter(f => f.id !== id); save(dk('folders'), next); return next })
    setCardsState(prev => { const next = prev.map(c => c.folderId === id ? { ...c, folderId: null } : c); save(dk('cards'), next); return next })
  }, [resolvedWorldId])

  // ── Calendar CRUD ──────────────────────────────────────────
  const createCalendar = useCallback((data) => {
    const cal = { id: uid(), ...data }
    setCalendarsState(prev => { const next = [...prev, cal]; save(dk('calendars'), next); return next })
    return cal
  }, [resolvedWorldId])
  const updateCalendar = useCallback((id, patch) => {
    setCalendarsState(prev => { const next = prev.map(c => c.id === id ? { ...c, ...patch } : c); save(dk('calendars'), next); return next })
  }, [resolvedWorldId])
  const deleteCalendar = useCallback((id) => {
    setCalendarsState(prev => { const next = prev.filter(c => c.id !== id); save(dk('calendars'), next); return next })
  }, [resolvedWorldId])

  return {
    world, setWorld, worlds, createWorld, deleteWorld,
    activeWorldId: resolvedWorldId, setActiveWorldId,
    cards, createCard, updateCard, deleteCard, duplicateCard,
    customTypes: Array.isArray(customTypes) ? customTypes : [],
    createCustomType, updateCustomType, deleteCustomType,
    folders, createFolder, updateFolder, deleteFolder,
    calendars, createCalendar, updateCalendar, deleteCalendar,
  }
}

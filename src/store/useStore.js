import { useState, useEffect, useCallback } from 'react'
import { BUILTIN_TYPES, getEffectiveProps } from '../data/types.js'

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
}

// ─── useStore hook ───────────────────────────────────────────
export function useStore() {
  const [world,       setWorldState]       = useState(() => load('wf_world', DEFAULT_WORLD))
  const [cards,       setCardsState]       = useState(() => load('wf_cards', []))
  const [customTypes, setCustomTypesState] = useState(() => load('wf_types', []))
  const [folders,     setFoldersState]     = useState(() => load('wf_folders', []))
  const [calendars,   setCalendarsState]   = useState(() => load('wf_calendars', []))

  // Persist on change
  const setWorld = useCallback(v => { setWorldState(v); save('wf_world', v) }, [])
  const setCustomTypes = useCallback(updater => {
    setCustomTypesState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      save('wf_types', next)
      return next
    })
  }, [])
  const setFolders = useCallback(v => { setFoldersState(v); save('wf_folders', v) }, [])

  // ── Card CRUD ──────────────────────────────────────────────
  const createCard = useCallback((typeId, parentCardId = null, folderId = null) => {
    const allTypes = [...BUILTIN_TYPES, ...customTypes]
    const type = allTypes.find(t => t.id === typeId)
    const effectiveProps = getEffectiveProps(typeId, customTypes)
    const props = {}
    effectiveProps.forEach(p => { props[p.id] = p.multiple ? [] : '' })

    const card = {
      id: uid(),
      typeId,
      name: `Nouveau ${type?.name || 'Document'}`,
      image: '',
      text: '',
      props, // { propId: value | value[] }
      extraProps: [], // user-added: [{ id, name, fieldType, multiple, value }]
      parentCardId,
      folderId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setCardsState(prev => {
      const next = [...prev, card]
      save('wf_cards', next)
      return next
    })
    return card
  }, [customTypes])

  const updateCard = useCallback((id, patch) => {
    setCardsState(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c)
      save('wf_cards', next)
      return next
    })
  }, [])

  const deleteCard = useCallback((id) => {
    setCardsState(prev => {
      // Remove card and update all refs
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
      save('wf_cards', next)
      return next
    })
  }, [])

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
    setFoldersState(prev => {
      const next = [...prev, f]
      save('wf_folders', next)
      return next
    })
    return f
  }, [])

  const updateFolder = useCallback((id, patch) => {
    setFoldersState(prev => {
      const next = prev.map(f => f.id === id ? { ...f, ...patch } : f)
      save('wf_folders', next)
      return next
    })
  }, [])

  const deleteFolder = useCallback((id) => {
    setFoldersState(prev => {
      const next = prev.filter(f => f.id !== id)
      save('wf_folders', next)
      return next
    })
    // Move cards out of folder
    setCardsState(prev => {
      const next = prev.map(c => c.folderId === id ? { ...c, folderId: null } : c)
      save('wf_cards', next)
      return next
    })
  }, [])

  // ── Calendar CRUD ──────────────────────────────────────────
  const createCalendar = useCallback((data) => {
    const cal = { id: uid(), ...data }
    setCalendarsState(prev => { const next = [...prev, cal]; save('wf_calendars', next); return next })
    return cal
  }, [])
  const updateCalendar = useCallback((id, patch) => {
    setCalendarsState(prev => { const next = prev.map(c => c.id === id ? { ...c, ...patch } : c); save('wf_calendars', next); return next })
  }, [])
  const deleteCalendar = useCallback((id) => {
    setCalendarsState(prev => { const next = prev.filter(c => c.id !== id); save('wf_calendars', next); return next })
  }, [])

  return {
    world, setWorld,
    cards, createCard, updateCard, deleteCard,
    customTypes: Array.isArray(customTypes) ? customTypes : [],
    createCustomType, updateCustomType, deleteCustomType,
    folders, createFolder, updateFolder, deleteFolder,
    calendars, createCalendar, updateCalendar, deleteCalendar,
  }
}

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

// ─── Font presets ────────────────────────────────────────────
export const TITLE_FONTS = [
  { id: 'Lora',                css: "'Lora', serif",                label: 'Lora'                },
  { id: 'Cinzel',              css: "'Cinzel', serif",              label: 'Cinzel'              },
  { id: 'EB Garamond',         css: "'EB Garamond', serif",         label: 'EB Garamond'         },
  { id: 'Playfair Display',    css: "'Playfair Display', serif",    label: 'Playfair Display'    },
  { id: 'Cormorant Garamond',  css: "'Cormorant Garamond', serif",  label: 'Cormorant Garamond'  },
  { id: 'Crimson Text',        css: "'Crimson Text', serif",        label: 'Crimson Text'        },
  { id: 'Libre Baskerville',   css: "'Libre Baskerville', serif",   label: 'Libre Baskerville'   },
]

export const BODY_FONTS = [
  { id: 'DM Sans',       css: "'DM Sans', sans-serif",    label: 'DM Sans'      },
  { id: 'Inter',         css: "'Inter', sans-serif",      label: 'Inter'        },
  { id: 'Space Grotesk', css: "'Space Grotesk', sans-serif", label: 'Space Grotesk' },
  { id: 'Space Mono',    css: "'Space Mono', monospace",  label: 'Space Mono'   },
  { id: 'Georgia',       css: 'Georgia, serif',           label: 'Georgia', system: true },
  { id: 'Nunito',        css: "'Nunito', sans-serif",     label: 'Nunito'       },
  { id: 'Source Sans 3', css: "'Source Sans 3', sans-serif", label: 'Source Sans 3' },
]

// ─── Genre presets ───────────────────────────────────────────
export const GENRE_PRESETS = {
  popular: {
    label: 'Les plus populaires', icon: '⭐',
    presets: [
      { name:'Parchemin',       bgImage:'https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?w=1600&q=80', theme:'warm',   fontTitle:'Lora',               fontBody:'DM Sans',       bgBrightness:0.45, colorMode:'night' },
      { name:'Givre',           bgImage:'https://images.unsplash.com/photo-1418985991508-e47386d96a71?w=1600&q=80', theme:'cold',   fontTitle:'Inter',              fontBody:'Inter',         bgBrightness:0.40, colorMode:'night' },
      { name:'80s Nostalgia',   bgImage:'https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?w=1600&q=80', theme:'purple', fontTitle:'Cinzel',             fontBody:'Space Grotesk', bgBrightness:0.35, colorMode:'night' },
      { name:'Sylvestre',       bgImage:'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&q=80', theme:'green',  fontTitle:'Lora',               fontBody:'Nunito',        bgBrightness:0.40, colorMode:'night' },
      { name:'Cosmos',          bgImage:'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?w=1600&q=80', theme:'midnight', fontTitle:'Space Grotesk',     fontBody:'Space Mono',    bgBrightness:0.40, colorMode:'night' },
      { name:'Braise',          bgImage:'https://images.unsplash.com/photo-1462275646964-a0e3c11f18a6?w=1600&q=80', theme:'ember',  fontTitle:'Cinzel',             fontBody:'DM Sans',       bgBrightness:0.35, colorMode:'night' },
    ],
  },
  fantasy: {
    label: 'Fantasy', icon: '⚔️',
    presets: [
      { name:'Parchemin',       bgImage:'https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?w=1600&q=80', theme:'warm',   fontTitle:'Lora',               fontBody:'DM Sans',       bgBrightness:0.45, colorMode:'night' },
      { name:'Forêt Profonde',  bgImage:'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&q=80', theme:'green',  fontTitle:'Lora',               fontBody:'Inter',         bgBrightness:0.38, colorMode:'night' },
      { name:'Mystique',        bgImage:'https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?w=1600&q=80', theme:'purple', fontTitle:'Cinzel',             fontBody:'Crimson Text',  bgBrightness:0.35, colorMode:'night' },
      { name:'Haut Royaume',    bgImage:'https://images.unsplash.com/photo-1462332420958-a05d1e002413?w=1600&q=80', theme:'warm',   fontTitle:'Cormorant Garamond', fontBody:'DM Sans',       bgBrightness:0.50, colorMode:'night' },
      { name:'Montagne Sacrée', bgImage:'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80', theme:'cold',   fontTitle:'Cinzel',             fontBody:'Nunito',        bgBrightness:0.42, colorMode:'night' },
      { name:'Forêt Elfique',   bgImage:'https://images.unsplash.com/photo-1425913397330-cf8af2ff40a1?w=1600&q=80', theme:'green',  fontTitle:'Cormorant Garamond', fontBody:'Crimson Text',  bgBrightness:0.35, colorMode:'night' },
      { name:'Citadelle',       bgImage:'https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?w=1600&q=80', theme:'warm',   fontTitle:'EB Garamond',        fontBody:'DM Sans',       bgBrightness:0.45, colorMode:'night' },
      { name:'Rose Sombre',     bgImage:'https://images.unsplash.com/photo-1542273917363-1f3e5ce0b0e8?w=1600&q=80', theme:'rose',   fontTitle:'Playfair Display',   fontBody:'Crimson Text',  bgBrightness:0.30, colorMode:'night' },
    ],
  },
  scifi: {
    label: 'Sci-fi', icon: '🚀',
    presets: [
      { name:'Cosmos',          bgImage:'https://images.unsplash.com/photo-1462332420958-a05d1e002413?w=1600&q=80', theme:'cold',   fontTitle:'Space Grotesk',      fontBody:'Space Mono',    bgBrightness:0.40, colorMode:'night' },
      { name:'Néon',            bgImage:'https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?w=1600&q=80', theme:'purple', fontTitle:'Inter',              fontBody:'Space Mono',    bgBrightness:0.30, colorMode:'night' },
      { name:'Station',         bgImage:'https://images.unsplash.com/photo-1418985991508-e47386d96a71?w=1600&q=80', theme:'cold',   fontTitle:'Inter',              fontBody:'Space Grotesk', bgBrightness:0.45, colorMode:'night' },
      { name:'Nébuleuse',       bgImage:'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?w=1600&q=80', theme:'purple', fontTitle:'Space Grotesk',      fontBody:'Space Mono',    bgBrightness:0.35, colorMode:'night' },
      { name:'Deep Space',      bgImage:'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=1600&q=80', theme:'midnight', fontTitle:'Inter',            fontBody:'Space Grotesk', bgBrightness:0.40, colorMode:'night' },
      { name:'Cyber Ville',     bgImage:'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1600&q=80', theme:'purple', fontTitle:'Space Grotesk',        fontBody:'Space Mono',    bgBrightness:0.30, colorMode:'night' },
    ],
  },
  modern: {
    label: 'Moderne', icon: '🏙️',
    presets: [
      { name:'Urbain',          bgImage:'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1600&q=80', theme:'cold',   fontTitle:'Inter',              fontBody:'Inter',         bgBrightness:0.55, colorMode:'smart' },
      { name:'Café',            bgImage:'https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?w=1600&q=80', theme:'warm',   fontTitle:'Playfair Display',   fontBody:'Source Sans 3', bgBrightness:0.55, colorMode:'night' },
      { name:'Bureau',          bgImage:'https://images.unsplash.com/photo-1418985991508-e47386d96a71?w=1600&q=80', theme:'cold',   fontTitle:'Space Grotesk',      fontBody:'DM Sans',       bgBrightness:0.60, colorMode:'smart' },
      { name:'Métropole',       bgImage:'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1600&q=80', theme:'midnight', fontTitle:'Inter',            fontBody:'DM Sans',       bgBrightness:0.40, colorMode:'night' },
      { name:'Côtier',          bgImage:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80', theme:'cold',   fontTitle:'Playfair Display',   fontBody:'Nunito',        bgBrightness:0.55, colorMode:'smart' },
      { name:'Minimal',         bgImage:'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1600&q=80', theme:'sand',   fontTitle:'Inter',              fontBody:'Source Sans 3', bgBrightness:0.50, colorMode:'night' },
    ],
  },
  horror: {
    label: 'Horreur', icon: '💀',
    presets: [
      { name:'Ténèbres',        bgImage:'https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?w=1600&q=80', theme:'purple', fontTitle:'Libre Baskerville',  fontBody:'DM Sans',       bgBrightness:0.20, colorMode:'night' },
      { name:'Brouillard',      bgImage:'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&q=80', theme:'green',  fontTitle:'Libre Baskerville',  fontBody:'Crimson Text',  bgBrightness:0.22, colorMode:'night' },
      { name:'Crypte',          bgImage:'https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?w=1600&q=80', theme:'warm',   fontTitle:'Cinzel',             fontBody:'Georgia',       bgBrightness:0.18, colorMode:'night' },
      { name:'Abîme',           bgImage:'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1600&q=80', theme:'midnight', fontTitle:'Libre Baskerville', fontBody:'Georgia',       bgBrightness:0.15, colorMode:'night' },
      { name:'Sang',            bgImage:'https://images.unsplash.com/photo-1532767153582-b1a0e5145009?w=1600&q=80', theme:'ember',  fontTitle:'Cinzel',             fontBody:'Crimson Text',  bgBrightness:0.18, colorMode:'night' },
      { name:'Rose Fané',       bgImage:'https://images.unsplash.com/photo-1542273917363-1f3e5ce0b0e8?w=1600&q=80', theme:'rose',   fontTitle:'Libre Baskerville',  fontBody:'Georgia',       bgBrightness:0.20, colorMode:'night' },
    ],
  },
  historical: {
    label: 'Historique', icon: '🏛️',
    presets: [
      { name:'Renaissance',     bgImage:'https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?w=1600&q=80', theme:'warm',   fontTitle:'EB Garamond',        fontBody:'Crimson Text',  bgBrightness:0.50, colorMode:'night' },
      { name:'Antiquité',       bgImage:'https://images.unsplash.com/photo-1462332420958-a05d1e002413?w=1600&q=80', theme:'warm',   fontTitle:'Cormorant Garamond', fontBody:'Georgia',       bgBrightness:0.45, colorMode:'night' },
      { name:'Manuscrit',       bgImage:'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1600&q=80', theme:'warm',   fontTitle:'Playfair Display',   fontBody:'Source Sans 3', bgBrightness:0.50, colorMode:'night' },
      { name:'Désert Ancien',   bgImage:'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=1600&q=80', theme:'sand',   fontTitle:'Cinzel',             fontBody:'Crimson Text',  bgBrightness:0.50, colorMode:'night' },
      { name:'Forteresse',      bgImage:'https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?w=1600&q=80', theme:'warm',   fontTitle:'EB Garamond',        fontBody:'Georgia',       bgBrightness:0.45, colorMode:'night' },
      { name:'Vieux Monde',     bgImage:'https://images.unsplash.com/photo-1524946274118-e7680e33ccc5?w=1600&q=80', theme:'sand',   fontTitle:'Cormorant Garamond', fontBody:'Crimson Text',  bgBrightness:0.48, colorMode:'night' },
    ],
  },
}

// ─── Default world ───────────────────────────────────────────
const DEFAULT_WORLD = {
  id: 'world_1',
  name: 'Mon Monde',
  welcomeText: 'Chaque personnage devrait avoir une motivation, même les secondaires.',
  bgImage: 'https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?w=1600&q=80',
  accentColor: '#c8a064',
  theme: 'warm',
  fontTitle: 'Lora',
  fontBody: 'DM Sans',
  bgBrightness: 0.45,
  colorMode: 'night',
}

// ─── Themes ──────────────────────────────────────────────────
export const THEMES = {
  warm: {
    id: 'warm', name: 'Parchemin', icon: '☀️',
    font: "'Lora', serif", fontBody: "'DM Sans', sans-serif",
    accent: '#c8a064', accentLight: 'rgba(200,160,100,',
    textPrimary: '#f0e6d3', textSecondary: '#c8b89a', textMuted: '#9a8a70', textDim: '#5a4a38', textDark: '#4a3a28', textDarker: '#3a2a18',
    bgBase: 'rgba(6,3,0,', bgPanel: 'rgba(10,6,1,', bgOverlay: 'rgba(5,2,0,',
    borderColor: 'rgba(255,200,120,', defaultBg: 'linear-gradient(145deg,#1c1408,#0e0b06)',
  },
  cold: {
    id: 'cold', name: 'Givre', icon: '❄️',
    font: "'Lora', serif", fontBody: "'DM Sans', sans-serif",
    accent: '#64a0c8', accentLight: 'rgba(100,160,200,',
    textPrimary: '#d3e6f0', textSecondary: '#9abcc8', textMuted: '#708a9a', textDim: '#38505a', textDark: '#28404a', textDarker: '#182a3a',
    bgBase: 'rgba(0,3,6,', bgPanel: 'rgba(1,6,10,', bgOverlay: 'rgba(0,2,5,',
    borderColor: 'rgba(120,180,255,', defaultBg: 'linear-gradient(145deg,#08141c,#060b0e)',
  },
  purple: {
    id: 'purple', name: 'Mystique', icon: '🔮',
    font: "'Lora', serif", fontBody: "'DM Sans', sans-serif",
    accent: '#a87bdb', accentLight: 'rgba(168,123,219,',
    textPrimary: '#e6d8f0', textSecondary: '#b89ac8', textMuted: '#8a709a', textDim: '#5a3870', textDark: '#4a2860', textDarker: '#3a1850',
    bgBase: 'rgba(4,0,6,', bgPanel: 'rgba(8,1,12,', bgOverlay: 'rgba(3,0,5,',
    borderColor: 'rgba(180,120,255,', defaultBg: 'linear-gradient(145deg,#14081c,#0b060e)',
  },
  green: {
    id: 'green', name: 'Sylvestre', icon: '🌿',
    font: "'Lora', serif", fontBody: "'DM Sans', sans-serif",
    accent: '#6ab87a', accentLight: 'rgba(106,184,122,',
    textPrimary: '#d8f0dc', textSecondary: '#9ac8a0', textMuted: '#70a07a', textDim: '#385a40', textDark: '#284a30', textDarker: '#183a20',
    bgBase: 'rgba(0,4,1,', bgPanel: 'rgba(1,8,2,', bgOverlay: 'rgba(0,3,1,',
    borderColor: 'rgba(120,220,140,', defaultBg: 'linear-gradient(145deg,#081c0a,#060e07)',
  },
  rose: {
    id: 'rose', name: 'Rose', icon: '🌹',
    font: "'Lora', serif", fontBody: "'DM Sans', sans-serif",
    accent: '#d4768a', accentLight: 'rgba(212,118,138,',
    textPrimary: '#f0dce2', textSecondary: '#c89aa8', textMuted: '#9a7080', textDim: '#5a3845', textDark: '#4a2835', textDarker: '#3a1828',
    bgBase: 'rgba(6,0,2,', bgPanel: 'rgba(10,1,4,', bgOverlay: 'rgba(5,0,2,',
    borderColor: 'rgba(255,140,170,', defaultBg: 'linear-gradient(145deg,#1c0810,#0e060a)',
  },
  ember: {
    id: 'ember', name: 'Braise', icon: '🔥',
    font: "'Lora', serif", fontBody: "'DM Sans', sans-serif",
    accent: '#e07040', accentLight: 'rgba(224,112,64,',
    textPrimary: '#f0e0d3', textSecondary: '#c8a08a', textMuted: '#9a7a60', textDim: '#5a4030', textDark: '#4a3020', textDarker: '#3a2018',
    bgBase: 'rgba(6,2,0,', bgPanel: 'rgba(12,4,1,', bgOverlay: 'rgba(5,1,0,',
    borderColor: 'rgba(255,160,100,', defaultBg: 'linear-gradient(145deg,#1c0c04,#0e0804)',
  },
  midnight: {
    id: 'midnight', name: 'Minuit', icon: '🌑',
    font: "'Lora', serif", fontBody: "'DM Sans', sans-serif",
    accent: '#7a8cc8', accentLight: 'rgba(122,140,200,',
    textPrimary: '#d8ddf0', textSecondary: '#9aa4c8', textMuted: '#6a749a', textDim: '#3a4060', textDark: '#2a3050', textDarker: '#1a2040',
    bgBase: 'rgba(1,1,4,', bgPanel: 'rgba(3,3,8,', bgOverlay: 'rgba(1,1,3,',
    borderColor: 'rgba(120,140,220,', defaultBg: 'linear-gradient(145deg,#0a0c1c,#06070e)',
  },
  sand: {
    id: 'sand', name: 'Sable', icon: '🏜️',
    font: "'Lora', serif", fontBody: "'DM Sans', sans-serif",
    accent: '#b8a070', accentLight: 'rgba(184,160,112,',
    textPrimary: '#ece4d4', textSecondary: '#c0b498', textMuted: '#8a8068', textDim: '#504838', textDark: '#403828', textDarker: '#302820',
    bgBase: 'rgba(4,3,1,', bgPanel: 'rgba(8,6,2,', bgOverlay: 'rgba(3,2,1,',
    borderColor: 'rgba(200,180,130,', defaultBg: 'linear-gradient(145deg,#181408,#0e0c06)',
  },
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
    if (!oldWorld.theme) oldWorld.theme = 'warm'
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
    const w = { id: uid(), name: 'Nouveau Monde', bgImage: '', accentColor: '#c8a064', theme: 'warm', ...data }
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

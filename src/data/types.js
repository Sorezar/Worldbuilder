// ─── Property field types ────────────────────────────────────
export const FIELD_TYPES = {
  TEXT: 'text',
  NUMBER: 'number',
  CARD_REF: 'card_ref',      // reference to one or many cards
  TOGGLE: 'toggle',
  DATE: 'date',
  SELECT: 'select',
}

// ─── Built-in type hierarchy ─────────────────────────────────
// Each type: { id, name, icon, color, parentId?, defaultProps[] }
// defaultProps: { id, name, fieldType, multiple?, targetTypeIds? }

export const BUILTIN_TYPES = [
  // ── Special / virtual ──
  {
    id: 'text_field', name: 'Texte', icon: '☰', color: '#8a8a8a',
    virtual: true, // not creatable as standalone card
    defaultProps: [],
  },
  {
    id: 'number_field', name: 'Numérique', icon: '#', color: '#60a5fa',
    virtual: true,
    defaultProps: [],
  },

  // ── Character ──
  {
    id: 'character', name: 'Character', icon: '👤', color: '#c084fc',
    defaultProps: [
      { id: 'aliases', name: 'Aliases', fieldType: FIELD_TYPES.TEXT, multiple: true },
      { id: 'faction', name: 'Faction', fieldType: FIELD_TYPES.CARD_REF, multiple: true, targetTypeIds: ['faction'] },
      { id: 'location', name: 'Location', fieldType: FIELD_TYPES.CARD_REF, multiple: false, targetTypeIds: ['location'] },
    ],
  },

  // ── Location ──
  {
    id: 'location', name: 'Location', icon: '📍', color: '#f59e0b',
    defaultProps: [],
  },
  { id: 'kingdom', name: 'Kingdom', icon: '👑', color: '#f59e0b', parentId: 'location', defaultProps: [] },
  { id: 'city', name: 'City', icon: '🏙', color: '#fbbf24', parentId: 'location', defaultProps: [] },
  { id: 'hamlet', name: 'Hamlet', icon: '🏡', color: '#fcd34d', parentId: 'location', defaultProps: [] },
  { id: 'dungeon', name: 'Dungeon', icon: '🏰', color: '#d97706', parentId: 'location', defaultProps: [] },
  { id: 'landmark', name: 'Landmark', icon: '🗿', color: '#92400e', parentId: 'location', defaultProps: [] },

  // ── Faction ──
  {
    id: 'faction', name: 'Faction', icon: '⚔️', color: '#ef4444',
    defaultProps: [
      { id: 'leader', name: 'Leader', fieldType: FIELD_TYPES.CARD_REF, multiple: false, targetTypeIds: ['character'] },
      { id: 'base', name: 'Base', fieldType: FIELD_TYPES.CARD_REF, multiple: false, targetTypeIds: ['location'] },
    ],
  },
  { id: 'guild', name: 'Guild', icon: '🛡', color: '#ef4444', parentId: 'faction', defaultProps: [] },
  { id: 'order', name: 'Order', icon: '⚜️', color: '#dc2626', parentId: 'faction', defaultProps: [] },
  { id: 'cult', name: 'Cult', icon: '🔮', color: '#7f1d1d', parentId: 'faction', defaultProps: [] },
  { id: 'noble_house', name: 'Noble House', icon: '🏛', color: '#b91c1c', parentId: 'faction', defaultProps: [] },
  { id: 'tribe', name: 'Tribe', icon: '🪶', color: '#991b1b', parentId: 'faction', defaultProps: [] },

  // ── Item ──
  {
    id: 'item', name: 'Item', icon: '💎', color: '#06b6d4',
    defaultProps: [
      { id: 'owner', name: 'Owner', fieldType: FIELD_TYPES.CARD_REF, multiple: true, targetTypeIds: ['character'] },
    ],
  },
  { id: 'weapon', name: 'Weapon', icon: '⚔️', color: '#0891b2', parentId: 'item', defaultProps: [] },
  { id: 'armor', name: 'Armor', icon: '🛡', color: '#0e7490', parentId: 'item', defaultProps: [] },
  { id: 'artifact', name: 'Artifact', icon: '✨', color: '#155e75', parentId: 'item', defaultProps: [] },
  { id: 'potion', name: 'Potion', icon: '⚗️', color: '#164e63', parentId: 'item', defaultProps: [] },
  { id: 'spell', name: 'Spell', icon: '🌀', color: '#0c4a6e', parentId: 'item', defaultProps: [] },

  // ── Event ──
  {
    id: 'event', name: 'Event', icon: '📅', color: '#22c55e',
    defaultProps: [
      { id: 'participants', name: 'Participants', fieldType: FIELD_TYPES.CARD_REF, multiple: true, targetTypeIds: ['character'] },
      { id: 'location', name: 'Location', fieldType: FIELD_TYPES.CARD_REF, multiple: false, targetTypeIds: ['location'] },
      { id: 'date', name: 'Date', fieldType: FIELD_TYPES.DATE, multiple: false },
    ],
  },
  { id: 'quest', name: 'Quest', icon: '📜', color: '#16a34a', parentId: 'event', defaultProps: [] },
  { id: 'battle', name: 'Battle', icon: '⚔️', color: '#15803d', parentId: 'event', defaultProps: [] },
  { id: 'festival', name: 'Festival', icon: '🎉', color: '#166534', parentId: 'event', defaultProps: [] },
  { id: 'prophecy', name: 'Prophecy', icon: '🔭', color: '#14532d', parentId: 'event', defaultProps: [] },
  { id: 'coronation', name: 'Coronation', icon: '👑', color: '#052e16', parentId: 'event', defaultProps: [] },

  // ── Lore ──
  {
    id: 'lore', name: 'Lore', icon: '📖', color: '#a78bfa',
    defaultProps: [],
  },
  { id: 'legend', name: 'Legend', icon: '📜', color: '#7c3aed', parentId: 'lore', defaultProps: [] },
  { id: 'magic_system', name: 'Magic System', icon: '✨', color: '#6d28d9', parentId: 'lore', defaultProps: [] },
  { id: 'religion', name: 'Religion', icon: '⛩', color: '#5b21b6', parentId: 'lore', defaultProps: [] },
  { id: 'history', name: 'History', icon: '🏛', color: '#4c1d95', parentId: 'lore', defaultProps: [] },

  // ── Ecology ──
  {
    id: 'ecology', name: 'Ecology', icon: '🌿', color: '#84cc16',
    defaultProps: [],
  },
  { id: 'flora', name: 'Flora', icon: '🌸', color: '#65a30d', parentId: 'ecology', defaultProps: [] },
  { id: 'fauna', name: 'Fauna', icon: '🦎', color: '#4d7c0f', parentId: 'ecology', defaultProps: [] },

  // ── Special views (virtual = not in Nouveau menu) ──
  {
    id: 'family_tree', name: 'Arbre Généalogique', icon: '🌳', color: '#a78bfa',
    virtual: true, viewMode: 'family_tree', defaultProps: [],
  },
  {
    id: 'geo_map', name: 'Carte Géographique', icon: '🗺', color: '#f59e0b',
    virtual: true, viewMode: 'map', defaultProps: [],
  },
  {
    id: 'canvas', name: 'Canvas', icon: '🎨', color: '#06b6d4',
    virtual: true, viewMode: 'canvas', defaultProps: [],
  },
]

export const BUILTIN_TYPE_MAP = Object.fromEntries(BUILTIN_TYPES.map(t => [t.id, t]))

// Get all creatable types (non-virtual)
export function getCreatableTypes(customTypes = []) {
  return [...BUILTIN_TYPES.filter(t => !t.virtual), ...customTypes]
}

// Get type by id (custom shadow overrides take priority over builtins)
export function getType(typeId, customTypes = []) {
  return customTypes.find(t => t.id === typeId) || BUILTIN_TYPE_MAP[typeId] || null
}

// Get all ancestors of a type
export function getTypeAncestors(typeId, customTypes = []) {
  const allTypes = [...BUILTIN_TYPES, ...customTypes]
  const typeMap = Object.fromEntries(allTypes.map(t => [t.id, t]))
  const ancestors = []
  let current = typeMap[typeId]
  while (current?.parentId) {
    current = typeMap[current.parentId]
    if (current) ancestors.unshift(current)
  }
  return ancestors
}

// Get children of a type
export function getTypeChildren(typeId, customTypes = []) {
  const allTypes = [...BUILTIN_TYPES, ...customTypes]
  return allTypes.filter(t => t.parentId === typeId)
}

// Check if typeId is a descendant of parentTypeId
export function isDescendantOf(typeId, parentTypeId, customTypes = []) {
  if (typeId === parentTypeId) return true
  const allTypes = [...BUILTIN_TYPES, ...customTypes]
  const typeMap = Object.fromEntries(allTypes.map(t => [t.id, t]))
  let current = typeMap[typeId]
  while (current?.parentId) {
    if (current.parentId === parentTypeId) return true
    current = typeMap[current.parentId]
  }
  return false
}

// Get top-level types (no parent) that are creatable
export function getRootTypes(customTypes = []) {
  return [...BUILTIN_TYPES.filter(t => !t.virtual && !t.parentId), ...customTypes.filter(t => !t.parentId)]
}

// Build effective properties for a card type (merge parent defaults + own)
export function getEffectiveProps(typeId, customTypes = []) {
  const allTypes = [...BUILTIN_TYPES, ...customTypes]
  const typeMap = Object.fromEntries(allTypes.map(t => [t.id, t]))
  const chain = []
  let current = typeMap[typeId]
  while (current) {
    chain.unshift(current)
    current = current.parentId ? typeMap[current.parentId] : null
  }
  const props = []
  const seen = new Set()
  for (const t of chain) {
    for (const p of (t.defaultProps || [])) {
      if (!seen.has(p.id)) { props.push(p); seen.add(p.id) }
    }
  }
  return props
}

import { uid } from '../store/useStore.js'

// ─── Grid constants ─────────────────────────────────────────
export const COLS = 32
export const ROW_H = 48
export const GAP = 6

// ─── Widget type catalog ────────────────────────────────────
export const WIDGET_TYPES = [
  { id: 'properties', name: 'Propriétés',       icon: '☰',  minW: 10, minH: 2, defaultW: 16, defaultH: 5 },
  { id: 'text',       name: 'Texte',            icon: 'T',  minW: 8,  minH: 2, defaultW: 32, defaultH: 4 },
  { id: 'image',      name: 'Image',            icon: '🖼', minW: 4,  minH: 2, defaultW: 10, defaultH: 3 },
  { id: 'chart',      name: 'Graphique',        icon: '📊', minW: 10, minH: 3, defaultW: 16, defaultH: 4 },
  { id: 'map',        name: 'Carte géo',        icon: '🗺', minW: 8,  minH: 3, defaultW: 16, defaultH: 4 },
  { id: 'family_tree', name: 'Arbre généalogique', icon: '🌳', minW: 10, minH: 3, defaultW: 16, defaultH: 4 },
]

// ─── Default layout reproducing current CardWindow ──────────
export const DEFAULT_CARD_LAYOUT = [
  { id: '_img',   type: 'image',      x: 22, y: 0, w: 10, h: 3, config: { fit: 'cover' } },
  { id: '_props', type: 'properties', x: 0,  y: 0, w: 22, h: 5, config: { propIds: 'all' } },
  { id: '_text',  type: 'text',       x: 0,  y: 5, w: 32, h: 4, config: {} },
]

// ─── Resolve layout for a given card + type ─────────────────
export function resolveLayout(card, type) {
  if (card.layout) return card.layout
  if (type?.defaultLayout) return type.defaultLayout
  return DEFAULT_CARD_LAYOUT
}

// ─── Create a new widget with defaults ──────────────────────
export function createWidget(typeId, layout) {
  const wt = WIDGET_TYPES.find(t => t.id === typeId)
  if (!wt) return null
  const maxY = layout.reduce((max, w) => Math.max(max, w.y + w.h), 0)
  return {
    id: uid(),
    type: typeId,
    x: 0, y: maxY,
    w: wt.defaultW, h: wt.defaultH,
    config: typeId === 'properties' ? { propIds: 'all' } : {},
  }
}

// ─── Collision helpers ──────────────────────────────────────
function overlaps(a, b) {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x ||
           a.y + a.h <= b.y || b.y + b.h <= a.y)
}

// Android-style push: moved widget keeps its position, others get pushed down
// Then gravity pulls everything up to eliminate empty rows
export function resolveCollisions(layout, movedId) {
  const moved = layout.find(w => w.id === movedId)
  if (!moved) return layout
  const others = layout.filter(w => w.id !== movedId)
    .map(w => ({ ...w }))
    .sort((a, b) => a.y - b.y || a.x - b.x)

  const settled = [{ ...moved }]

  for (const widget of others) {
    let w = { ...widget }
    let tries = 30
    let collision = true
    while (collision && tries-- > 0) {
      collision = false
      for (const s of settled) {
        if (overlaps(w, s)) {
          w = { ...w, y: s.y + s.h }
          collision = true
          break
        }
      }
    }
    settled.push(w)
  }

  // Gravity: pull non-moved widgets upward
  return applyGravity(settled, movedId)
}

// Pull all widgets (except the actively moved one) up to the highest valid y
function applyGravity(layout, skipId) {
  const result = layout.map(w => ({ ...w }))
  // Sort by y so we compact top-down
  const sorted = result
    .filter(w => w.id !== skipId)
    .sort((a, b) => a.y - b.y || a.x - b.x)
  const anchor = result.find(w => w.id === skipId)

  for (const widget of sorted) {
    let bestY = 0
    // Try every y from 0 up to current position
    for (let tryY = 0; tryY <= widget.y; tryY++) {
      const test = { ...widget, y: tryY }
      let blocked = false
      // Check against anchor (moved widget)
      if (anchor && overlaps(test, anchor)) { blocked = true }
      // Check against all other already-compacted widgets
      if (!blocked) {
        for (const other of sorted) {
          if (other.id === widget.id) continue
          if (other.y + other.h <= tryY) continue // above, no issue
          if (overlaps(test, other)) { blocked = true; break }
        }
      }
      if (!blocked) { bestY = tryY; break }
    }
    widget.y = bestY
  }

  return result
}

// ─── 8-point resize handles ────────────────────────────────
const DOT = 8
export const RESIZE_HANDLES = [
  { id: 'n',  edges: { top: true }, cursor: 'n-resize',  style: { top: -DOT/2, left: '50%', transform: 'translateX(-50%)' } },
  { id: 's',  edges: { bottom: true }, cursor: 's-resize',  style: { bottom: -DOT/2, left: '50%', transform: 'translateX(-50%)' } },
  { id: 'e',  edges: { right: true }, cursor: 'e-resize',  style: { right: -DOT/2, top: '50%', transform: 'translateY(-50%)' } },
  { id: 'w',  edges: { left: true }, cursor: 'w-resize',  style: { left: -DOT/2, top: '50%', transform: 'translateY(-50%)' } },
  { id: 'ne', edges: { top: true, right: true }, cursor: 'ne-resize', style: { top: -DOT/2, right: -DOT/2 } },
  { id: 'nw', edges: { top: true, left: true }, cursor: 'nw-resize', style: { top: -DOT/2, left: -DOT/2 } },
  { id: 'se', edges: { bottom: true, right: true }, cursor: 'se-resize', style: { bottom: -DOT/2, right: -DOT/2 } },
  { id: 'sw', edges: { bottom: true, left: true }, cursor: 'sw-resize', style: { bottom: -DOT/2, left: -DOT/2 } },
]
export const DOT_SIZE = DOT

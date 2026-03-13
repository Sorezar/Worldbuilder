import { uid } from '../store/useStore.js'

// ─── Widget layout constants ─────────────────────────────────
export const MAX_PER_ROW = 4
export const WIDGET_GAP = 8

// ─── Widget type catalog ────────────────────────────────────
export const WIDGET_TYPES = [
  { id: 'properties', name: 'Propriétés',         icon: '☰',  minH: 80  },
  { id: 'text',       name: 'Texte',              icon: 'T',  minH: 60  },
  { id: 'image',      name: 'Image',              icon: '🖼', minH: 120 },
  { id: 'chart',      name: 'Graphique',          icon: '📊', minH: 150 },
  { id: 'map',        name: 'Carte géo',          icon: '🗺', minH: 150 },
  { id: 'family_tree', name: 'Arbre généalogique', icon: '🌳', minH: 150 },
  { id: 'graph',      name: 'Graphe relations',   icon: '🔗', minH: 150 },
]

// ─── Default layout: row-based ──────────────────────────────
// Widgets with same `row` are placed side by side (flex ratio, max 4)
// `flex` controls relative width (default 1). E.g. flex:3 + flex:1 = 75%/25%
export const DEFAULT_CARD_LAYOUT = [
  { id: '_props', type: 'properties', row: 0, flex: 3, config: { propIds: 'all' } },
  { id: '_img',   type: 'image',      row: 0, flex: 1, config: { fit: 'cover' } },
  { id: '_text',  type: 'text',       row: 1, config: {} },
]

// ─── Resolve layout for a given card + type ─────────────────
export function resolveLayout(card, type) {
  if (card.layout) return migrateLayout(card.layout)
  if (type?.defaultLayout) return migrateLayout(type.defaultLayout)
  return DEFAULT_CARD_LAYOUT
}

// ─── Migrate old x/y/w/h layouts to row-based ──────────────
export function migrateLayout(layout) {
  if (!layout || layout.length === 0) return layout
  // Already row-based if first widget has `row` property
  if (typeof layout[0].row === 'number') return layout
  // Convert old grid layout: group by y coordinate
  const sorted = [...layout].sort((a, b) => a.y - b.y || a.x - b.x)
  let currentRow = -1
  let lastY = -1
  return sorted.map(w => {
    // Widgets overlapping in Y get the same row
    if (lastY === -1 || w.y >= lastY) {
      currentRow++
      lastY = w.y + w.h
    }
    return { id: w.id, type: w.type, row: currentRow, config: w.config || {} }
  })
}

// ─── Create a new widget ────────────────────────────────────
export function createWidget(typeId, layout) {
  const wt = WIDGET_TYPES.find(t => t.id === typeId)
  if (!wt) return null
  const maxRow = layout.reduce((max, w) => Math.max(max, w.row), -1)
  return {
    id: uid(),
    type: typeId,
    row: maxRow + 1,
    config: typeId === 'properties' ? { propIds: 'all' } : {},
  }
}

// ─── Group layout into rows ─────────────────────────────────
export function groupByRows(layout) {
  const map = new Map()
  for (const w of layout) {
    if (!map.has(w.row)) map.set(w.row, [])
    map.get(w.row).push(w)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, widgets]) => widgets)
}

// ─── Normalize row indices (compact gaps) ───────────────────
export function normalizeRows(layout) {
  const rows = groupByRows(layout)
  return rows.flatMap((widgets, idx) =>
    widgets.map(w => ({ ...w, row: idx }))
  )
}

// ─── Move widget to a target row/position ───────────────────
export function moveWidget(layout, widgetId, targetRow, insertSide) {
  const widget = layout.find(w => w.id === widgetId)
  if (!widget) return layout
  // Remove widget from current position
  let next = layout.filter(w => w.id !== widgetId)
  // If inserting into an existing row, check max 4
  const rowWidgets = next.filter(w => w.row === targetRow)
  if (insertSide !== 'new-row' && rowWidgets.length >= MAX_PER_ROW) {
    // Can't fit, create new row below
    return moveWidget(layout, widgetId, targetRow, 'new-row')
  }
  if (insertSide === 'new-row') {
    // Shift all rows >= targetRow down by 1
    next = next.map(w => w.row >= targetRow ? { ...w, row: w.row + 1 } : w)
    return normalizeRows([...next, { ...widget, row: targetRow }])
  }
  return normalizeRows([...next, { ...widget, row: targetRow }])
}

// ─── Charts grid system (used by ChartsView) ────────────────
// Kept separate from widget layout

function overlaps(a, b) {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x ||
           a.y + a.h <= b.y || b.y + b.h <= a.y)
}

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

  return applyGravity(settled, movedId)
}

function applyGravity(layout, skipId) {
  const result = layout.map(w => ({ ...w }))
  const sorted = result
    .filter(w => w.id !== skipId)
    .sort((a, b) => a.y - b.y || a.x - b.x)
  const anchor = result.find(w => w.id === skipId)

  for (const widget of sorted) {
    let bestY = 0
    for (let tryY = 0; tryY <= widget.y; tryY++) {
      const test = { ...widget, y: tryY }
      let blocked = false
      if (anchor && overlaps(test, anchor)) { blocked = true }
      if (!blocked) {
        for (const other of sorted) {
          if (other.id === widget.id) continue
          if (other.y + other.h <= tryY) continue
          if (overlaps(test, other)) { blocked = true; break }
        }
      }
      if (!blocked) { bestY = tryY; break }
    }
    widget.y = bestY
  }

  return result
}

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

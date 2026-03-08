// ─── Theme configuration ─────────────────────────────────────
// Centralized theme system. All visual variables are resolved here.
// Components consume CSS custom properties (--accent, --text-*, etc.)
// Colors are derived from a single accent color — no more palettes.

// Shared neutral white text scale
const TEXT = {
  textPrimary: '#f0f0f0',
  textSecondary: '#c0c0c0', 
  textMuted: '#8a8a8a', 
  textDim: '#5a5a5a', 
  textDark: '#444444', 
  textDarker: '#2e2e2e' 
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

// ─── Hex color utilities ─────────────────────────────────────
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(c => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('')
}

// Derive bg/border/overlay colors from an accent hex + a bg hex
function deriveColors(accentHex, bgHex) {
  const a = hexToRgb(accentHex)
  const bg = hexToRgb(bgHex)

  // Mix accent tint into bg at very low ratios for subtle tinting
  const mix = (ratio) => ({
    r: Math.round(bg.r * (1 - ratio) + a.r * ratio),
    g: Math.round(bg.g * (1 - ratio) + a.g * ratio),
    b: Math.round(bg.b * (1 - ratio) + a.b * ratio),
  })

  const base = mix(0.04)     // bgBase: bg with 4% accent tint
  const panel = mix(0.06)    // bgPanel: bg with 6% accent tint
  const overlay = mix(0.03)  // bgOverlay: bg with 3% accent tint

  // Border: lighter accent-tinted color
  const border = { r: Math.min(255, a.r + 60), g: Math.min(255, a.g + 60), b: Math.min(255, a.b + 60) }

  // Default bg gradient (no image): two dark shades tinted by accent
  const dark1 = mix(0.12)
  const dark2 = mix(0.05)

  return {
    bgBase: `rgba(${base.r},${base.g},${base.b},`,
    bgPanel: `rgba(${panel.r},${panel.g},${panel.b},`,
    bgOverlay: `rgba(${overlay.r},${overlay.g},${overlay.b},`,
    borderColor: `rgba(${border.r},${border.g},${border.b},`,
    defaultBg: `linear-gradient(145deg,${rgbToHex(dark1.r, dark1.g, dark1.b)},${rgbToHex(dark2.r, dark2.g, dark2.b)})`,
  }
}

// ─── Resolve full theme from a world object ─────────────────
// Returns { vars, derived, isDark, bgBrightness, accentHex }
export function resolveTheme(world) {
  const accentHex = world.accentColor || '#c8a064'
  const bgHex = world.bgColor || '#000000'
  const derived = deriveColors(accentHex, bgHex)

  // Resolve fonts
  const fontTitle = TITLE_FONTS.find(f => f.id === world.fontTitle)?.css || "'Lora', serif"
  const fontBody  = BODY_FONTS.find(f => f.id === world.fontBody)?.css  || "'DM Sans', sans-serif"

  // Accent rgba prefix
  const { r, g, b } = hexToRgb(accentHex)
  const accentRgba = `rgba(${r},${g},${b},`

  // Resolve brightness / color mode
  const colorMode = world.colorMode || 'night'
  const sysDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = colorMode === 'night' || (colorMode === 'smart' && sysDark)
  const baseBrightness = world.bgBrightness ?? 0.45
  const bgBrightness = isDark ? Math.max(baseBrightness - 0.1, 0.1) : Math.min(baseBrightness + 0.2, 0.85)

  // CSS custom properties
  const vars = {
    '--accent': accentHex,
    '--accent-10': accentRgba + '0.1)',
    '--accent-15': accentRgba + '0.15)',
    '--accent-18': accentRgba + '0.18)',
    '--accent-22': accentRgba + '0.22)',
    '--text-primary': TEXT.textPrimary,
    '--text-secondary': TEXT.textSecondary,
    '--text-muted': TEXT.textMuted,
    '--text-dim': TEXT.textDim,
    '--text-dark': TEXT.textDark,
    '--text-darker': TEXT.textDarker,
    '--bg-base-35': derived.bgBase + '0.35)',
    '--bg-base-50': derived.bgBase + '0.5)',
    '--bg-base-60': derived.bgBase + '0.6)',
    '--bg-panel-55': derived.bgPanel + '0.55)',
    '--bg-panel-85': derived.bgPanel + '0.85)',
    '--bg-panel-92': derived.bgPanel + '0.92)',
    '--bg-overlay-50': derived.bgOverlay + '0.5)',
    '--border-06': derived.borderColor + '0.06)',
    '--border-09': derived.borderColor + '0.09)',
    '--border-10': derived.borderColor + '0.1)',
    '--border-14': derived.borderColor + '0.14)',
    '--border-15': derived.borderColor + '0.15)',
    '--font': fontTitle,
    '--font-body': fontBody,
  }

  return { vars, derived, isDark, bgBrightness, accentHex }
}

// ─── Genre presets ───────────────────────────────────────────
export const GENRE_PRESETS = {
  popular: {
    label: 'Les plus populaires', icon: '⭐',
    presets: [
      { name:'Parchemin',       bgImage:'https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?w=1600&q=80', accentColor:'#c8a064', fontTitle:'Lora',               fontBody:'DM Sans',       bgBrightness:0.45, colorMode:'night' },
      { name:'Givre',           bgImage:'https://images.unsplash.com/photo-1418985991508-e47386d96a71?w=1600&q=80', accentColor:'#64a0c8', fontTitle:'Inter',              fontBody:'Inter',         bgBrightness:0.40, colorMode:'night' },
      { name:'80s Nostalgia',   bgImage:'https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?w=1600&q=80', accentColor:'#a87bdb', fontTitle:'Cinzel',             fontBody:'Space Grotesk', bgBrightness:0.35, colorMode:'night' },
      { name:'Sylvestre',       bgImage:'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&q=80', accentColor:'#6ab87a', fontTitle:'Lora',               fontBody:'Nunito',        bgBrightness:0.40, colorMode:'night' },
      { name:'Cosmos',          bgImage:'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?w=1600&q=80', accentColor:'#7a8cc8', fontTitle:'Space Grotesk',     fontBody:'Space Mono',    bgBrightness:0.40, colorMode:'night' },
      { name:'Braise',          bgImage:'https://images.unsplash.com/photo-1462275646964-a0e3c11f18a6?w=1600&q=80', accentColor:'#e07040', fontTitle:'Cinzel',             fontBody:'DM Sans',       bgBrightness:0.35, colorMode:'night' },
    ],
  },
  fantasy: {
    label: 'Fantasy', icon: '⚔️',
    presets: [
      { name:'Parchemin',       bgImage:'https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?w=1600&q=80', accentColor:'#c8a064', fontTitle:'Lora',               fontBody:'DM Sans',       bgBrightness:0.45, colorMode:'night' },
      { name:'Foret Profonde',  bgImage:'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&q=80', accentColor:'#6ab87a', fontTitle:'Lora',               fontBody:'Inter',         bgBrightness:0.38, colorMode:'night' },
      { name:'Mystique',        bgImage:'https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?w=1600&q=80', accentColor:'#a87bdb', fontTitle:'Cinzel',             fontBody:'Crimson Text',  bgBrightness:0.35, colorMode:'night' },
      { name:'Haut Royaume',    bgImage:'https://images.unsplash.com/photo-1462332420958-a05d1e002413?w=1600&q=80', accentColor:'#c8a064', fontTitle:'Cormorant Garamond', fontBody:'DM Sans',       bgBrightness:0.50, colorMode:'night' },
      { name:'Montagne Sacree', bgImage:'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80', accentColor:'#64a0c8', fontTitle:'Cinzel',             fontBody:'Nunito',        bgBrightness:0.42, colorMode:'night' },
      { name:'Foret Elfique',   bgImage:'https://images.unsplash.com/photo-1425913397330-cf8af2ff40a1?w=1600&q=80', accentColor:'#6ab87a', fontTitle:'Cormorant Garamond', fontBody:'Crimson Text',  bgBrightness:0.35, colorMode:'night' },
      { name:'Citadelle',       bgImage:'https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?w=1600&q=80', accentColor:'#c8a064', fontTitle:'EB Garamond',        fontBody:'DM Sans',       bgBrightness:0.45, colorMode:'night' },
      { name:'Rose Sombre',     bgImage:'https://images.unsplash.com/photo-1542273917363-1f3e5ce0b0e8?w=1600&q=80', accentColor:'#d4768a', fontTitle:'Playfair Display',   fontBody:'Crimson Text',  bgBrightness:0.30, colorMode:'night' },
    ],
  },
  scifi: {
    label: 'Sci-fi', icon: '🚀',
    presets: [
      { name:'Cosmos',          bgImage:'https://images.unsplash.com/photo-1462332420958-a05d1e002413?w=1600&q=80', accentColor:'#64a0c8', fontTitle:'Space Grotesk',      fontBody:'Space Mono',    bgBrightness:0.40, colorMode:'night' },
      { name:'Neon',            bgImage:'https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?w=1600&q=80', accentColor:'#a87bdb', fontTitle:'Inter',              fontBody:'Space Mono',    bgBrightness:0.30, colorMode:'night' },
      { name:'Station',         bgImage:'https://images.unsplash.com/photo-1418985991508-e47386d96a71?w=1600&q=80', accentColor:'#64a0c8', fontTitle:'Inter',              fontBody:'Space Grotesk', bgBrightness:0.45, colorMode:'night' },
      { name:'Nebuleuse',       bgImage:'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?w=1600&q=80', accentColor:'#a87bdb', fontTitle:'Space Grotesk',      fontBody:'Space Mono',    bgBrightness:0.35, colorMode:'night' },
      { name:'Deep Space',      bgImage:'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=1600&q=80', accentColor:'#7a8cc8', fontTitle:'Inter',            fontBody:'Space Grotesk', bgBrightness:0.40, colorMode:'night' },
      { name:'Cyber Ville',     bgImage:'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1600&q=80', accentColor:'#a87bdb', fontTitle:'Space Grotesk',        fontBody:'Space Mono',    bgBrightness:0.30, colorMode:'night' },
    ],
  },
  modern: {
    label: 'Moderne', icon: '🏙️',
    presets: [
      { name:'Urbain',          bgImage:'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1600&q=80', accentColor:'#64a0c8', fontTitle:'Inter',              fontBody:'Inter',         bgBrightness:0.55, colorMode:'smart' },
      { name:'Cafe',            bgImage:'https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?w=1600&q=80', accentColor:'#c8a064', fontTitle:'Playfair Display',   fontBody:'Source Sans 3', bgBrightness:0.55, colorMode:'night' },
      { name:'Bureau',          bgImage:'https://images.unsplash.com/photo-1418985991508-e47386d96a71?w=1600&q=80', accentColor:'#64a0c8', fontTitle:'Space Grotesk',      fontBody:'DM Sans',       bgBrightness:0.60, colorMode:'smart' },
      { name:'Metropole',       bgImage:'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1600&q=80', accentColor:'#7a8cc8', fontTitle:'Inter',            fontBody:'DM Sans',       bgBrightness:0.40, colorMode:'night' },
      { name:'Cotier',          bgImage:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80', accentColor:'#64a0c8', fontTitle:'Playfair Display',   fontBody:'Nunito',        bgBrightness:0.55, colorMode:'smart' },
      { name:'Minimal',         bgImage:'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1600&q=80', accentColor:'#b8a070', fontTitle:'Inter',              fontBody:'Source Sans 3', bgBrightness:0.50, colorMode:'night' },
    ],
  },
  horror: {
    label: 'Horreur', icon: '💀',
    presets: [
      { name:'Tenebres',        bgImage:'https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?w=1600&q=80', accentColor:'#a87bdb', fontTitle:'Libre Baskerville',  fontBody:'DM Sans',       bgBrightness:0.20, colorMode:'night' },
      { name:'Brouillard',      bgImage:'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&q=80', accentColor:'#6ab87a', fontTitle:'Libre Baskerville',  fontBody:'Crimson Text',  bgBrightness:0.22, colorMode:'night' },
      { name:'Crypte',          bgImage:'https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?w=1600&q=80', accentColor:'#c8a064', fontTitle:'Cinzel',             fontBody:'Georgia',       bgBrightness:0.18, colorMode:'night' },
      { name:'Abime',           bgImage:'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1600&q=80', accentColor:'#7a8cc8', fontTitle:'Libre Baskerville', fontBody:'Georgia',       bgBrightness:0.15, colorMode:'night' },
      { name:'Sang',            bgImage:'https://images.unsplash.com/photo-1532767153582-b1a0e5145009?w=1600&q=80', accentColor:'#e07040', fontTitle:'Cinzel',             fontBody:'Crimson Text',  bgBrightness:0.18, colorMode:'night' },
      { name:'Rose Fane',       bgImage:'https://images.unsplash.com/photo-1542273917363-1f3e5ce0b0e8?w=1600&q=80', accentColor:'#d4768a', fontTitle:'Libre Baskerville',  fontBody:'Georgia',       bgBrightness:0.20, colorMode:'night' },
    ],
  },
  historical: {
    label: 'Historique', icon: '🏛️',
    presets: [
      { name:'Renaissance',     bgImage:'https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?w=1600&q=80', accentColor:'#c8a064', fontTitle:'EB Garamond',        fontBody:'Crimson Text',  bgBrightness:0.50, colorMode:'night' },
      { name:'Antiquite',       bgImage:'https://images.unsplash.com/photo-1462332420958-a05d1e002413?w=1600&q=80', accentColor:'#c8a064', fontTitle:'Cormorant Garamond', fontBody:'Georgia',       bgBrightness:0.45, colorMode:'night' },
      { name:'Manuscrit',       bgImage:'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1600&q=80', accentColor:'#c8a064', fontTitle:'Playfair Display',   fontBody:'Source Sans 3', bgBrightness:0.50, colorMode:'night' },
      { name:'Desert Ancien',   bgImage:'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=1600&q=80', accentColor:'#b8a070', fontTitle:'Cinzel',             fontBody:'Crimson Text',  bgBrightness:0.50, colorMode:'night' },
      { name:'Forteresse',      bgImage:'https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?w=1600&q=80', accentColor:'#c8a064', fontTitle:'EB Garamond',        fontBody:'Georgia',       bgBrightness:0.45, colorMode:'night' },
      { name:'Vieux Monde',     bgImage:'https://images.unsplash.com/photo-1524946274118-e7680e33ccc5?w=1600&q=80', accentColor:'#b8a070', fontTitle:'Cormorant Garamond', fontBody:'Crimson Text',  bgBrightness:0.48, colorMode:'night' },
    ],
  },
}

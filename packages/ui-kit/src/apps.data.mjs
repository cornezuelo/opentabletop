// The OpenTabletop apps as plain data, shared by the apps (apps.ts, the app switcher) and
// the site build (scripts/build-site.mjs: the landing page), so both list them in one order
// with one icon and one description. Plain JavaScript so Node can read it without building.

/** In the order the app switcher and the landing page show them. */
export const APP_LIST = [
  { id: 'hexmapper', name: 'Hexmapper', devPort: 5173, available: true },
  { id: 'oracle', name: 'Oracle', devPort: 5174, available: true },
  { id: 'travel', name: 'Travel', devPort: 5175, available: true },
  { id: 'manual', name: 'Manual', devPort: 5176, available: true },
]

const FRAME = '<rect width="32" height="32" rx="6" fill="#26241f"/>'
const GOLD = '#c8a24a'

/** Gold-on-dark app icons (32×32 SVG), one style for the whole ecosystem. */
export const APP_ICON_SVGS = {
  oracle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${FRAME}<path d="M16 4 27 10v12L16 28 5 22V10z" fill="none" stroke="${GOLD}" stroke-width="2"/><circle cx="16" cy="16" r="3" fill="${GOLD}"/></svg>`,
  hexmapper: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${FRAME}<path d="M5 9.5 12 6.5l8 3 7-3v16l-7 3-8-3-7 3z" fill="none" stroke="${GOLD}" stroke-width="2" stroke-linejoin="round"/><path d="M12 6.5v16M20 9.5v16" stroke="${GOLD}" stroke-width="1.6"/><circle cx="16" cy="14" r="2" fill="${GOLD}"/></svg>`,
  manual: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${FRAME}<path d="M16 9c-3-2-7-2-10-1v15c3-1 7-1 10 1 3-2 7-2 10-1V8c-3-1-7-1-10 1z" fill="none" stroke="${GOLD}" stroke-width="2" stroke-linejoin="round"/><path d="M16 9v15" stroke="${GOLD}" stroke-width="1.6"/></svg>`,
  travel: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${FRAME}<circle cx="16" cy="16" r="10" fill="none" stroke="${GOLD}" stroke-width="2"/><path d="M16 8l3 8-3 8-3-8z" fill="${GOLD}"/></svg>`,
}

/** What each app is for, in each interface language. */
export const APP_BLURBS = {
  en: {
    hexmapper:
      'Draw hex maps: terrain, roads, rivers, regions, icons and tokens; play trips on them.',
    oracle: 'Roll and edit tables, oracles, generators and decks from your packs.',
    travel: 'Run trips without a map and edit travel rules and their tables.',
    manual: 'How to use every app, with search.',
  },
  es: {
    hexmapper:
      'Dibuja mapas de hexágonos: terreno, caminos, ríos, regiones, iconos y tokens; juega viajes sobre ellos.',
    oracle: 'Tira y edita tablas, oráculos, generadores y mazos de tus packs.',
    travel: 'Juega viajes sin mapa y edita las reglas de viaje y sus tablas.',
    manual: 'Cómo usar cada aplicación, con buscador.',
  },
}

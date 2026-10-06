/**
 * The OpenTabletop apps, for the shared header and the app switcher. Built together
 * (`make site`) they live side by side as `<site>/<app>/`; in development each runs on
 * its own port.
 */
export type AppId = 'hexmapper' | 'oracle' | 'travel' | 'manual'

export interface AppInfo {
  id: AppId
  name: string
  /** Vite dev server port (vite.config.ts). */
  devPort: number
  /** False while the app doesn't exist yet: listed as coming soon. */
  available: boolean
}

export const APPS: AppInfo[] = [
  { id: 'hexmapper', name: 'Hexmapper', devPort: 5173, available: true },
  { id: 'oracle', name: 'Oracle', devPort: 5174, available: true },
  { id: 'travel', name: 'Travel', devPort: 5175, available: false },
  { id: 'manual', name: 'Manual', devPort: 5176, available: true },
]

const FRAME = '<rect width="32" height="32" rx="6" fill="#26241f"/>'
const GOLD = '#c8a24a'

/** Gold-on-dark app icons (32×32 SVG), one style for the whole ecosystem. */
export const APP_ICONS: Record<AppId, string> = {
  oracle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${FRAME}<path d="M16 4 27 10v12L16 28 5 22V10z" fill="none" stroke="${GOLD}" stroke-width="2"/><circle cx="16" cy="16" r="3" fill="${GOLD}"/></svg>`,
  hexmapper: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${FRAME}<path d="M5 9.5 12 6.5l8 3 7-3v16l-7 3-8-3-7 3z" fill="none" stroke="${GOLD}" stroke-width="2" stroke-linejoin="round"/><path d="M12 6.5v16M20 9.5v16" stroke="${GOLD}" stroke-width="1.6"/><circle cx="16" cy="14" r="2" fill="${GOLD}"/></svg>`,
  manual: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${FRAME}<path d="M16 9c-3-2-7-2-10-1v15c3-1 7-1 10 1 3-2 7-2 10-1V8c-3-1-7-1-10 1z" fill="none" stroke="${GOLD}" stroke-width="2" stroke-linejoin="round"/><path d="M16 9v15" stroke="${GOLD}" stroke-width="1.6"/></svg>`,
  travel: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${FRAME}<circle cx="16" cy="16" r="10" fill="none" stroke="${GOLD}" stroke-width="2"/><path d="M16 8l3 8-3 8-3-8z" fill="${GOLD}"/></svg>`,
}

export const appIconUrl = (id: AppId): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(APP_ICONS[id])}`

/** Where another app is: its dev server in development, its sibling folder when built. */
export function appUrl(id: AppId): string {
  const app = APPS.find((a) => a.id === id)!
  const dev = (import.meta as { env?: { DEV?: boolean } }).env?.DEV
  return dev ? `${location.protocol}//${location.hostname}:${app.devPort}/` : `../${id}/`
}

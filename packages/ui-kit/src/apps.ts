/**
 * The OpenTabletop apps, for the shared header and the app switcher. Built together
 * (`make site`) they live side by side as `<site>/<app>/`; in development each runs on
 * its own port.
 */
import { APP_BLURBS, APP_ICON_SVGS, APP_LIST, logoSvg } from './apps.data.mjs'

export type AppId = 'hexmapper' | 'oracle' | 'travel' | 'systems' | 'manual'

export interface AppInfo {
  id: AppId
  name: string
  /** Vite dev server port (vite.config.ts). */
  devPort: number
  /** False while the app doesn't exist yet: listed as coming soon. */
  available: boolean
}

export const APPS: AppInfo[] = APP_LIST

/** Gold-on-dark app icons (32×32 SVG), one style for the whole ecosystem. */
export const APP_ICONS: Record<AppId, string> = APP_ICON_SVGS

/** What each app is for, in the interface's language (English otherwise). */
export const appBlurb = (id: AppId, locale: string): string =>
  (APP_BLURBS[locale as keyof typeof APP_BLURBS] ?? APP_BLURBS.en)[id]

/** OpenTabletop's own mark as an image URL. */
export const logoUrl = (): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(logoSvg())}`

export const appIconUrl = (id: AppId): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(APP_ICONS[id])}`

/** Where another app is: its dev server in development, its sibling folder when built. */
export function appUrl(id: AppId): string {
  const app = APPS.find((a) => a.id === id)!
  const dev = (import.meta as { env?: { DEV?: boolean } }).env?.DEV
  return dev ? `${location.protocol}//${location.hostname}:${app.devPort}/` : `../${id}/`
}

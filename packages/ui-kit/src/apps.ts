/**
 * The OpenTabletop apps, for the shared header and the app switcher. Built together
 * (`make site`) they live side by side as `<site>/<app>/`; in development each runs on
 * its own port.
 */
import { APP_BLURBS, APP_ICON_SVGS, APP_LIST, FRAME, logoSvg, REPO } from './apps.data.mjs'

export { REPO }

export type AppId =
  'campaign' | 'hexmapper' | 'oracle' | 'travel' | 'characters' | 'systems' | 'manual'

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

/**
 * An app's sign without its frame, to use as a CSS mask: drawn in the text's colour like
 * any other glyph (`background: currentColor; mask: url(…)`).
 */
export const appGlyphUrl = (id: AppId): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(APP_ICONS[id].replace(FRAME, ''))}`

/** Where another app is: its dev server in development, its sibling folder when built. */
export function appUrl(id: AppId): string {
  const app = APPS.find((a) => a.id === id)!
  const dev = (import.meta as { env?: { DEV?: boolean } }).env?.DEV
  // Rendered without a page (tests render on the server), the built layout.
  return dev && typeof location !== 'undefined'
    ? `${location.protocol}//${location.hostname}:${app.devPort}/`
    : `../${id}/`
}

/** A tab of a campaign in the Campaign app. */
export type CampaignTab =
  'overview' | 'world' | 'maps' | 'trips' | 'characters' | 'factions' | 'timeline'

/** A campaign in the Campaign app (the other apps' **Open in Campaign ↗**), at one of its tabs. */
export const campaignUrl = (id: string, tab?: CampaignTab): string =>
  `${appUrl('campaign')}#/campaign/${encodeURIComponent(id)}${tab && tab !== 'overview' ? `/${tab}` : ''}`

/**
 * A map of the Hexmapper or a trip of Travel put in a campaign from the Campaign app: a new
 * one (no `id`), or one kept there joining it (asking what stays, as its own settings do).
 */
export const inCampaignUrl = (app: 'hexmapper' | 'travel', campaign: string, id?: string): string =>
  `${appUrl(app)}#/in-campaign/${encodeURIComponent(campaign)}${id ? `/${encodeURIComponent(id)}` : ''}`

/** Reads `#/in-campaign/<campaign>[/<id>]` (see `inCampaignUrl`); null for anything else. */
export function parseInCampaign(hash: string): { campaign: string; id?: string } | null {
  const match = /^#\/in-campaign\/([^/]+)(?:\/([^/]+))?\/?$/.exec(hash)
  if (!match) return null
  try {
    const campaign = decodeURIComponent(match[1])
    return match[2] ? { campaign, id: decodeURIComponent(match[2]) } : { campaign }
  } catch {
    return null
  }
}

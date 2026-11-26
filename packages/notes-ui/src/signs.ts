import { appGlyphUrl } from '@open-tabletop/ui-kit'

/** A faction's sign (a shield), drawn like the apps' glyphs. */
const SHIELD = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M16 4 26 8v8c0 6-4.5 10-10 12C10.5 26 6 22 6 16V8z" fill="none" stroke="#000" stroke-width="2.4" stroke-linejoin="round"/></svg>',
)}`

/**
 * The signs of links into the games, as CSS variables for a style attribute: a character is
 * drawn with Characters' glyph, a map (or a cell) with Map's, a campaign with Campaign's.
 */
export function signStyle(): string {
  const url = (u: string) => `url("${u}")`
  return [
    `--sign-character: ${url(appGlyphUrl('characters'))}`,
    `--sign-map: ${url(appGlyphUrl('map'))}`,
    `--sign-campaign: ${url(appGlyphUrl('campaign'))}`,
    `--sign-faction: ${url(SHIELD)}`,
  ].join('; ')
}

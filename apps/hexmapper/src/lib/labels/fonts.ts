import '@fontsource/im-fell-english/400.css'
import '@fontsource/im-fell-english/400-italic.css'
import '@fontsource/cinzel/400.css'
import type { LabelFont } from '../model/types'

/** Bundled OFL fonts (see CREDITS.md) plus the system sans-serif. */
export const FONT_FAMILIES: Record<LabelFont, { family: string; name: string }> = {
  fell: { family: '"IM Fell English", serif', name: 'IM Fell English' },
  cinzel: { family: 'Cinzel, serif', name: 'Cinzel' },
  sans: { family: 'system-ui, sans-serif', name: 'Sans' },
}

/** Resolves once the bundled web fonts are available for canvas text. */
export function loadLabelFonts(): Promise<unknown> {
  return Promise.all([
    document.fonts.load('32px "IM Fell English"'),
    document.fonts.load('italic 32px "IM Fell English"'),
    document.fonts.load('32px Cinzel'),
  ])
}

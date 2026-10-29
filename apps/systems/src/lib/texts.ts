import { overlayTexts as packTexts } from '@open-tabletop/pack-ui'
import { getLocale } from './i18n'
import { library } from './packs.svelte'

/** pack-ui's `overlayTexts` on this app's library and language. */
export const overlayTexts = <K extends string>(
  o: Omit<Parameters<typeof packTexts<K>>[0], 'library' | 'locale'>,
) => packTexts<K>({ ...o, library, locale: getLocale })

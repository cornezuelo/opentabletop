import { translator, type PackUiKey } from './i18n'

type SampleKey = PackUiKey extends infer K ? (K extends `samples.${infer S}` ? S : never) : never

/** The texts of a new definition's sample content, in `locale` (a pack's base language): content, not UI. English for a language without a dictionary. */
export type Samples = (key: SampleKey, params?: Record<string, string | number>) => string

export function samplesIn(locale = 'en'): Samples {
  const t = translator(() => locale)
  return (key, params) => t(`samples.${key}` as PackUiKey, params)
}

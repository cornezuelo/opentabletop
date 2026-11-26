import { describe, expect, it } from 'vitest'
import { en } from './en'
import { es } from './es'

const keys = (o: object, p = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'string' ? [`${p}${k}`] : keys(v, `${p}${k}.`),
  )

describe('i18n', () => {
  it('has the same keys in every language', () => {
    expect(keys(es).sort()).toEqual(keys(en).sort())
  })
})

import { describe, expect, it } from 'vitest'
import { LAST_SYSTEM_KEY, readLastSystem, rememberSystem } from './lastSystem'

function memory() {
  const items: Record<string, string> = {}
  return {
    items,
    getItem: (key: string) => items[key] ?? null,
    setItem: (key: string, value: string) => void (items[key] = value),
  }
}

describe('the last system chosen', () => {
  it('is remembered under a backed-up key and read back', () => {
    const storage = memory()
    expect(readLastSystem(storage)).toBeUndefined()
    rememberSystem('grey-marches', storage)
    expect(storage.items[LAST_SYSTEM_KEY]).toBe('grey-marches')
    expect(LAST_SYSTEM_KEY.startsWith('opentabletop.')).toBe(true)
    expect(readLastSystem(storage)).toBe('grey-marches')
  })

  it('survives storage that throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(readLastSystem(broken)).toBeUndefined()
    expect(() => rememberSystem('generic', broken)).not.toThrow()
  })
})

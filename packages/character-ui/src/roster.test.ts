import { beforeEach, describe, expect, it, vi } from 'vitest'
import { keepInRoster } from '@open-tabletop/session'

const kael = {
  id: 'kael',
  sheet: 'grey-marches/companion',
  values: { health: 5 },
  conditions: {},
  tags: [],
  cards: [],
  relations: [],
}

/** The store as a page load finds it. */
async function load() {
  vi.resetModules()
  return (await import('./roster.svelte')).roster
}

describe('the roster in this browser', () => {
  beforeEach(() => localStorage.clear())

  it('starts empty, and keeps what is saved for the next page load', async () => {
    const store = await load()
    expect(store.roster.characters).toEqual([])
    store.set(keepInRoster(store.roster, kael, 'T').roster)
    expect(JSON.parse(localStorage.getItem('opentabletop.characters')!)).toMatchObject({
      version: 1,
      characters: [{ character: { id: 'kael' }, modified: 'T' }],
    })
    expect((await load()).roster.characters.map((e) => e.character.id)).toEqual(['kael'])
  })

  it('reads broken storage as an empty roster', async () => {
    localStorage.setItem('opentabletop.characters', '{broken')
    expect((await load()).roster.characters).toEqual([])
  })
})

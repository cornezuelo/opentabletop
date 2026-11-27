import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { engineFiles } from '@open-tabletop/pack-ui'
import { bundledPacks } from '@open-tabletop/pack-ui/bundled'
import { sequence } from '@open-tabletop/random'
import { plainText } from '@open-tabletop/styled-text'
import { renderInline } from '@open-tabletop/ui-kit'
import { describe, expect, it } from 'vitest'

describe('styled texts in the bundled packs', () => {
  const { registry, diagnostics } = loadPacks(engineFiles(bundledPacks.filter((p) => !p.personal)))

  it('name only styles there are', () => {
    expect(diagnostics.filter((d) => d.message.startsWith('Unknown style'))).toEqual([])
  })

  it('the Grey Marches draw each reaction in its colour, in both languages', () => {
    const roll = (locale: string, face: number) =>
      createOracleEngine({
        registry,
        locale,
        // 2d6 rolled with the party's charisma and no modifier.
        random: sequence([(face - 0.5) / 6, (face - 0.5) / 6]),
      }).resolve('grey-marches/reaction', { charisma: 0, reactionModifier: 0 }).resolution.text!
    expect(renderInline(roll('en', 1))).toBe(
      '<span class="ink-red"><strong>hostile</strong></span>',
    )
    expect(renderInline(roll('es', 6))).toBe(
      '<span class="ink-green ink-underline">deseosos de ayudar</span>',
    )
    expect(plainText(roll('en', 6))).toBe('eager to help')
  })

  it('Core’s poker deck says a red suit in red', () => {
    const deck = registry.definitions.get('core/playing-cards')
    if (deck?.kind !== 'deck') throw new Error('no deck')
    const hearts = deck.cards.find((c) => c.key === 'hearts-2')!
    expect(renderInline(hearts.result!)).toBe('Two of hearts <span class="ink-red">♥</span>')
    const spades = deck.cards.find((c) => c.key === 'spades-2')!
    expect(renderInline(spades.result!)).toBe('Two of spades ♠')
  })
})

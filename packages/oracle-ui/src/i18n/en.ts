export const en = {
  roll: {
    roll: 'Roll',
    draw: 'Draw',
    shuffle: 'Shuffle',
    remaining: '{left} of {total} cards left',
    context: 'Context',
    contextHelp:
      'Values this definition reads, such as the terrain or the season. Values the app already knows appear in grey; type to override them. Blank means unknown.',
    advantage: 'Advantage',
    advantageHelp: 'Roll twice and keep the best (advantage) or the worst (disadvantage).',
    advantages: { normal: 'Normal', advantage: 'Advantage', disadvantage: 'Disadvantage' },
    nothing: 'No entry applies. Check the context values.',
    entries: 'Entries',
    weight: 'weight {weight}',
    then: 'then {target}',
    conditional: 'only if {condition}',
    dice: 'Dice',
    details: 'Details',
    error: 'Could not roll: {message}',
    keyHint: 'Space or Enter rolls again',
  },
  history: {
    title: 'History',
    empty: 'Your rolls appear here.',
    clear: 'Clear',
    resetState: 'New session',
    resetStateTip:
      'Forget entries that can only come up once and put every drawn card back in its deck.',
  },
  picker: {
    favorites: 'Favorites',
    search: 'Search tables…',
    none: 'Nothing matches.',
    choose: 'Pick a table, oracle, generator or deck to roll it.',
  },
} as const

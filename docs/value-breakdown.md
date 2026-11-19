# A value's base, what it reads now, and what makes the difference

Proposal (2026-11-19), **to review with the author**. Backlog: _A value's base, what it reads now, and what makes the difference_ (user, 2026-11-19: "es importante que se vean valores base y valores modificados, con posibilidad de desglosar qué los modifica y cómo, pero con una UI/UX elegante").

## 1. What there is

A value can read differently from what's written on the character for three reasons, and each is shown differently today, or not at all:

| Why it differs                                       | Example                                                     | Shown today                                                        |
| ---------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------ |
| A condition adds while it holds (`adds:`)            | Stealth 4, Burdened −1 → 3                                  | On the card, a line under the value: _Reads 3 now (Burdened −1)_   |
| Made of items (`from: { sum / max / count: items }`) | Load = the slots of what's carried; Armour = best worn      | Only the result; its help gives the rule, not what each item gives |
| Made of other values (`from: '{{…}}'`)               | Wounds = Max health − Health; Capacity = Max health × 2 + 2 | Only the result                                                    |
| Kept within its bounds (`min` / `max`)               | 4 − 6 = −2, held at 0                                       | Nothing                                                            |

And where values are drawn: the character's card (character-ui's `CharacterCard`), a fight's cards (`CharacterGlance`: the base alone, so a Burdened companion's Stealth is wrong there), those present (**Here**), the roster.

## 2. The proposal

### 2.1 The engine says it once

character-engine gets **`valueParts(sheet, state, id)`**, beside `valuesNow`, and every UI reads from it:

```ts
{
  now: 3,          // what tables and conditions read
  base: 4,         // what's written on the character (none for a value made of others)
  parts: [         // what makes the difference, in order, each with its sign
    { kind: 'condition', id: 'burdened', amount: -1 },
    // made of items: each item that counts, × its count
    { kind: 'item', key: 'mail', amount: 2 },
    // made of values: each value its formula reads, with what it is now
    { kind: 'value', id: 'maxHealth', amount: 5 },
    // a bound that held it
    { kind: 'bound', which: 'min', amount: 0 },
  ],
  formula?: 'self.values.maxHealth * 2 + 2'   // a value made by a formula
}
```

`valuesNow` and `addedTo` become thin readers of it, so the number shown and its breakdown can never disagree.

### 2.2 One look everywhere a value is drawn

- **The value now, first and large**, as today. When it differs from its base, a small mark beside it (**↑** or **↓**, in the theme's muted tone, never good/bad colours: whether more is better is the system's to say, and its `tones` already colour the number).
- **The breakdown on demand, folded**: clicking the value (or the mark) unfolds one line under it, written as a sum: _Stealth 3 = 4 − 1 Burdened_; _Armour 2 = Mail (best worn)_; _Load 5 = Rations 2 × 1 + Rope 1 + Mail 2_; _Capacity 12 = Max health 5 × 2 + 2_; _Health 0 = 4 − 6, held at its minimum 0_. Clicking again folds it. Nothing new stays open by default, so the card looks as it does now.
- **On small cards** (a fight's, **Here**): the value now, the mark, and the breakdown in its tooltip (Markdown, the same line). The fight's cards then read the value now, fixing the Stealth shown there.
- **In the help column** (`InfoTip`, as now): what the value is and its rule, written by the system; the breakdown is the numbers, not the rule.

### 2.3 Where it's written

- character-engine: `valueParts`, tests on every kind of part (conditions, items with counts and `where`, `max` / `min` of items, formulas, bounds, several at once).
- character-ui: one component, `ValueNow` (value, mark, folded breakdown, or tooltip when small), used by `CharacterCard`, `CharacterGlance`, travel-ui's **Here** and the roster. Texts in its i18n (_held at its minimum_, _best worn_…), item and condition names from the sheet's catalogues.
- Manual en/es: the character's card in Characters and Playing a trip; the Grey Marches' page (Burdened's Stealth, Armour from worn mail, Load and Wounds as worked examples).

## 3. What's left out

- What a table adds in its own arithmetic (`{{1d6 + acting.values.harm + 1}}`): that's the roll's, not the value's; its dice and terms are already drawn with the roll.
- Values of the party's own sheet made of the members' (`from: { max: … }` in party stats): the same line would say whose value it took (_Survival 3 = Kael's, the best_). Proposed as a second step, the same component.

## 4. To decide

1. The mark (↑ / ↓ beside the value, proposed) or the base shown struck through beside the value now (_~~4~~ 3_), louder.
2. The breakdown folded under the value on a click (proposed) or always in a tooltip.
3. Whether the party's values made of the members' get it in the same work or after.

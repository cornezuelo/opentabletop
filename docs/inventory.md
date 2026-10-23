# Inventory — design

Design for the backlog's _Inventory, and the pieces sheets still lack_ (Characters engine). The user's ask (2026-10-19): "¿nos faltaría también sistemas bastante comunes en personajes como quizá inventario?"; **decided 2026-10-22**: supplies are never a subsystem of the rules ("ni de coña un subsistema aparte en reglas"): each system chooses items in an inventory or a plain value of the party's sheet. **2026-10-23**, the user: how the load is counted and what happens when it's over is the sheet's or the system's to say, with the conditions and actions we already have; items may give effects and roll modes; look at many games and build abstractions that can declare anything. Section 8 lists what needs a decision.

## 1. How games do it

| Game                               | What an item is                                                                    | How the load is counted                                              | Over the limit                                  | Consumables                                                         |
| ---------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| **D&D 5e**                         | a catalogue entry (weight, cost, properties); armour and weapons change numbers    | weight against Strength × 15 (variant: × 5 encumbered, × 10 heavily) | speed −10 / −20, disadvantage                   | counted by hand (rations, arrows)                                   |
| **Shadowdark**                     | gear with **slots** (most 1, armour 2–3, 100 coins 1)                              | slots against Strength (or 10)                                       | can't carry more                                | rations 3 per slot, torches burn an hour of real time               |
| **Cairn / Knave**                  | items of 1 slot (bulky 2), some with **uses**                                      | 10 slots (Knave: Constitution + 10)                                  | full slots: HP 0; **fatigue fills slots**       | usage dots, "3 uses"                                                |
| **Mausritter**                     | cards on a grid: **paws, body, pack**; items with **usage dots**                   | the grid's places (2 paws, 2 body, 6 pack)                           | no room: drop something; conditions take slots  | 3 usage dots, marked as used                                        |
| **Torchbearer**                    | items by **where** they're carried (head, neck, hands, torso, belt, pack) and size | each place's own room (pack 6, belt 3…)                              | can't put it there                              | rations and light as items that run out by turns                    |
| **Blades in the Dark**             | a playbook's list, **ticked** during a score, each worth load 1–2                  | the load **chosen** before the score: light 3, normal 5, heavy 6     | the load chosen sets how you move (heavy: slow) | none; coin and stash apart                                          |
| **Forbidden Lands / Year Zero**    | gear with weight (light ½, normal 1, heavy 2)                                      | Strength × 2                                                         | encumbered: can't run, more rolls               | **resource dice**: food d8 → d6 → d4 → gone, stepping down on a 1–2 |
| **The Black Hack**                 | items, light/normal                                                                | slots by Strength                                                    | disadvantage                                    | **usage die** (d20 → d12 → … → spent)                               |
| **The One Ring 2e**                | gear with **Load**; treasure too                                                   | Load added up is part of **Fatigue**, against Endurance              | Weary when Endurance ≤ Load + Fatigue           | none; journeys use Fatigue                                          |
| **Ironsworn**                      | no inventory; a few assets                                                         | none                                                                 | —                                               | **Supply**, a single 0–5 track shared by the party                  |
| **Dungeon World**                  | items with weight and tags (`ration`, `uses`)                                      | weight against Load (class + Str)                                    | −1 forward, then slowed                         | uses on the item                                                    |
| **Mothership**                     | a loadout and a few trinkets                                                       | none                                                                 | —                                               | ammo, oxygen as numbers                                             |
| **Kal-Arath** (private pack)       | rations, herbs, gear                                                               | by hand                                                              | —                                               | a ration per day to recover                                         |
| **The Grey Marches** (ours, today) | `rations` as a companion's value; food and fodder as the rules' `resources`        | none                                                                 | —                                               | `eat` at day's end (`-{{party.stats.mouths}}`), `carried` shares it |

What they share, once the names are taken away:

1. **Things a character (or the party) has, with how many**: by name, from a list the game prints or written in.
2. **Numbers on each thing**, of the game's own: slots, weight, load, uses, a die, armour, damage, cost.
3. **Where it is**, when the game cares: hands, belt, pack; a grid; a stash left behind.
4. **A count of those numbers** (slots or weight added up), against **a limit** that is another number (Strength × 2, 10, the load chosen).
5. **What happens over the limit** (or at it, or near it): a condition (encumbered), a modifier, a block (can't run, can't add more).
6. **Using one up**: a count or a usage number going down, or a die stepping down, and running out.
7. **What having it does**: armour adds to defence, a rope helps climbing, a lantern lights the dark.
8. **Other things take room**: Cairn's fatigue and Mausritter's conditions fill slots.

And the opposite end: **Ironsworn's Supply** or a plain `food` number: no items at all, one value of the party. That is already a sheet value today, and stays the abstract choice.

## 2. What the engine has already, and what it lacks

Sheets already have values with bounds (a bound can be another value: `max: '{{self.values.strength}}'`), displays (boxes, pips, levels: d12 → d4 as named levels), conditions that **block** actions or ways of travelling, tags, cards and relations; effects change values anywhere (`characters.x.values.y: -1`, `party.members.…`); conditions read anything; actions run steps when the system says (`on:` a moment), and roll modes are taken by conditions (`modeWhen`). So points 5, 6 (as values) and 7 are almost there. What's missing is generic, not about inventory:

- **Lists of things with numbers of their own** (points 1–3): a sheet has single values, not "how many of each, each with its fields".
- **A value made of others** (point 4): a load that is the sum of the items' slots, or Strength × 2. Today only bounds read other values, and party stats made of the members' values (`from:`).
- **A condition that holds by itself while something is true** (point 5): today conditions are set and cleared by effects; "encumbered while load > capacity" would need an action on every moment to check it.

## 3. The abstractions

Three general pieces, each useful beyond inventory, and the inventory built of them.

### 3.1 Items: a list in the sheet, with fields the sheet declares

The sheet says what an item has in this system (its **fields**, declared like values: name, bounds, display) and, if the system cares, **where** items go:

```yaml
kind: sheet
id: companion
values: { might: { default: 2 }, … }
items:
  # What every item has in this system. Each field is a number with its bounds and display.
  fields:
    slots: { name: Slots, default: 1, min: 0 }
    uses: { name: Uses, min: 0, display: pips, max: 3 } # usage dots
  # Where items can be, if it matters (absent: one list). Each place may have its own room.
  places:
    hands: { name: Hands, room: 2 }
    pack: { name: Pack, room: '{{self.values.might}}' }
```

A character then has items, each **from the system's catalogue or written by hand**, with how many (`count`), its place and its fields (the catalogue's, changed where it says so):

```yaml
# in a character's state (written by the apps)
items:
  - { item: rope, count: 1, place: pack } # from the catalogue: its fields come with it
  - { item: torch, count: 3, place: pack, uses: 2 } # one field changed (this one's uses)
  - { name: Grandfather's compass, place: hands, slots: 1, tags: [heirloom] } # by hand
```

### 3.2 A catalogue: `kind: items`

What a system offers to choose from, so the player picks "Rope" and gets its fields, tags and description; a pack may hold as many catalogues as it likes (gear, weapons, magic):

```yaml
kind: items
id: gear
name: The Company's gear
items:
  rope: { name: Rope, description: Fifty feet of hemp., slots: 1, tags: [climbing] }
  torch: { name: Torch, slots: 1, uses: 3, tags: [light] }
  ration: { name: Ration, slots: 0.5, tags: [food] }
  mail: { name: Mail shirt, slots: 2, tags: [armour], armour: 2 }
```

Translated in the pack's locales like any definition (`items/gear` keyed by item). Fields not declared by the sheet are a warning (`armour` above needs an `armour` field in the sheet), so a catalogue and a sheet stay in step.

### 3.3 Values made of others: `from:` on a sheet value

A value computed, never set by hand or by effects, as party stats already are made of the members'. Written with the same pieces:

```yaml
values:
  load: { name: Load, from: { sum: items.slots } } # the items' slots added up (× count)
  capacity: { name: Capacity, from: '{{self.values.might * 2 + 4}}' } # a formula
  armour: { name: Armour, from: { sum: items.armour, where: { place: [hands, body] } } }
  light: { from: { count: items, tags: light } } # how many light sources
```

- `sum`, `count`, `max`, `min` over the items (optionally only some: `where:` a condition on the item, its tags, its place), or any formula of the sheet's values (`{{…}}`, as bounds are written).
- This is what "what having it does" (point 7) becomes: armour adds to defence because `defence` is made of it; a rope helps climbing because a roll mode's `modeWhen` reads `acting.items.rope`; a lantern lights the dark because a check's `unless` reads `party.members.items: { tags: light }`.

### 3.4 Conditions that hold by themselves: `when:` on a sheet condition

A condition the sheet declares with a `when` holds **while** it's true, without effects setting it, and blocks what it lists like any other:

```yaml
conditions:
  encumbered:
    name: Encumbered
    when: { self.values.load: { gt: '{{self.values.capacity}}' } }
    blocks: [actions.forced-march]
  overloaded:
    when: { self.values.load: { gt: '{{self.values.capacity * 2}}' } }
    blocks: [travel.move]
```

So "what happens over the limit" is the system's: a condition (with what it blocks, roll modes that read it, checks that read it), or nothing; and anything subtler (a −1 forward, a step at nightfall) is an action or a check reading `self.values.load`, as the user put it.

## 4. Changing items: effects and steps

Items are changed by effects, as values are, with paths of their own:

- `characters.kael.items.torch: -1` — one torch fewer (gone at 0); `+2` adds two (from the catalogue).
- `characters.kael.items.torch.uses: -1` — the first torch's uses (an item with `uses` at its min is gone if the sheet says `spent: remove`, or stays empty).
- `party.members.items.ration: -1` — **each** member eats one; `party.items.ration: -1` — **one** from the party: from the party sheet's own items, else from the members, **shared out** as the sheet says (`items.share: most | evenly | order`, today's `carried` rule, moved to where the items are).
- A step `give:` / `take:` for the UI's sake later (choose who gets the treasure), not needed to start.

Conditions and tables read `characters.x.items.torch` (how many), `…items.torch.uses`, `party.items.ration` (the party's and its members' together), `acting.items` with `tags:`.

## 5. Supplies, once items exist

The rules' `resources` and the bindings' `carried` go away, as decided; each system says what food is:

- **The Grey Marches**: rations as **items** of the companions (a catalogue `gear` with `ration`), eaten with `party.items.ration: '-{{party.stats.mouths}}'` at day's end, shared from whoever carries most; fodder as an item of the party sheet; `trip.below: food` becomes the condition `hungry` with `when: { party.items.ration: { lte: 0 } }`, or the eat action's step that runs out.
- **Core's Generic rules**: food as a plain **value of the party sheet** (`party.values.food`, min 0), the smallest form (Ironsworn's Supply).
- **Kal-Arath** (private): rations as items, wounds healed only after one is spent (its pending camp rule).
- The trip panel's **Supplies** section disappears: the party sheet's card shows its values and items, each character's card its own.

This is the part with migrations: the pack format bumps (our packs moved in the same work), saved trips and maps move their `resources` into the party sheet's values or items (`make old-maps`, `old-trips` keep passing), and item 46 (a supply's starting amount) is answered by values' and items' `default` / `count`.

## 6. The UI

- **The character's card**: an **Items** section, grouped by place when the sheet has places (each with its room: _Pack 4 / 6_), each item a row: name, count, its fields drawn as declared (pips for uses), × to drop, **+ Add** from the catalogues (search) or by hand; drag between places. The values made of others show greyed (they can't be typed).
- **Systems → Sheet**: **Items** (its fields, as values are edited; its places with their room; how the party shares), the values' **Made of** (`from`), conditions' **Holds while** (`when`, as rows).
- **A catalogue form** (`kind: items`) in the Oracle app, where definitions of packs are edited, or in Systems beside the sheet: section 8 e.

## 7. Phases

1. **Values made of others and conditions that hold by themselves** (3.3 without items, 3.4): useful at once (a Toughness-based max, Weary when Fatigue ≥ Endurance), small, no migration.
2. **Items in the sheet and the catalogue** (3.1, 3.2), effects and reads (4), the card's Items section; the Grey Marches gain gear (a rope for the ford, torches for night marches) while food stays as it is.
3. **Supplies become items or values** (5): the format bump, our packs moved, migrations of trips and maps, `resources` and `carried` removed, item 46 closed.
4. The bestiary (creatures' sheets) and treasure tables that give items come after, on these pieces.

## 8. To decide with the user

a. **Catalogue and by hand, both** (proposal): a `kind: items` catalogue for what a system offers, and items written by hand on a character for the one-off things (an heirloom, a found key). With only a catalogue, every odd thing needs a pack edit; with only by-hand, nothing is shared or translated.
b. **Fields declared by the sheet** (proposal) rather than fixed (`slots`, `weight`…): the system says what an item has, as it says what a character has; nothing named in the engine.
c. **Conditions that hold by themselves** (`when:` on a condition) as the way "over the limit" is said, beside actions and checks for subtler rules (proposal: yes, it's generic: Weary, Hungry, Shaken while morale ≤ 1…).
d. **Places** optional (proposal): one list unless the sheet declares places; each place's room a number or a value.
e. **Where catalogues are edited**: in the Oracle app (it edits packs' definitions, tables and decks) or in Systems (beside the sheet whose fields they fill). Proposal: Systems, a tab **Items** next to **Sheet**.
f. **The order**: phase 1 alone is small and useful; the rest after the current work.

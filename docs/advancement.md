# Advancement and abilities — design

**Status: decided with the user on 2026-11-13** (written the same day; the answers are in section 6). It answers the backlog's _Masteries and levels_ (Ker Nethalas), the _advancement (marked skills, levels, trees of abilities)_ still open under _Sheets with rolled starts_, and the `kind: ability` that [character-engine.md](character-engine.md) §2.5 planned and nobody built (a character's `cards` are there, empty). The user, asked whether to do Ker Nethalas' Level Adaptation on a bare `level` first (2026-11-13): "Maestrías y niveles antes"; and on the way: "espero que todo esto que estamos haciendo se ejercite también en marcas grises y no quede en desarrollos super específicos para ker nethalas". So: generic mechanisms first, the Grey Marches as the first system to use them at full power, Core the smallest, Ker Nethalas to the letter after.

## 1. How games do it

| Game                               | What grows                                                                                                                    | How it's earned                                                                            | When it's spent                                     | Abilities                                                                                                                                                                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D&D 5e**                         | level (hit points, proficiency), at some levels a choice (+2 to a score or a feat)                                            | XP by deeds, or milestones                                                                 | at a threshold (300, 900…)                          | class features by level; feats from a list with prerequisites; spells known and slots                                                                                                                                     |
| **Ironsworn**                      | assets' further abilities                                                                                                     | XP marked when a vow or a bond is fulfilled (by its rank)                                  | whenever: 3 for a new asset, 2 for its next ability | **assets**: cards of 3 abilities, the first given, the rest bought in order                                                                                                                                               |
| **Blades in the Dark**             | an attribute's dots, playbook abilities                                                                                       | XP per attribute track, marked by desperate rolls and at the session end                   | a full track: a dot, or an ability                  | the playbook's list, any order                                                                                                                                                                                            |
| **PbtA**                           | a stat, a move                                                                                                                | XP marked on a miss                                                                        | 5 XP: one advance from a list (each once)           | moves of the playbook, a few of another                                                                                                                                                                                   |
| **Mothership**                     | skills                                                                                                                        | a skill trained over time                                                                  | the training ends                                   | **skill trees**: an advanced skill needs its prerequisite                                                                                                                                                                 |
| **Year Zero**                      | skills, talents                                                                                                               | XP by questions at the session end                                                         | 5 XP a skill level or a talent                      | talents with ranks                                                                                                                                                                                                        |
| **Stars Without Number**           | level (HP, attack, saves), skill points                                                                                       | XP by goals                                                                                | a threshold; points spent with prerequisites        | **foci** with two levels                                                                                                                                                                                                  |
| **The One Ring 2e**                | skills, combat proficiencies, Valour and Wisdom (rewards and virtues)                                                         | skill and adventure points at the end of a session                                         | in the Fellowship phase                             | rewards and virtues from lists, each once                                                                                                                                                                                 |
| **Savage Worlds**                  | an advance: a skill, an attribute, an edge                                                                                    | an advance per session or so                                                               | at once                                             | **edges** with requirements (rank, attribute, another edge)                                                                                                                                                               |
| **Kal-Arath**                      | level: stats, HP                                                                                                              | XP by treasure and deeds                                                                   | a threshold                                         | a few abilities by background                                                                                                                                                                                             |
| **Ker Nethalas**                   | level (1,000 XP each): +1 Ability Point and one benefit from a list (+D4 Health, +D6 Toughness, +5 to a Skill, a damage die…) | XP by deeds: a lock (+10), a trap (+10), a Domain (+50), a fight (+50), an Overseer (+200) | at the threshold                                    | **Masteries**: two of them (a third by an amulet), five tiers each, bought in order with Ability Points; active (Aether, some **Sustained**: the pool's max lowered while on) or passive (a resistance, Toughness +level) |
| **Ker Nethalas skills**            | a skill                                                                                                                       | doubles on a check mark it                                                                 | at camp: D100 over it, +D4; else +1; 80 at most     | —                                                                                                                                                                                                                         |
| **The Grey Marches** (ours, today) | nothing                                                                                                                       | —                                                                                          | —                                                   | —                                                                                                                                                                                                                         |

What they share, names taken away:

1. **A count that grows** by what the character does (XP, marks, points), the system saying what earns how much.
2. **A threshold** that spends it, or a price the player pays when they choose.
3. **A choice from a list** (an advance, a benefit, a reward), sometimes each once, sometimes with requirements.
4. **Abilities**: named things a character has, from a catalogue the system writes, each with a description, numbers of its own (a cost, a rank, a tier), **requirements** (a level, another ability, the one before it in the tree, a limit of how many trees), and **what having it does**: a number changed (passive), an action the character can take (active), a resistance, a roll mode.
5. **Ranks or tiers**: the same ability bought again, or the next of a tree.
6. **Switched on and off** (Ker Nethalas' Sustained, D&D's concentration): while on, a cost held.

## 2. What the tools have already

- **Values with bounds** (XP, level, points), rolled starts, values **made of others** (`from:`), of items (`from: { sum: items.armour }`), with steps.
- **Reactions** (`on: { when: { acting.values.xp: { gte: 1000 } }, for: party.members }`), and since today **actions for each member** (`for: party.members`).
- **Actions that ask** (`ask:` with written choices, or listed by the trip: `from: party.members`), steps that branch on the answer (`when: { params.benefit: health }`), rolls (`'+{{1d4}}'`), effects anywhere.
- **Items**: a catalogue (`kind: items`) of things with fields, tags, where they fit; a character holds them in places; values made of them by a condition (`where: { place.tags: hand, item.tags: slashing }`); effects `acting.items.<id>: 1` give one, `acting.items.<key>.<field>` change one; conditions read `acting.items.tags`, `acting.places.<id>.keys`.
- **Conditions** with `blocks`, `lasts`, `when:` (holding by themselves), read as `acting.conditions`.

So **XP, levels and the level-up choice need nothing new**: values, a reaction for each member, an action that asks. What's missing is **abilities**.

## 3. Proposal

### 3.1 Abilities are things held, in a place of their own (recommended)

An ability works like an item in every way that matters: a catalogue entry with a name, a description, tags and numbers; a character has it or not; having it changes values; effects give it and take it away; conditions read it. So abilities **are items**, kept in a **place of the sheet that holds abilities** instead of gear, with **no new engine**:

```yaml
# a sheet's places (as hands and body are today)
places:
  known: { name: Abilities, tags: [abilities], display: cards }

# a catalogue (kind: items) of abilities: same kind, the place they fit says what they are
items:
  shield-bash:
    name: Shield Bash
    description: Slam your foe with your shield, Dazing them for 2 rounds.
    fits: { place.tags: abilities }
    tags: [ability, mastery-bulwark]
    tier: 2
    cost: 0
  bulwark:
    name: Bulwark
    description: Immune to Bludgeoning, Resistant to Piercing.
    fits: { place.tags: abilities }
    tags: [ability, mastery-bulwark]
    tier: 5
```

What it does, with what exists:

- **Passive**: a value made of the abilities held: `taken-bludgeoning: { from: { min: items.taken-bludgeoning, where: { place.tags: abilities } } }`; or whether one is held, `bulwark: { from: { count: items, where: { item.id: bulwark } } }`, read by another (`toughness`'s max `'{{30 + self.values.level * self.values.bulwark}}'`).
- **Active**: an action open while it's held: `when: { acting.items.shield-bash.count: { gte: 1 } }` (or `acting.items.tags: …`), its steps the ability's procedure.
- **Learned**: an effect, `acting.items.shield-bash: 1`; forgotten, `-1`; ranks as its count or a field.
- **Switched on** (Sustained): a field of it (`on: 1`), and the pool's max made of what's on: `max: '{{25 - …}}'` from `{ sum: items.cost, where: { item.fields.on: 1 } }`.
- Never weighed, never shared out with the party's supplies, never dropped as loot: a place that holds abilities has no room limit and items that fit only there go nowhere else.

**The alternative**: a kind of its own (`kind: abilities`, the planned `cards`), with its own copy of catalogues, fields, values made of them, effects and UI. Two copies of the same machinery, which the project's first principle calls a bug. Its one advantage is the name; the UI can give that anyway (a place with `display: cards` shows its items as cards, under its own heading). The character's empty `cards` list goes, then (a rename complete: nothing uses it).

### 3.2 What's new, small

1. **A parameter listed from a catalogue, by a condition**: the level-up's "choose an ability you may learn" lists the catalogue's entries whose requirements hold for the one acting: `ability: { from: items, where: { item.tags: ability, item.fields.tier: '{{…}}' }, needs: … }`. Today `from:` lists the trip's things (`present.ids`, `party.members`, `acting.places.body.keys`); this lists **a catalogue's**, each entry read as `item.*`, with what the character has in reach for requirements (`acting.items.…`). It's the same candidates-by-condition mechanism _Factions that choose_ needs; built once, for both.
2. **Requirements on a catalogue entry** (`needs:` on an item: a condition read with the character as `self` and the entry as `item`), shown where it's offered and checked when given by hand: the tier before it held, a level, how many trees started.
3. **`display: cards` on a place**: its items shown as cards (name, description, its fields), not as a list with counts and room.
4. **Doubles marking a skill**: a check's result reads `dice.doubles` (exists); the mark is a condition per skill or a tag (`acting.tags: marked-stealth`); at camp, `{ roll: table.improve, each: params.skill }` with the skill listed from what's marked: a parameter listed by the trip from `acting.tags` filtered (point 1 again, over a list the trip has).

### 3.3 XP and levels, with nothing new

```yaml
# sheet values
xp: { name: Experience, default: 0, min: 0 }
level: { name: Level, default: 1, min: 1 }
points: { name: Ability Points, default: 2, min: 0 }
# rules: a reaction for each member as their XP reaches the threshold
level-up:
  on: { when: { acting.values.xp: { gte: 1000 } }, for: party.members }
  params:
    benefit: { name: Benefit, choices: [health, toughness, sanity, aether, skill, resilience] }
  do:
    - { effects: { acting.values.xp: -1000, acting.values.level: 1, acting.values.points: 1 } }
    - { ask: params.benefit }
    - { when: { params.benefit: health }, effects: { acting.values.max-health: '+{{1d4}}' } }
    # …
```

XP earned by the system's own deeds: an effect where they happen (a fight won, `on: encounter.end`; a Domain entered, `on: trip.place-enter` with its condition).

## 4. In our packs

**The Grey Marches** (every part, at full power, interconnected):

- **Renown**: each companion's XP, earned by the Marches' deeds already played: a fight won (`on: encounter.end`, for each member standing), a new region entered (`trip.place-enter`, `when: { place.region: … }` not seen before by that one), a barrow's last tomb, a Vow kept (their Legend track).
- **A companion's rank** (level 1–5), at each threshold: a reaction for each member asks a benefit (+1 max health, a skill pip, or **a knack**).
- **Knacks**, a catalogue of abilities in a place _Knacks_: _Woodwise_ (Pathfinding +1 in forests: a value made of knacks read by a condition on the place), _Iron Stomach_ (eats half: the eating effect reads it), _Shieldwall_ (an action in fights, open with a shield in hand), _Night Eyes_ (switched on: no torch needed at night, costs Nerve while on), each with requirements (a rank, a skill, another knack): a small tree.
- Showcase of: a reaction for each member, an ask of a written choice, a parameter listed from a catalogue by a condition, requirements, passive, active and switched-on abilities, `display: cards`.

**Core** (the smallest): `xp` and `level`; every fight won +1 xp for each standing; at 3, a level: +1 max health. One ability, _Tough_, given at level 2: a value made of it.

**Ker Nethalas** (to the letter, private): XP by the book's deeds, 1,000 a level, the eight benefits; the Masteries as abilities by tree (`tags: [mastery-<id>]`, `tier`), two trees at most (a requirement counting trees started), the amulet's third; Aether costs and Sustained; Perks; skill improvement at camp. Then the **Level Adaptation** of the 53 statblocks reads the PC's level (`party.highest.values.level`) in their values as they're made.

## 5. Phases

1. ✅ (2026-11-13) **Places that hold abilities**: a place's `takes` (a condition on the item), `carried: false` (no total room, and the total never stops what goes there) and `display: cards` (character-engine, character-ui's `ItemList`, Packs' place columns); the character's `cards` gone (state, templates, facts, OTD); Core's place _Abilities_ and _Tough_.
2. **A parameter listed from a catalogue by a condition**, with **requirements** on entries (travel-engine's params, session, character-engine), shared with _Factions that choose_; the Packs forms (an item's **Needs**, a parameter's **From a catalogue**).
3. **The Grey Marches' Renown, ranks and knacks**; Core's XP and level; tests that play a companion rising and learning.
4. **Ker Nethalas' Masteries and levels**, then its Level Adaptation.
5. Skill marks and improvement at camp (Ker Nethalas; the Grey Marches if a skill improves by use).

## 6. Decided with the user (2026-11-13)

1. **Abilities are items in a place of their own** (one machinery; a place with `display: cards` shows them as cards); the character's empty `cards` go.
2. **The Grey Marches: Renown, ranks 1–5 and a catalogue of knacks** with a tree of requirements, as in section 4.
3. **Requirements are checked when an ability is offered** (a level-up lists only those that hold); given by hand (the player, an effect) it's given all the same, with a warning.
4. **XP and level are each character's**, as their sheet says; a party played as a whole keeps them on its party sheet. Each system decides with its sheets.

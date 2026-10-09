# Character Engine — design

`@open-tabletop/character-engine`: character sheets whose values every other engine can read and change, and the player characters travelling together as the party. Like the other engines it is headless (plain TypeScript, no UI, no storage), pure (`(state, action) → { state, events }`) and knows no game: **what a sheet holds is declared by the system's packs**.

Status: **draft for the author to review** (2026-10-09). Section 7 lists the questions to settle; phase 1 (section 6) is built so there is something concrete to look at, and can still change freely (nothing persisted uses it yet).

## 1. What famous sheets have in common

Researched before designing, as the backlog asked (Ironsworn's bonds first, then others). What each game keeps on a sheet, and the generic shape behind it:

| Game                             | On the sheet                                                                                                                                                                                                                                                                  | Generic shape                                                                                                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ironsworn / Starforged**       | Stats 1–3 (edge, heart, iron, shadow, wits); meters health / spirit / supply 0–5, momentum −6..+10 whose max and reset fall with debilities; debilities (wounded, shaken, maimed…); assets (cards with abilities); **bonds**; vows                                            | numbers with bounds, **meters** whose max is itself a value, **conditions** that change other values, **cards** from the system, **relations**, **progress tracks** |
| — **bonds**                      | A progress track that fills each time you _Forge a bond_ with a person or community; a list of who they are. Read at the end (_Write your epilogue_)                                                                                                                          | a **relation** to someone or somewhere, with a progress track of its own                                                                                            |
| — **vows**                       | Each with a rank (troublesome … epic) that sets how much progress a milestone marks; fulfilled by a roll against the progress                                                                                                                                                 | a **track** with a rank, filled by moves, resolved by a roll (the same as journeys: see `advance`)                                                                  |
| **Blades in the Dark**           | Action ratings in dots under three attributes; stress 0–9 and **trauma** (permanent conditions); harm in three levels of slots; load; coin and stash; xp per attribute; playbook abilities; **friends and rivals**; the crew sheet                                            | ratings, a meter, **conditions that stay**, slots, xp **tracks**, cards, **relations with a kind** (friend / rival), a sheet for a **group**                        |
| **Fate**                         | **Aspects** (free text, invoked and compelled), skills on a ladder, stunts, stress boxes, consequences (mild / moderate / severe slots that recover over time)                                                                                                                | **tags with text**, numbers, cards, a meter, **conditions with a duration**                                                                                         |
| **Forbidden Lands / Year Zero**  | Attributes that are also health (damage lowers them); skills; talents; conditions hungry / thirsty / sleepy / cold that stop recovery; gear and encumbrance; consumables as resource dice (D12 → D10 → … stepping down); relationships; pride; dark secret; **journey roles** | numbers that take damage, conditions that **block** recovery, **items**, **resource dice** (a die that steps down), relations, tags, a **role for the day**         |
| **PbtA**                         | Stats −1..+3; moves; harm; **Hx / strings / bonds**: a number from each PC to each other                                                                                                                                                                                      | numbers, cards, a meter, **relations with a number**                                                                                                                |
| **Cairn / Knave / Mausritter**   | Three abilities; HP; **inventory slots** (fatigue and conditions take a slot); usage dots on items; scars; deprivation (no recovery while deprived)                                                                                                                           | numbers, **slots** that conditions fill, items with **uses**, conditions that **block** recovery                                                                    |
| **Ryuutama**                     | A **daily condition roll** that helps or hinders the day's checks                                                                                                                                                                                                             | a value of the day rolled at dawn (already possible in travel rules)                                                                                                |
| **Kal-Arath** (our private pack) | HP, attributes, Fate points; abilities (Explorer); wounds and conditions recovered by camping **with a ration**                                                                                                                                                               | numbers, cards, conditions cleared by an action only when a supply was spent                                                                                        |

Sources: the games' own rulebooks as the author and Claude know them; nothing of their text is copied, only the mechanisms (as for the reference systems in the backlog).

## 2. The generic pieces

Everything above is built from a handful of pieces. A sheet definition (`kind: sheet`, in a system's pack) says which ones it has, with ids, names and descriptions translated like any other kind:

1. **Values**: numbers with the `min` / `max` the system declares, or none (no implicit bounds, as in travel). A max may be a variable (`max: '{{maxHealth}}'`), which is how Ironsworn's momentum or a Cairn HP pool work. Grouped for display (`group: attributes`), nothing more.
2. **Tracks**: a value with `segments` shown as boxes (stress, xp, a vow's progress, a bond's track). Just a value with `min: 0`, `max: <segments>` and a look; ranks are a variable in the moves that fill them.
3. **Conditions**: named states a character has or hasn't (wounded, hungry, a trauma, a Fate consequence). Each may say what it **blocks** (an action, recovery, a way of travelling: the same `blocks` as values of the day), how long it **lasts** (until cleared, or N days on the world clock), and how it shows. Effects set and clear them (`character.conditions.wounded: true`).
4. **Tags**: free texts on a sheet (Fate aspects, Blades' heritage, a dark secret, a calling). Conditions read them (`character.tags: oathbound`); their text is the player's.
5. **Cards**: abilities, moves, talents, assets, defined in packs (`kind: ability`, each with a name, a description and, optionally, effects or roll modes they grant). A sheet lists which it holds.
6. **Items** (later): gear with `uses` (usage dots, resource dice), slots or weight; supplies stay the party's in travel unless a system wants them carried.
7. **Relations** (the bonds): `{ to, kind, value?, track? }` from a character to anything with a reference: another character (`character:id`), a faction, a POI, a hex (`hex:<map>/<col,row>`), a region, a note (`noteRef`). `kind` is the system's (bond, friend, rival, debt, home, oath); `value` a number (Hx, strings); a track for Ironsworn's bonds.

A system that doesn't declare a piece doesn't show it. A character is then: `{ sheet, values, conditions, tags, cards, relations }` on the OTD `Character` entity (`stats` today becomes `values`, read as such).

## 3. Interconnected

Each link goes through events, ports and shared OTD data, never through imports between engines:

- **Travel**: the party's stats come from its members, by rules the system declares (`party: { navigation: { max: survival } }`: the best; `min` for stealth, `sum`, `count` for mouths to feed). Effects can reach every member (`party.members.values.health: -1`), the one taking an action (`acting.values.wits`), or one by id. Conditions block what they say (a wounded character can't force a march). Kal-Arath's camp: wounds clear only if a ration was spent that night.
- **Journey roles**: a day's roles (lead the way, keep watch, forage…) are assignments of members; checks read the holder's values (`roles.lead.values.wits`), Forbidden Lands-style.
- **Oracle**: tables read the selected token's sheet or the acting character's (`character.*`); generators can **make a character** (an NPC from _Someone on the road_ becomes a sheet with values and a relation to where it was met).
- **Map**: characters are tokens (already); relations to places can be drawn as threads from a token to its bonded POI or home hex; entering a hex a character is bonded to is a fact (`hex.bonds: [kael]`), so a system can make coming home matter.
- **World clock**: conditions with a duration heal by days; long projects are progress clocks a character owns; birthdays and ageing if a system cares.
- **Journal and notes**: every change to a sheet is journaled with its reason; lore stays in the notes app (`noteRef`).

## 4. State and actions

```ts
interface CharacterState {
  id: string
  sheet: string // 'pack/id' of the sheet definition
  values: Record<string, number>
  conditions: Record<string, { since?: GameTime; until?: GameTime }>
  tags: string[]
  cards: string[] // 'pack/id' of abilities
  relations: { to: string; kind: string; value?: number }[]
}

type CharacterAction =
  | { type: 'change'; effects: Record<string, number | string> } // values, conditions
  | { type: 'addCard' | 'removeCard'; card: string }
  | { type: 'tag' | 'untag'; tag: string }
  | { type: 'relate'; to: string; kind: string; value?: number }
  | { type: 'unrelate'; to: string; kind?: string }
```

`create(sheet, overrides)` gives a new character with the sheet's defaults; `apply(sheet, state, action) → { state, events }` changes it within its bounds, with events like `VALUE_CHANGED`, `LIMIT_REACHED`, `CONDITION_SET` / `CONDITION_CLEARED`, `RELATION_ADDED`; `facts(sheet, state)` is what conditions and tables read (`values.*`, `conditions` as a list, `tags`, `cards`, `relations` by kind). Effects use the same syntax as travel (`'=3'`, `'-{{1d3}}'`, variables).

## 5. Where it's edited and played

- **Systems app**: a **Sheet** tab (its values, tracks, conditions, tags, cards, party rules).
- **A characters panel** (a `character-ui` package): the party's sheets in Travel and Hexmapper Play, a token's sheet in the Hexmapper; one sheet per character, edited by hand or by what happens in play.
- **Bundled packs**: the Grey Marches move their party stats into a sheet (each companion with Survival, Charisma…, the party taking the best or the sum), with relations to Ashford and the hirelings as characters; Core gets the simplest sheet (a few values and conditions); Kal-Arath its HP, attributes and wounds.

## 6. Phases

1. **The headless engine** (built 2026-10-09): `kind: sheet` (values with bounds, tracks, conditions with `blocks`, tags, cards, relation kinds), validated on load by the oracle-engine loader; `@open-tabletop/character-engine` with `create`, `apply`, `facts`, tests. Not yet used by the apps.
2. **The party is its members**: party rules in the sheet, the session reading members' values for party stats, effects on members and the acting character; the trips format with members (a migration).
3. **The characters panel** in Travel and the Hexmapper, and the Systems app's Sheet tab; manual pages.
4. **Relations** on the map and in conditions; **journey roles**.
5. **The bundled packs**: the Grey Marches and Core with sheets; Kal-Arath's camping and the review against its rulebook (backlog → Packs).

## 7. To settle with the author

- **Names**: `kind: sheet` and "values" (as in travel) vs "stats" (as in OTD and today's party stats).
- **The party's stats** once characters exist: always derived from members (the system's party rules), or still a sheet of their own that members add to?
- **Supplies**: the party's (as today) or carried by characters (inventory, slots)? Proposal: the party's, unless a system declares items.
- **NPCs and enemies**: the same sheets (one engine), or statblocks as a separate, lighter kind (backlog: statblocks and a bestiary)? Proposal: one engine, statblocks are sheets with fewer pieces.
- **How far relations go** in phase 4: drawn on the map, read in conditions, or both.

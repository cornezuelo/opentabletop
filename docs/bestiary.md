# The bestiary, and results that make things — design

Design for the backlog's _A bestiary_ (Characters engine) and the user's point 6, _Results that make things: entities from templates_, written together as agreed on 2026-10-29. **Decided with the user 2026-10-29**: section 8.

The asks, in the user's words: "en Characters nos falta algo estilo bestiario… poder editar fichas para monstruos aparte de PJs y PNJs" (2026-10-19); "el oráculo dice «3 lobos hambrientos», se generan tres lobos independientes saliendo de su template con sus hojas. El mecanismo sirve tanto para PNJ, objetos, lugares y otras entidades reconocidas por OTD" (2026-10-20); "necesitaremos una manera de representar varios tokens en el mismo hex… que seleccionar el hex muestre los tokens que hay en él" (2026-10-29).

Already decided (backlog, 2026-10-29): templates are **pack data**, a catalogue kind like `kind: items`, edited from a **Bestiary** in the Characters app into a user pack; unique NPCs stay roster characters, NPC types (guard, bandit) are templates like creatures, and **Keep in the roster** turns a copy into a unique NPC; the copies a result makes are kept in the trip as **those present**, a list beside the party read and changed by tables, conditions and effects, gone when the system says or by hand (the list point 9 will use too); drawn by themselves as tokens in Map (up to about 6 apart, then one token **×N** per template, a **+N** chip as the last resort, a **Here** list in a selected hex's panel, a map setting to always draw them apart) and in a box in Travel.

## 1. How games do it

| Game                      | A creature's (or NPC type's) entry                                                   | How many                                        | Groups                                              | What it carries                |
| ------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------- | --------------------------------------------------- | ------------------------------ |
| **D&D 5e**                | a full statblock: AC, HP (as dice), speed, six abilities, attacks, traits, CR        | the encounter's text                            | swarms are one creature                             | treasure tables by CR          |
| **B/X, OSE**              | AC, HD (HP rolled per creature), attacks, movement, saves, **morale**, alignment, XP | **number appearing** (`2d4`, `3d6` in its lair) | each separate, morale checked for the band          | a **treasure type** (a letter) |
| **Shadowdark**            | one line: AC, HP, attack, movement, the six modifiers, level, a talent or two        | the encounter table's text                      | each separate                                       | loot tables                    |
| **Cairn, Mausritter**     | HP, Armour, three saves, an attack's die, a critical damage line                     | the table's text                                | **a warband**: many as one, with more HP and Armour | a line                         |
| **Ironsworn**             | a **rank** (troublesome → epic), features, drives, tactics; no numbers but the rank  | narrative                                       | a pack as one foe of a higher rank                  | none                           |
| **Fate**                  | aspects, skills, stress; nameless NPCs a single skill and no stress                  | narrative                                       | **mobs**: nameless NPCs join and share stress       | none                           |
| **Blades in the Dark**    | no statblock: a **threat level**, and a clock to overcome it                         | narrative                                       | a gang as one, by its scale                         | none                           |
| **Forbidden Lands**       | attributes, armour, skills, and **its own table of attacks** (roll a d6 each turn)   | the encounter's text                            | each separate                                       | a line                         |
| **Mothership**            | Combat, Instinct, Wounds, Hits; a sentence of what it wants                          | narrative                                       | each separate                                       | none                           |
| **The Grey Marches** (us) | nothing but text: "`{{1d4+2}}` grey wolves — they are `{{result}}`"; morale −1       | a roll in the text, forgotten once shown        | —                                                   | —                              |

What they share, once the names are taken away:

1. **A sheet of its own, lighter than a player's** (or as heavy, D&D), often of another shape (Ironsworn's rank, Blades' clock): a sheet like any other, declared by the system.
2. **Numbers that differ per copy**: hit points rolled for each (`2d8`), the rest the same.
3. **How many come**: a roll, often depending on where (in the lair).
4. **Many as one, or each apart**: a warband or a mob is one character with bigger numbers; a pack of wolves is several. A system chooses by how it writes its templates; the engine needs nothing for it.
5. **Variants**: a wolf, a dire wolf, the pack leader: one entry and what's different.
6. **What it does in a fight**: attacks as text, a table of its own (Forbidden Lands), a morale to check: tables and values a system already has.
7. **What it carries**: items, or a treasure table to roll.
8. **A name** for an NPC type: "a bandit" becomes Hrolf the bandit, from a name generator.

## 2. What the engine has already, and what it lacks

Already: sheets for anything (values with bounds, rolled defaults through `{{…}}`, conditions that block and hold by themselves, tags, cards, items, relations); a system may use several sheets (`sheet`, `partySheet`, the factions'); catalogues (`kind: items`) whose entries are copied onto a character (`itemFromCatalogue`, keys `torch`, `torch-2`…); results with `set` (evaluated first, read by the text and the effects) and `effects` the host applies (`party.members.values.dread: 1`, `party.items.ration: 1`); a token with a sheet in Map (`MapToken.character`), read as `token.*`; the roster, with characters playing in one place at a time; the Names pack and generators.

Missing, all generic:

- **Templates of characters**: a catalogue whose entries are characters of a sheet, copied with their own rolls.
- **Somewhere for copies to be** during play: today a trip has its party and members only.
- **Effects that make copies**, read and changed like the members are.
- **Drawing many tokens on one hex**, and the play state's characters drawn as tokens without being map definitions.

## 3. The pieces

### 3.1 Templates: `kind: bestiary`

A catalogue of characters, as `kind: items` is a catalogue of items. Each entry is a character of a sheet, written as its state is, with variables and rolls filled in **for each copy**:

```yaml
kind: bestiary
id: beasts
name: Beasts of the Marches
sheet: sheet.beast # every entry's sheet, unless the entry names its own
behind: leave # copies left behind are gone (absent: they stay); an entry may say otherwise
templates:
  grey-wolf:
    name: Grey wolf
    description: Lean and patient; they hunt in packs and break when the leader falls.
    tags: [beast, pack]
    values: { health: '{{2d4}}', bite: 2 } # each wolf rolls its own health
    token: { icon: wolf, kind: enemy } # how it's drawn on a map (absent: the kind's default)
  wolf-leader:
    like: grey-wolf # a variant: the wolf's, and what changes
    name: Pack leader
    values: { health: '{{3d4}}', bite: 3 }
    tags: [leader]
  bandit:
    sheet: sheet.companion # an NPC type on the companions' own sheet
    name: Bandit
    names: generator.npc-name # each copy named by a generator (absent: "Bandit", "Bandit 2"…)
    values: { might: 1 }
    items: { gear.knife: 1, gear.ration: '{{1d2}}' } # from the system's catalogues
    conditions: [outlaw]
```

- `sheet`: the catalogue's default and an entry's own; a sheet of this pack or a dependency's, like the system's parts.
- `values`, `conditions`, `tags`, `cards`, `items`, `relations`: as a character's state, numbers or `{{…}}` (rolled per copy); what's left out takes the sheet's defaults (and its `items.start`, as `createCharacter` does today).
- `like`: a variant of another template of the same catalogue; chains allowed, a loop refused on load.
- `names`: a table or generator rolled for each copy's name.
- `token`: its look on a map (an icon, a kind, a colour), all optional.
- `behind`: what happens to its copies when the party leaves them behind, `stay` or `leave` (section 3.3); the catalogue's default and an entry's own.
- Translated in `locales/` like any definition (`bestiary/beasts`, keyed by template).
- The system lists its catalogues: `bestiary: [bestiary.beasts, bestiary.folk]` in `kind: system`, beside `items:`.

### 3.2 A copy

A copy is a plain character (`CharacterState`) with one more field, the template it came from (`template: grey-marches/bestiary.beasts#grey-wolf`). It's taken **once**: its numbers rolled, its items copied; later changes to the template don't touch copies already made (like items from a catalogue). Ids are made from the template's (`grey-wolf`, `grey-wolf-2`…, unique among the trip's characters), names from `names:` or numbered.

### 3.3 Those present

The trip keeps the copies it made (`present`, beside `members` in session's state), **each where it was made** (the hex, or the way's place in Travel). **Those present are the ones at the party's place**: what tables, conditions and effects see. **What happens to those left behind is the system's** (the user, 2026-10-29: a system may prefer a new encounter rolled every time the hex is visited): `behind:` on the catalogue, or on a template, says it:

- `behind: stay` (the documented default): moving on leaves them behind, still drawn where they were on the map and back among those present if the party returns. A lair, a camp, a guard at a bridge.
- `behind: leave`: they're gone when the party leaves their place (a `PRESENT_LEFT` line), so the next visit rolls its encounter afresh. Wandering wolves, a patrol, a crowd.

Anything subtler (they follow for a day, they come back at night) is an action or a reaction of the system's, reading those present and the time (built with phase 1: no `self.here` yet; a copy's own conditions don't see where it is).

Effects, with the paths party members already use:

| Effect                                     | What it does                                                        |
| ------------------------------------------ | ------------------------------------------------------------------- |
| `present.grey-wolf: 3`                     | three grey wolves come, each a copy of the template                 |
| `present.grey-wolf: '{{wolves}}'`          | as many as the entry's `set` rolled (the same number the text says) |
| `present.grey-wolf: -1`                    | one fewer (the last that came)                                      |
| `present.grey-wolf: '=0'`                  | every grey wolf here gone                                           |
| `present.grey-wolf.values.health: -2`      | every grey wolf here (as `party.members.values…` is every member)   |
| `present.all.conditions.fled: true`        | every copy here, whatever its template                              |
| `characters.grey-wolf-2.values.health: -2` | one copy, by its id, as one member is changed today                 |

Reads (as built): `present.ids` (the ids here), `present.count`, `present.tags` (every tag of those here), `present.<template>.count` and `.ids` (every template of the system, at 0 when none is here), and each copy here as `characters.<id>.*`, as members are read. `all`, `count` and `tags` can't be a template's id (as `tags` can't be an item's).

**Gone when the system says**: a sheet condition with `leaves: true` takes a copy off the trip when it holds, with a journal line (`dead: { when: { self.values.health: { lte: 0 } }, leaves: true }`; `fled`, `bought off`); without one, copies stay until an effect or the player removes them. An effect `present.<template>: -N` and the × on the card do the rest.

Journal lines (codes the UI words): `PRESENT_CAME` (who, how many, from which result), `PRESENT_LEFT` (who, why: a condition, an effect, by hand).

### 3.4 Results that make things, beyond characters

Point 6 asked for the same mechanism for NPCs, items, places and other OTD entities. With 3.1–3.3 it's one rule: **an effect on a destination path, with the id of a template from one of the system's catalogues**:

- **Characters**: `present.<template>` (this design).
- **Items**: already there: `party.items.rope: 1`, `acting.items.torch: 2`, from `kind: items`. A copy's items (the bandit's knife) are its own; what happens to them when it leaves (left on the ground, taken by the party) is a step the system writes (`party.items.knife: '{{…}}'`), nothing built in.
- **Places**: a catalogue `kind: places` (name, description, icon, fields, tags, texts with `{{…}}` filled from the result's values) and `hex.pois.<template>: 1`, adding a POI to the party's hex in Map (where the trip has no map, Travel notes it in the journal). Today a result becomes a POI only by hand. A later phase (section 7).
- **Clocks, world events, factions**: not now. Clocks already start and tick by effects (`world.clocks.<id>`); events and factions that come from a result belong with points 8 and 5's world steps when one is missed.

Why effects and not a new `creates:` key (the backlog's first sketch): effects already go wherever the host has the thing, add up, take `set` values and rolls, are refused with a journal line where the host lacks it, and are what actions' steps, deck cards and world reactions write too. A `creates:` would be a second vocabulary for the same act.

## 4. Where they're seen

- **Travel**: a **Here** box beside the party: those present as folded cards (`CardHead`: name, template, a one-line summary of the values the sheet shows first), grouped by template with **×N** when several, each unfolding into its `CharacterCard` (edited by hand like a member's); **×** removes one (asked first: it's play state Ctrl+Z can't undo); **Keep in the roster**; **+ Add** from the system's bestiary by hand, as Map's tokens are added. Those left behind on earlier places are counted under it (_4 left behind_), unfoldable.
- **Map, in Play**: those present and those left behind drawn on their hexes, from the play state, never written into the map's tokens (definitions ≠ state). A hex with up to about 6 tokens draws them apart as `layoutTokens` does; beyond, the copies of one template as one token with a **×N** badge; past what fits, a **+N** chip. Selecting a hex lists **Here** what stands on it (the party, those present, tokens placed by hand), each with its state, a group unfolding into its copies; clicking one opens its card. **Map settings → Draw copies apart** turns the grouping off.
- **Map, in Edit**: **Place from the bestiary** makes a token (a map definition, `MapToken.character` with its `template`), for a fixed guard or a lair; it's the map's, and Play reads it as today (`token.*`).
- **Keep in the roster**: a copy becomes a roster character (its own id and name, `template` kept as where it came from), linked to the trip where it plays, as members are (`RosterPlace`). It stays among those present until it leaves.

## 5. Making templates: the Bestiary

- **The Characters app gets a Bestiary** beside the roster: every template of the systems' catalogues and of the user's packs, by system, filterable by tags, with a search; each shown as the card of one example copy (its rolls as `2d4`, not rolled) and its texts.
- A bundled template is read-only, with **Copy to my pack**; a user pack's is edited in place: name, description, sheet, `like`, its values (number or roll), conditions, tags, items from the catalogues, names, token look. Saved into the user pack chosen (or a new one, which depends on the system's pack so its sheets and catalogues resolve).
- **How a user's bestiary reaches a system it doesn't belong to**: through the packs a map or campaign adds (already chosen in Map settings → Campaign and in Travel): every `kind: bestiary` of an added pack joins the system's own, as its tables join the Oracle. No list in the system to edit.
- **Systems** gets a **Bestiary** tab beside **Items**, the same form, for a system's own catalogues (as items' catalogue is edited there, inventory 8 e).

## 6. The bundled packs

- **The Grey Marches** (every part, interconnected): a creature sheet `beast` (health, bite, morale; _Down_ that `leaves`, _Fled_), a bestiary with grey wolves, the pack leader as a variant, the Ember Hunt's riders, the Greywood Wyrm (it comes once, as its encounter already does), bandits and the Vale's patrol on the companions' sheet with names from the pack's own generator. Encounters make them: the wolves `set: { wolves: '{{1d4+2}}' }`, text `{{wolves}} grey wolves`, `effects: { present.grey-wolf: '{{wolves}}', present.wolf-leader: 1 }`; an action _Drive them off_ reading `present.count` and the leader's state, a reaction when the leader leaves (the pack `fled`); the morale step reading those present; the example map's lair placed from the bestiary in Edit. A test plays it on the example map through Map.
- **Core and the Generic rules** (the smallest that works): one template, `foe`, on the Generic sheet, with health rolled, a _Down_ that `leaves`; an encounter of Core's that makes one. Its test plays it.
- Both packs' manual pages; descriptions with **Shows:** / **Enseña:**.

## 7. Phases

1. ✅ (2026-10-29) **Headless**: `kind: bestiary` (character-engine: `parseBestiary`, `like`, `copyOf(template, rolls, taken ids)`), `bestiary:` in `kind: system` and added packs' catalogues (session), the trip's `present` with places, `present.*` effects and reads, `characters.<copy>`, `leaves`, journal codes; saved trips and maps keep the list (no format change: absent is none). The bundled packs' templates and encounters, tests that play them. Manual: Kinds, What tables see, Syntax, Conditions' lists, both packs' pages.
2. ✅ **The apps**: Travel's **Here** box; Map's drawing of play state's copies (grouping, ×N, +N, **Here** in the hex panel, the map setting) and **Place from the bestiary**; **Keep in the roster**. Manual: Travel's Playing, Map's Play and Tokens, Characters.
3. ✅ **Editing**: the Characters app's **Bestiary** and Systems' **Bestiary** tab, sharing the form; YAML suggestions. Manual: Characters, Systems.
4. ✅ (2026-10-30) **Places from results**: `kind: places` and `hex.pois.<template>`, with the Grey Marches' discovery making ruins and shrines as POIs.

Each phase brings its manual pages and its part of the bundled packs, in English and Spanish.

## 8. Decided with the user (2026-10-29)

The user approved Claude's recommendations ("me parece bien en general"), with **b** changed:

- **a.** `kind: bestiary`.
- **b.** **The system decides** what happens to copies left behind (the user: "lo de que sean persistentes o no tendrá que decidirlo el sistema, puede haber algún sistema que prefiera volver a tirar un nuevo conflicto cada vez que se visita el hex"): `behind: stay | leave` on the catalogue or a template, `stay` the documented default (section 3.3). Each copy is kept where it was made; those present are the ones at the party's place.
- **c.** `present.<template>` to make and count, `present.<template>.…` / `present.all.…` for every copy, `characters.<id>` for one: the members' vocabulary.
- **d.** A sheet condition's `leaves: true` takes a copy off by itself; effects and the player do the rest.
- **e.** Copies keep what they were made with; editing a template changes only copies made after.
- **f.** A user's bestiary reaches a system through the packs a map or campaign adds.
- **g.** Systems gets a **Bestiary** tab too, sharing the Characters app's form.
- **h.** Places from results (`kind: places`, `hex.pois.<template>`) are the last phase.

Phase 4, decided with the user (2026-10-29), Claude's recommendations:

- **i.** Built now, small: POIs on hexes from a `kind: places` catalogue; point 7 reuses the catalogue for rooms and pieces.
- **j.** A place made in play is written into the map, as discovery writes terrain and POIs today, editable like any POI, with **Made from** its template.
- **k.** Discovery's contents keep making a plain POI from their text; an entry may name a template instead (`effects: { hex.pois.shrine: 1 }`) for its icon, fields and tags. The Grey Marches' ruins and shrines move to templates.
- **l.** A trip without a map (Travel) only notes the place in the journal; point 7 gives such trips places of their own.

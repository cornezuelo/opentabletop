# Where a name is used — design

Design for the backlog's _Where a value is used_ (Alpha 0.1, third round, item 18). The user's ask: "no termino de encontrar el uso de `roles.guide.values.pathfinding` en las pestañas del sistema; sí veo que se usa en travel-tables.yaml pero no veo el reflejo en Reglas". **Agreed 2026-10-19** (section 8: the author left the choices to Claude).

## 1. The problem

A system declares names in one place and reads them in many others, and nothing joins them:

| Declared in                                      | Read or changed in                                                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Systems → **Checks**: party stats, roles         | travel rules (actions' `when` / `unless`, `{{…}}` in steps), checks, **tables** (`modeWhen`, entries' `when`, `roll`, `{{…}}`)              |
| Systems → **Sheet**: values, conditions, tags    | stats (`from: { max: pathfinding }`, `from: { party: morale }`), roles (`roles.guide.values.pathfinding`), tokens, bounds (`{{maxHealth}}`) |
| Systems → **Rules**: supplies, values of the day | actions' effects and `set:`, checks' outcomes, tables' `set` / `effects`, conditions (`today.lost`, `yesterday.lost`)                       |
| bindings' `reads` (`danger`, `icon.guards`…)     | tables and checks; the map's hexes, icons and tokens give them                                                                              |
| clocks, factions                                 | `world.clocks.<id>`, `hex.faction`, factions' turns                                                                                         |

The Grey Marches' Pathfinding is a sheet value; the stat **Navigation** takes the best of it (`from: { max: pathfinding }`, Checks), and the table _Getting lost_ reads the guide's (`roles.guide.values.pathfinding` in its `modeWhen`, a definition of the Oracle). Systems shows the first and never the second: tables aren't part of any tab.

## 2. What is proposed

One **index of uses**, built headless from the system's packs, and two ways to see it:

1. **Used by**, beside each name where Systems declares it (a stat, a role, a sheet value, a supply, a value of the day, a read): a small `Used by · 3` that unfolds into the list of places, each a link.
2. **Find a name**, on the system's Overview: type `pathfinding` (or `morale`, `danger`…) and see every place that reads, changes or sets it, with the same links. It also finds names nobody declares (a typo in a table: `roles.guide.values.pathfindng`).

Later (phase c), the trip panel's help for a stat, role or value adds a line saying what reads it (section 6).

## 3. The index (`@open-tabletop/session`, `usage.ts`)

`systemUses(registry, system) → Use[]`, with `declaredOf` (what gets a Used by), `usesOf` (one thing's uses) and `usesNamed` (Find a name), pure and tested (`usage.test.ts`), in session because it's the layer that already knows systems from packs (`travelSystems`), bindings and the suggestions (`contextSuggestions` walks conditions in the same way).

```ts
interface Use {
  /** The name as written (`morale`, `{{party.stats.morale}}` → `party.stats.morale`). */
  written: string
  /** Its full name, short names resolved (`morale` → `party.stats.morale`). */
  name: string
  /** reads (a condition, a `{{…}}`), changes (effects), sets (`set`, a check's outcome), derives (a stat's `from`). */
  how: 'reads' | 'changes' | 'sets' | 'derives'
  /** Where: the definition and the path inside it. */
  at: { kind: string; pack: string; id: string; path: string } // path: `actions.march.when`, `modeWhen.advantage`, `entries[3].when`
}
```

What it walks: every definition of the system's pack and of the packs it depends on (the travel rules, bindings, tables, oracles, generators, decks, sheets, clocks, factions, calendar, weather models). Per kind, the places that hold a **condition** (`when`, `unless`, `modeWhen.<mode>`, `halt` / `onward` and steps' conditions, a stat's `from.unless`, factions' turns…), **effects** and **set** maps (their keys are names changed or set), a stat's **`from`** (`max` / `min` / `pick` / `sum` name sheet values, `party` a party sheet value), and **every text** for `{{…}}` (dice left out, as `contextVariables` does).

Short names become full names with the same table the engines read them by (`FACT_PATHS`, a stat's own name → `party.stats.<id>`); a name that matches nothing stays as written. Uses are matched to declared things by rules, not by text:

| Declared thing            | Uses that point at it                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| stat `navigation`         | `party.stats.navigation`, `navigation` (short), `{{…}}` of either                                                                                                                                                                                                                                                                                                                                                                        |
| role `guide`              | anything under `roles.guide.…`                                                                                                                                                                                                                                                                                                                                                                                                           |
| sheet value `pathfinding` | a member's (`party.members`, `characters.<id>`, `acting`, `roles.<id>`, `token`) `.values.pathfinding`; `party.values.…` or `faction(s).….values.…` for the party's and the factions' sheets; a stat's `from: { max: pathfinding }`; a bound `{{pathfinding}}` (or `{{values.pathfinding}}`) in the same sheet, read as `self.values.pathfinding`; a party value also gets the uses of the stats that are it (`from: { party: morale }`) |
| sheet condition           | the same owners' `.conditions` with that value, or `.conditions.<id>` in effects; `from.unless: { conditions: wounded }` (sheets declare no tags)                                                                                                                                                                                                                                                                                        |
| supply `food`             | `party.resources.food`, effects' `food`, `trip.spent.food`, `trip.gained.food`, `trip.below: food`                                                                                                                                                                                                                                                                                                                                       |
| value of the day `lost`   | `today.lost`, `yesterday.lost`, `lost` (what was set today is in the context as itself), `set: { lost: … }`                                                                                                                                                                                                                                                                                                                              |
| read `danger`             | `hex.danger`, `danger`, `from.danger`, `today.danger` (a value a table sets for later ones: `set: { fordModifier: -1 }`)                                                                                                                                                                                                                                                                                                                 |
| clock `winter-comes`      | `world.clocks.winter-comes`, an `advance` step on it                                                                                                                                                                                                                                                                                                                                                                                     |

What it can't see, and says so in the manual: names built at play time (`{{roles.{{who}}.values…}}` isn't valid anyway), what the engines read by themselves (the march's hours), and maps' own values (a hex's `danger` is given by the map, not read from a pack).

## 4. Used by, in Systems

Beside each declared thing in its row (Checks' **Party stats** and **Roles**, Sheet's **Values**, **Conditions** and **Tags**, Rules' **Supplies** and **Values of the day**, and the bindings' reads), a small toggle `Used by · 3`. Unfolded, one line per use, grouped by definition:

> **Getting lost** · table — reads it in **Roll modes by themselves** (advantage) ↗
> **Navigation** · party stat — takes the best of it ↗
> **March** · action — reads it in **When** ↗

Each link goes where the use can be edited: an action or check to its row in Rules / Checks (the row unfolds and scrolls into view), a sheet's value to the Sheet tab, a table, oracle or generator to the Oracle app (`oracle/#/def/<pack>/<id>/edit`). A thing with no uses says **Not used yet**, which is often a mistake worth seeing (a stat no table reads); it isn't a problem of the system, only a note.

## 5. Find a name, on the Overview

A field under the system's parts, with suggestions (every name the index met, and every declared one). It lists the same lines as **Used by**, grouped by how (reads, changes, sets, derives). A name nobody declares gets a note: **Nobody declares it**, with its close names (`pathfindng` → `pathfinding`?) — often a typo. Its help (InfoTip) explains full and short names.

## 6. In the trip panel (phase c)

A stat's, role's or value's help in the trip panel (Hexmapper and Travel) already shows its description and how tables read it; it gains a line **Read by: Getting lost, Encounter · Changed by: Forage, Camp**, the definitions' names only (no links: playing isn't editing), and an **Open in Systems ↗** link to the name's Used by.

## 7. Phases

- **(a)** The index in session (`usage.ts`) with tests on the Grey Marches (Pathfinding found in _Getting lost_'s `modeWhen` and in Navigation's `from`; Morale changed by the encounters; `today.lost` set by _Getting lost_, read by tomorrow's `modeWhen`), Core and a made-up system for each row of section 3.
- **(b)** Systems: **Used by** on each declared row, **Find a name** on the Overview, the links (Rules / Checks rows that open on a hash); manual: Systems' Overview, Rules, Checks, Sheet en/es; the Grey Marches page (Pathfinding as the example).
- **(c)** The trip panel's help line and **Open in Systems ↗** (travel-ui); Hexmapper's Play and Travel's Playing en/es.

## 8. Decided (2026-10-19)

The author: "lo que a ti te parezca mejor". Claude's choices:

1. **Both views**: Used by on each declared row (where you are when you wonder) and Find a name on the Overview (for names nobody declares, and typos). They share the index, so the second costs little.
2. **Now, the names of section 3** (stats, roles, sheet values, conditions and tags, supplies, values of the day, reads, clocks). Ids read as values (actions, ways of travelling, terrains, edges, weather, parts of the day) wait for item 25, which gives them full names; the index is written so they're one more row of section 3's table then.
3. **Not used yet** is a quiet note on the row, never a problem of the system (a stat may be there for the player to read).
4. **The trip panel's line** goes in as phase (c) of this item, after (a) and (b), not left for later: it's where the author met the question.

# Terrain with memory — design

Design for the backlog's item 27 (_Terrain generation with memory (Markov), no hurry_). The user's ask (2026-10-18): "apunta el Markov para generación de terreno también, que estaría interesante". **Agreed 2026-10-20:** a design document first, no code yet. This is that document, for the user to review: section 8 lists what needs a decision.

## 1. What there is today

- **Discovery** (session's `discovery.ts`, the bindings' `discover:`): when the party sees or enters an empty hex, a table decides its terrain (`discover.terrain: { resolve: table.next-terrain }`) and another what is there (`discover.contents`). The table sees the land around the hex being decided: `from.terrain`, `around.<terrain>` (how many known neighbours have it), `common` and `commonCount` (the commonest), `aroundCount`.
- The Grey Marches' _The land ahead_ (`discovery.yaml`) does "memory" by hand: water gathers when two neighbours are water, the commonest land goes on 1–3 on a d6, its kin 4–5 (a table per kind of land), anything on a 6. It works, but every system that wants coherent land writes the same cascade, and the odds are hard to read ("how often does forest stay forest?").
- **Weather models** (`kind: weather`, weather-engine) already solve the same shape of problem in time: per season, for each kind of weather, the weights of tomorrow's. Their form (Systems' **Weather** tab: a grid of chance tables, **Over many days**) is what people already know.

## 2. The idea: a land model, chance tables in space

A **land model** (`kind: land`) says, for each terrain, how likely a hex next to it is to be each terrain. A forest says "forest 6, hills 2, plains 2, lake 1"; mountains say "mountains 5, hills 3". An empty hex is decided from **all its known neighbours at once**: each one's row is added up, so a hex between forest and hills leans to both, and one surrounded by water is almost surely water.

```yaml
kind: land
id: default
name: The land of the Marches
# For each terrain, the weights of a neighbouring hex's terrain.
next:
  forest: { forest: 6, dense-forest: 2, hills: 1, plains: 1 }
  dense-forest: { dense-forest: 5, forest: 3 }
  plains: { plains: 5, farmland: 2, forest: 1, hills: 1, heath: 1 }
  hills: { hills: 4, mountains: 2, forest: 2, plains: 1 }
  mountains: { mountains: 5, peaks: 1, hills: 2 }
  lake: { lake: 6, marsh: 2, plains: 1 }
  # A terrain the model doesn't list adds nothing; with no known neighbour at all, `start`.
start: { plains: 3, forest: 2, hills: 1 }
```

- **Adding rows** (section 3) is the "memory": the land around pulls the next hex towards itself, so forests, ranges and lakes grow together.
- Weights, not dice: the form shows each row as chances (as weather does), and **Over many hexes** estimates the land's mix (a long run on an empty grid, seeded).
- Ids are the system's terrains (`hex.terrain`); the form suggests them, and a terrain the rules don't know is a warning, as everywhere.

## 3. How a hex is decided

1. Its **known neighbours**: the six around it that have a terrain (painted, or decided already). Water counts like any terrain (`lake`, `sea`).
2. **Their rows, added up**: for each neighbour, its terrain's row from `next`. Two forest neighbours count the forest row twice. Optional per-model weight of the hex left (`from:`, section 8 b): the land you come from counts more.
3. With **none known**, `start`.
4. One weighted pick with the trip's or the generation's `RandomSource` (`weightedIndex`, already in `random`): seeded, so the same seed and order draw the same land.
5. **When the model can't say** (every weight 0, a row missing for every neighbour): `start`, and if that's empty too, nothing is decided (the hex stays empty, as a table with no entry).

The result is only a terrain. What is **in** the hex (a POI, tags, a name) stays the tables' job (`discover.contents`); roads and rivers aren't generated.

## 4. Where it plays

- **Discovery**: the bindings name a model instead of a table, as checks name weather models: `discover: { terrain: { land: land.default } }` (beside today's `{ resolve: table.next-terrain }`, which keeps working: a system chooses). The session asks the land engine instead of the Oracle; the journal says _Discovered: forest_ with how it was chosen in **Everything** (_from forest ×2, hills ×1_), as weather says its row.
- **The Hexmapper's Generate**: a tool (or a command on a selection or region) that fills the **empty hexes of an area** with a model: the map's system's, or any model of its packs. Order: from the known land outwards (the hexes with most known neighbours first, ties by coordinates), so the land grows from what you painted; seeded (a seed box, **Again** for another draw), one step for ↶. It never changes painted hexes.
- **A table can still read it**: nothing new; a table may keep deciding special hexes after or instead (a system that wants a model "but water first" writes the table and lets its last entry hand over to the model: section 8 d).

## 5. Pieces and dependencies

- **A new headless package, `land-engine`** (plain TypeScript, no DOM): `validateLand(raw)`, `nextTerrain(model, neighbours, random, from?)` with how it chose, `generate(model, area, known, random)` for the Hexmapper (the order of section 4). Depends on `random` and `hex` only. Engines don't import each other: the weighted pick is already `random`'s `weightedIndex`, shared with weather-engine.
- **schema / oracle-engine**: `kind: land` known to packs (loaded as an extra like `kind: weather`), validated on load (weights ≥ 0, `next` keys and their targets are strings; unknown terrains a warning against the system's rules).
- **session**: the discovery binding `land:`, a system's `land:` list in `kind: system` (as `weather:`), `systemUses` (**Used by** a terrain now includes the models that name it).
- **Systems**: a **Land** tab like **Weather**: the model's rows as chance tables (a grid: rows are "next to", columns "becomes"), **Start**, **Over many hexes** (a small preview: a seeded patch of land drawn from it, in the Hexmapper's terrain colours, and the mix as percentages).
- **Hexmapper**: **Generate** (section 4) in the terrain tool, its help, the journal's discovery line.

## 6. The bundled packs

- **The Grey Marches** keep _The land ahead_ as the showcase of tables that read `around`, and gain a land model used by **Generate** for their unpainted east (and by discovery on the Hollow Hills, so both mechanisms are played somewhere). Shown in their page, as usual.
- **Core**: the Generic rules get a small universal model for the Hexmapper's natural palette (forests stay forests, hills gather into mountains, water into lakes), so any map can be generated; discovery stays off by default, as today.

## 7. Documentation

Systems' **Land** page (how a model works, a walkthrough with a picture of a patch growing from two painted hexes, common mistakes: a row that never comes back to itself makes a patchwork, a terrain the rules don't know), Kinds (`kind: land`), Connecting (the discovery binding), the Hexmapper's terrain page (**Generate**), both packs' pages; en and es. Manual examples loaded by the test, a walkthrough test that generates a seeded patch.

## 8. To decide with the user

a. **The name**: `kind: land` (short, as `kind: weather`), or `kind: terrain-model`. Proposal: `land`.
b. **The hex left counts more?** Moving across, the land you come from could weigh double (`from: 2`), so a road through forest stays in forest. Proposal: yes, as a model's optional number, default 1 (all neighbours alike).
c. **Regions or conditions per row** (mountains only in the north): rows with `when:` (a condition on the hex: `hex.region`, `around.water`…) would make it as expressive as tables. Proposal: not in the first version; a table before the model covers it (d).
d. **Tables and models together**: let a table entry hand the decision to a model (`land: land.default` on an entry, like `table:` cascades), so "water first, then the model" is one binding. Proposal: yes, small and general.
e. **Generate in the Hexmapper**: a tool of its own, or a command on the terrain tool (brush a zone, then **Generate**). Proposal: a command on the selection and on a region's panel (**Generate its empty hexes**), no new tool.
f. **Order of priority**: it stays "no hurry"; this design waits for the user's go and a place in the order.

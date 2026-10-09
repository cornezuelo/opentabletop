import { vocabulary } from '@open-tabletop/ui-kit'
// Source of truth for UI strings (English is the default locale). `es.ts` mirrors this shape.
export const en = {
  app: {
    title: 'Systems',
    tagline: 'Make and edit game systems.',
  },
  nav: {
    showSidebar: 'Show the systems list',
    hideSidebar: 'Hide the systems list (more room)',
    showHelp: 'Show the help',
    hideHelp: 'Hide the help (more room)',
    systems: 'Systems',
    generic: vocabulary.en.terms.genericSystem,
    help: 'Help and manual',
    undo: 'Undo the last change to your packs (Ctrl+Z)',
    redo: 'Redo (Ctrl+Shift+Z)',
    newSystem: 'New system',
    import: 'Import a system (.zip)…',
    problems: '{count} problems',
    builtIn: 'built in',
  },
  origin: {
    bundled: 'bundled',
    edited: 'edited',
    personal: 'personal use',
    user: 'yours',
    updated: 'update',
  },
  welcome: {
    title: 'Systems',
    body: 'A system is what a game is played with: its travel rules (how fast you go over each terrain and road, what you carry, what the party can do), the checks rolled on the way and the tables that answer them. Pick one on the left to see and edit it, or create a new one below the list. Bundled systems are read-only: edit a copy. Play them in the Travel app (trips without a map) or on a map in the Hexmapper.',
  },
  tabs: {
    overview: 'Overview',
    rules: 'Rules',
    checks: 'Checks',
    sheet: 'Sheet',
    factions: 'Factions',
    calendar: 'Calendar',
    weather: 'Weather',
    modes: 'Roll modes',
    try: 'Try it',
    yaml: 'YAML',
  },
  parts: {
    factions: {
      title: 'Its factions',
      intro:
        "The powers of its world (`kind: factions`): each a character of a sheet (its values, conditions and relations) holding land on a map. On every world turn each one rolls a table, and what comes up changes it, another faction, its territory or the world clock's progress clocks. In the Hexmapper they're brought onto a map in the World panel.",
      help: 'One factions definition per system, named in its **Overview** (`factions:`). Tables and conditions read them anywhere:\n• `factions.the-crown.values.strength: { gte: 3 }`\n• `hex.faction: the-crown` — who holds the hex\nTheir turn tables change them with effects:\n• `faction.values.strength: 1` — the faction whose turn it is\n• `factions.the-rebels.values.strength: -1` — another\n• `faction.territory: 1` — a hex more, from its border\n• `world.clocks.the-siege: 1` — a progress clock of the world clock',
      none: 'This system has no factions.',
      create: 'New factions',
    },
    sheet: {
      title: "Its characters' sheet",
      intro:
        "What each character of the party has: values with their bounds, conditions and the relations they hold. With a sheet, a trip's party can be made of characters, and the **Checks** tab says which party stats come from them and which supplies they carry.",
      help: 'One sheet per system (`kind: sheet`), named in its **Overview** (`sheet:`). Conditions and tables read each character:\n• `characters.kael.values.health: { lte: 1 }` — one by id\n• `acting.values.wits: { gte: 3 }` — the one acting now\n• `party.members: kael` — whether Kael travels with the party\nEffects change them:\n• `party.members.values.health: -1` — every member\n• `acting.conditions.wounded: true` — the one acting\nWithout a sheet, the party is played as a whole.',
      none: 'This system has no sheet: its party is played as a whole.',
      create: 'New sheet',
    },
    calendar: {
      title: "The system's calendar",
      intro:
        'The calendar its trips and the world clock name time with: months and their seasons, weekdays, moons and holidays.',
      help: 'One calendar per system (`kind: calendar`), named in its **Overview**. Tables and checks read what it says about each moment:\n• `month: seedtime`, `weekday: fairday`, `year: { gte: 1022 }`\n• `moons.silver: full`\n• `holidays: lantern-night`\nWithout one, the default calendar counts days and four seasons of 90 days.',
      none: 'This system has no calendar: it uses the default one (days and four seasons).',
      create: 'New calendar',
    },
    weather: {
      title: 'Its weather models',
      intro:
        'Weather with inertia: today follows yesterday, with odds per season. A check whose binding names a model rolls it (`weather: highland-skies`).',
      help: "Weather models (`kind: weather`) the system's bindings can name, listed in its **Overview**. Each kind of weather can set values for the day (`set: { snowed-in: true }`) that conditions read; the day's weather is `weather` in tables and conditions:\n• `weather: storm`\n• `weather: [rain, storm]`",
      none: 'This system names no weather models.',
      create: 'New weather model',
    },
    modes: {
      title: 'Roll modes of its packs',
      intro:
        'Ways of rolling its tables: advantage, disadvantage, or your own (three rolls keeping the middle one…). Tables offer them with `modes:` and use them by themselves with `modeWhen:`.',
      help: "Roll modes (`kind: roll-modes`) of the packs the system brings, its own first; a bundled pack's are read-only (**Edit a copy**). A table uses them:\n• `modes: [advantage, disadvantage]` — offered when rolling by hand\n• `modeWhen: { advantage: { explorer: { gte: 1 } } }` — by itself when it holds",
      none: 'The packs of this system declare no roll modes.',
      create: 'New roll modes',
    },
  },
  factionsForm: {
    name: 'Name',
    nameHelp: 'What these factions are called together.\n• **The powers of the realm**',
    sheet: 'Their sheet',
    sheetHelp:
      "The sheet every faction is made with (`kind: sheet`): their values (strength, wealth…), conditions (at war…) and kinds of relation (ally, rival). It can be the characters' or one of their own.",
    turn: 'Their turn',
    turnHelp:
      "What each faction rolls on a world turn (a table, oracle, generator or deck), with its own values as `faction.*`:\n• `faction-turn` — a table of this pack\n• `core/faction-turn` — Core's, for any game: it grows, holds or loses ground",
    every: 'Every (days)',
    everyHelp:
      "Days of the world clock between turns. Empty or 0: only by hand (the Hexmapper's **World turn**).\n• `7` — a turn a week",
    byHand: 'by hand',
    factions: 'Factions',
    factionsHelp:
      'Each faction, by an id tables read it with (`factions.<id>.*`): its name, its colour on the map, its starting values, where it starts and, if it has one, a turn table of its own.',
    factionName: 'Name',
    color: 'Colour',
    colorHelp: 'Its colour on the map, as `#rrggbb`.\n• `#8b1e1e`',
    values: 'Starts with',
    valuesHelp:
      "Starting values of its sheet, as `key: value` pairs; the rest are the sheet's defaults.\n• `strength: 4, reputation: -1`",
    regions: 'Regions',
    regionsHelp:
      'It starts holding every hex of these regions of the map (by name), comma-separated.\n• `The Hollow Hills`',
    hexes: 'Hexes',
    hexesHelp: 'And these hexes (column,row), comma-separated.\n• `15,9`',
    ownTurn: 'Own turn',
    ownTurnHelp: "A turn table of its own, instead of the factions' one.\n• `clan-turn`",
  },
  sheet: {
    name: 'Name',
    nameHelp: "The sheet's name, shown where characters are made.\n• **Companion**",
    values: 'Values',
    valuesHelp:
      "Numbers each character has, with the bounds the system gives them (none: no bound, it may go negative). Tables and conditions read them as `characters.<id>.values.<value>` and `acting.values.<value>`:\n• `wits` — default `2`, min `0`, max `5`\n• `health` — max `'{{maxHealth}}'`: another value is its bound\n• `stress` — a **track** of 9 boxes",
    valueName: 'Name',
    default: 'Starts at',
    defaultHelp: 'What a new character has (empty: 0).\n• `2`',
    min: 'Min',
    max: 'Max',
    boundHelp:
      "Effects never take it past this. A number, or another value of the sheet in braces:\n• `0`\n• `'{{maxHealth}}'` — as high as the character's maxHealth\nEmpty: no bound.",
    track: 'Track',
    trackHelp: 'Shown as boxes, as many as its max (stress, xp, a vow). Needs a number as its max.',
    group: 'Group',
    groupHelp: 'A heading it is shown under, nothing more.\n• `attributes`\n• `meters`',
    groups: 'Groups',
    groupsHelp:
      'The headings values are shown under, in this order, with a name in each language. A value says its group in its **Group** column.\n• `skills` — **Skills**\n• `body` — **Body**',
    groupName: 'Name',
    conditions: 'Conditions',
    conditionsHelp:
      'States a character has or not (wounded, hungry, a trauma). Each may block things for the whole party while someone has it. Effects set and clear them, conditions read them:\n• `acting.conditions.wounded: true` — the acting character is wounded\n• `characters.mara.conditions: wounded` — whether Mara is\n• `unless: { conditions: wounded }` in a party stat — counts only the unwounded',
    conditionName: 'Name',
    blocks: 'Blocks',
    blocksHelp:
      "What the party can't do while any member has it, comma-separated:\n• `travel` — no marching\n• `forced-march` — an action of the system\n• `mode.horse` — a way of travelling\nThe trip says who has it.",
    relations: 'Kinds of relation',
    relationsHelp:
      "Relations a character may hold to anything with a reference (another character, a place, a faction, a note), like Ironsworn's bonds. A kind with bounds carries a number:\n• `bond` — min `0`, max `10`\n• `home` — no number",
    relationName: 'Name',
    relationMin: 'Number from',
    relationMax: 'to',
    relationValueHelp:
      'The bounds of the number a relation of this kind carries; empty both: none.',
  },
  calendar: {
    name: 'Name',
    nameHelp: "The calendar's name, shown where its dates are.\n• **The Royal Reckoning**",
    startYear: 'Year of day 1',
    startYearHelp: 'The year the first day of play falls in (default 1).\n• `1021`',
    startMonth: 'Day 1 is in',
    startHelp:
      "The month and day of the first day of play (default the first day of the first month). A trip that starts in a season starts on that season's first day.",
    firstMonth: 'the first month',
    startDay: 'on day',
    hoursPerDay: 'Hours in a day',
    hoursPerDayHelp: 'How long a day is (default 24).\n• `30` — a world with longer days',
    watchHours: 'Hours per watch',
    watchHoursHelp:
      'Splits the day into watches, which tables read as `watch` (1, 2…).\n• `4` — six watches a day\nEmpty: no watches.',
    dawn: 'Dawn',
    dawnHelp:
      'When the day starts and night falls, for the world clock\'s "until dawn" and "until nightfall" (travel rules have their own).\n• `06:00` and `20:00`',
    dusk: 'Nightfall',
    months: 'Months',
    monthsHelp:
      "The months of a year, in order, each with its days and its season (the season tables read while it lasts):\n• `seedtime` — **Seedtime**, 30 days, `spring`\nSeasons are any names: the usual four, or your world's (`wet`, `dry`).",
    itemName: 'Name',
    days: 'Days',
    season: 'Season',
    seasonHelp:
      'The season during this month: `spring`, `summer`, `autumn`, `winter`, or your own.',
    yearDays: 'A year of {days} days.',
    weekdays: 'Weekdays',
    weekdaysHelp: 'The days of the week, in order; tables read `weekday: fairday`. Empty: no week.',
    moons: 'Moons',
    moonsHelp:
      'Moons and their phases (new, waxing, full, waning), read as `moons.<id>: full`.\n• `moon` — 28 days\n• `red` — 45 days, offset 20',
    cycle: 'Cycle (days)',
    cycleHelp: 'Days from one new moon to the next.',
    offset: 'Offset',
    offsetHelp: 'The day of its cycle on day 1 (default 0: new on day 1).',
    holidays: 'Holidays',
    holidaysHelp:
      'Fixed days of the year, read as `holidays: lantern-night` (a list, since several may fall on one day).',
    month: 'Month',
    day: 'Day',
  },
  weather: {
    name: 'Name',
    nameHelp: "The model's name.\n• **Mountain skies**",
    states: 'Kinds of weather',
    statesHelp:
      'Each kind of weather the model can give, by id (what tables read as `weather`), with its name for the journal and what it sets for the day:\n• `storm` — **Storm**, sets `stormy: true`\n• `snow` — sets `snowed-in: true`, which travel rules can make block a way of travelling',
    stateName: 'Name',
    set: 'Sets for the day',
    setHelp:
      'Values of the day this weather sets, as `key: value` pairs:\n• `climbModifier: -1`\n• `snowed-in: true`',
    setNothing: 'nothing',
    season: 'Season: {season}',
    start: 'Starts as',
    startHelp:
      "The weather on the first day of a trip in this season, and whenever yesterday's has no row.",
    startWeights: 'weights (in YAML)',
    fromTo: 'Yesterday ↓ / today →',
    matrixHelp:
      'For each kind of weather yesterday (rows), how likely each kind is today (columns): weights, not percentages; empty is 0.\n• **Rain** row: `rain 3`, `grey 2`, `storm 1` — rain sets in, sometimes turns to storm\nA row left empty starts over as the season starts.',
    shares: 'Over many days',
    sharesHelp:
      'How often each kind comes up in this season over a long run of days, from the weights above: a check that the season feels right.',
    flowerStart: 'Starts on',
    flowerStartHelp:
      'The weather the first day starts on: the cell with it nearest the middle. Empty: the middle cell.',
    flowerMiddle: 'the middle',
    edge: 'At the edge',
    edgeHelp:
      'When a day would leave the flower: **comes back on the far side** (along the same line), or **stays** where it is.',
    edgeWrap: 'comes back on the far side',
    edgeStay: 'stays',
    flowerHelp:
      'A hex flower: 19 cells, five rows of 3, 4, 5, 4 and 3. Each day 2d6 moves the weather one cell: 2–3 north-east, 4–5 east, 6–7 south-east, 8–9 south-west, 10–11 west, 12 north-west (a pack may change it with `moves` in YAML). Put the harsh weathers at the top and the fair ones at the bottom: the middle rolls drift south-east, towards fair weather.',
    toFlower: 'Make it a hex flower',
    toFlowerConfirm: 'Replace this season’s weights with a hex flower?',
    toWeights: 'Use weights instead',
    toWeightsConfirm: 'Replace this season’s hex flower with weights?',
    newSeason: 'Season',
    addSeason: 'Add a season',
  },
  modes: {
    title: 'Roll modes',
    help: 'Each mode rolls the whole roll several times and keeps one:\n• `advantage` — 2 rolls, keep the highest, cancels `disadvantage`\n• `careful` — 3 rolls, keep the middle one',
    name: 'Name',
    description: 'Description',
    repeat: 'Rolls',
    repeatHelp: 'How many times the whole roll is made.',
    keep: 'Keep',
    keepHelp:
      'Which total is kept: `highest`, `lowest` or `middle` (of an even count, the lower middle one).',
    cancels: 'Cancels',
    cancelsHelp:
      'Modes this one cancels out with: when both apply, neither does (a normal roll).\n• `disadvantage`',
  },
  overview: {
    generic:
      'The Generic rules: plain travel with no checks, built into the apps. They have no definition to edit; create a new system to start your own from them.',
    implicit:
      'This system comes from an older pack: its travel rules make a system named after the pack, with its bindings and calendar. Declaring it writes a system.yaml naming what it uses, so you can choose its parts and the packs it brings here; it plays the same.',
    declare: 'Declare it',
    name: 'Name',
    nameHelp:
      "The system's name, as every app lists it (empty: the pack's name).\n• **Desert Roads**\nWritten in the current language: the pack's own, or its translation file.",
    description: 'Description',
    descriptionHelp:
      'What the system is for, in a few lines, shown where it is chosen. Basic Markdown: `**bold**`, `_italics_`, `` `code` ``, lists with `- `.\n• _A desert crossed by caravan, with water running short and sandstorms._',
    parts: 'Its parts',
    partsHelp:
      "The definitions the system plays with, each by its id: this pack's (`default`) or a dependency's (`core/default`).\n• **Travel rules** — how a trip goes (`kind: travel-rules`); none: the Generic rules\n• **Bindings** — which table answers each check, and the party's stats (`kind: bindings`)\n• **Calendar** — how days are named, by trips and the world clock (`kind: calendar`); none: the default one",
    travel: 'Travel rules',
    travelHelp:
      'How a trip goes: the day, speeds, supplies, actions, checks (`travel: default`). **Open** edits them in the Rules tab; **Create** starts new ones from the Generic rules.\n• none — the Generic rules',
    bindings: 'Bindings',
    bindingsHelp:
      "Which table answers each check, and the party's stats (`bindings: default`). **Open** edits them in the Checks tab; **Create** adds empty ones.\n• none — every check waits for the player",
    calendar: 'Calendar',
    calendarHelp:
      'How its trips and the world clock name days: months, weekdays, seasons, moons, holidays (`calendar: royal-reckoning`, a `kind: calendar`).\n• none — the default calendar: days and four seasons',
    no: {
      travel: '(none: the Generic rules)',
      bindings: '(none)',
      calendar: '(none: the default calendar)',
    },
    open: 'Open',
    create: 'Create',
    weather: 'Weather models',
    weatherHelp:
      "The weather models (`kind: weather`) its bindings can name in a check (`weather: highland-skies`), so the day's weather has inertia: this pack's and its dependencies'.\n• `weather: [highland-skies]`",
    noWeather: 'No weather models in this pack or its dependencies.',
    packs: 'Packs it brings',
    packsHelp:
      "The packs whose tables, oracles, generators and decks come with the system: its own always, and the dependencies you tick (`packs: [core]`). A map playing the system shows them in its Oracle panel. To bring another pack, add it to the pack's dependencies (`pack.yaml`).",
    ownPack: 'its own · {count} to roll',
    rollables: '{count} to roll',
    noDependencies:
      "This pack has no dependencies: add one to its pack.yaml to bring another pack's tables.",
    maps: 'Example maps',
    mapsHelp:
      "Maps to play the system on, kept in its pack as map files (`.otd.json`, written by the Hexmapper's **Save**) and listed in `maps:`. The Hexmapper offers them under **Maps → Example maps**, ready with this system chosen.\n• `maps: [maps/frontier.otd.json]`\n**Add a map file…** copies a saved map into the pack's `maps/` folder; **Remove** takes it out of the pack.",
    noMaps: 'No example maps.',
    addMap: 'Add a map file…',
    export: 'Take it elsewhere',
    exportHelp:
      'Saves the system as one .zip with every pack it needs: its own, the ones it brings, those its parts are written in, and their dependencies. Another browser (or another person) gets it whole by importing that file.\n• **Import a system (.zip)…**, under the systems list, reads it back\n• the Oracle’s **Import .zip** reads it too\nPacks already there and unchanged are left alone; a different version of one is replaced only if you say so (↶ undoes it).',
    exportIncludes: 'The file holds: {packs}',
    exportButton: 'Export as .zip',
    exportPersonal: 'It includes personal-use packs: keep the file for yourself, don’t share it.',
    openInHexmapper: 'Open in the Hexmapper →',
    confirmRemoveMap: 'Remove the map “{name}” from the pack? Its file goes too.',
    mapError: {
      missing: 'No such file in the pack',
      notJson: 'That file isn’t a saved map (it isn’t JSON).',
      notBundle: 'That file isn’t a saved map of OpenTabletop.',
      noMap: 'That file has no map in it.',
    },
  },
  forms: {
    confirmRemove: 'Remove “{name}”? The forms can’t undo it (edit the YAML to bring it back).',
    id: 'Id',
    add: 'Add',
    remove: 'Remove',
    moveUp: 'Move up',
    moveDown: 'Move down',
    idExists: 'There is already one called "{id}".',
    badFlow: 'Write it as key: value pairs, e.g. tags: landmark or terrain: [forest, hills].',
    problems: 'This file has {count} problems: open the YAML to see them.',
  },
  rules: {
    water: 'Water hexes',
    waterHelp:
      'Hexes whose terrain the map marks as **water** (Hexmapper: Edit palette → Water) and that have no rule of their own in Terrains.\nOften **not passable**; a way of travelling whose **Only through** holds on water can still sail them:\n• a boat: `water: true`\n• a boat that also hugs the shore: `any: [{ water: true }, { terrain: coast }]`\nA terrain listed in Terrains (a frozen `lake` with **Open when** `season: winter`) uses its own rule instead.',
    day: 'The day',
    dayHelp:
      "When the day starts and when night falls, as clock times:\n• **Dawn** `06:00` — the day-start checks are rolled and marching can begin\n• **Nightfall** `20:00` — nobody marches after it; the party camps (or takes the system's night action)\nWith 8 marching hours, a party that sets off at dawn stops at 14:00 even if night is far.",
    start: 'Dawn',
    nightfall: 'Nightfall',
    hoursPerDay: 'Marching hours a day',
    night: 'At nightfall, while waiting',
    nightHelp:
      "What the party does when night falls **while time moves on by itself**: the world clock moving with a trip on, or a travel order that runs into the night. One of the system's actions:\n• `camp` — the default, if the system has it\n• another action, e.g. `watch`\n• none — the night just passes\nWhen the action **can't be taken** (its **Only when** / **Not when**, or a value that blocks it), the night passes without it and the journal says why; a party told to travel at nightfall does the same and marches on at dawn.\n• camp with **Only when** `party.resources.food: { gte: 1 }` — a hungry party sleeps in the open, without a fed night's relief",
    nightDefault: 'camp, if there is one',
    nightNone: 'nothing: the night passes',
    hoursPerDayHelp:
      "How long the party can march each day before it has to stop, even if night is still far.\n• `8` — a long day on foot\n• `10` — a forced pace\nTime spent on actions (resting, foraging) doesn't count as marching.",
    hexKm: 'km per hex',
    hexKmHelp:
      "The scale the system is played at: how many km a hex measures. With the speeds of its ways of travelling, it says how long a hex takes.\n• `30` — large hexes: about one a day for a way of travelling that makes 30 km\n• `10` — small hexes: several a day\nTrips without a map (Travel, **Try it**) are played at it; a map with this system takes it, unless the map sets its own scale (Hexmapper: Map settings → Map). Empty: the map's or the way's, 10 by default.",
    modes: 'Ways of travelling',
    modesHelp:
      'Ways of travelling: on foot, on horseback, by boat… Each has a speed in **km per marching day** on easy ground (terrains and roads change it), and can be limited to some places and moments.\n• `foot` — 24 km a day\n• `horse` — 40 km a day, **Not when** `weather: snow`\n• `boat` — 50 km a day, **Only through** `water: true`\nThe trip panel lets the player switch between them.',
    kmPerDay: 'km per day',
    name: 'Name',
    nameHelp:
      "What players read in the trip panel and the journal instead of the id:\n• `horse` → _On horseback_\n• `food` → _Rations_\nWritten in the current language: the pack's own, or its translation file (`locales/<language>/`) when the interface is in another one. Empty: the id (or the app's name for the usual ones: foot, horse, food…).",
    allowedTerrains: 'Only through',
    allowedTerrainsHelp:
      'Where this way of travelling can go: a condition on **each hex it enters** (its terrain, water, tags, region, fields, the roads or rivers of the step).\n• a boat: `water: true`\n• a boat that also follows the coast: `any: [{ water: true }, { terrain: coast }]`\n• a cart only by road: `edges: road`\n• a mount that avoids forests: `not: { terrain: [forest, dense-forest] }`\nWhere it holds, even closed terrains are open to it. Empty: wherever terrains allow.',
    anyTerrain: 'wherever terrains allow',
    terrains: vocabulary.en.terms.terrains,
    terrainsHelp:
      'How each terrain changes the speed, and whether it can be entered. Terrain ids are the ones the map uses:\n• `forest` × `0.5` — half as fast\n• `plains` × `1` — normal speed\n• `peaks` × `0.25`, **Open when** `season: summer`\nTerrains not listed use **Speed × for terrains not listed**.',
    terrain: vocabulary.en.terms.terrain,
    multiplier: 'Speed ×',
    multiplierHelp:
      'How fast this terrain is crossed, compared with easy ground:\n• `1` — normal speed\n• `0.5` — half as fast\n• `0.25` — a quarter\n• `2` — twice as fast\nFor example, with a way of travelling of 24 km a day and 12 km hexes, a hex at `0.5` takes a whole marching day.',
    passable: 'Passable',
    passableHelp:
      '**Unticked**: no way of travelling can enter it (routes go around), except one whose **Only through** holds there (a boat on a lake).\n**Ticked**, it can still open or close on a condition:\n• **Open when** `season: winter` — a lake crossed on the ice\n• **Closed when** `weather: [snow, storm]` — a pass shut by the weather',
    openWhen: 'Open when',
    closedWhen: 'Closed when',
    passableWhenHelp:
      "When the terrain can be entered, as a condition on **the hex entered and the moment**: its terrain, tags, region, fields, the roads or rivers of the step, the way of travelling, the weather, the season and calendar, today's values.\n• **Open when** `season: winter` — only while it holds: a lake crossed on the ice\n• **Open when** `month: [1, 12]` — the two coldest months of the calendar\n• **Closed when** `any: [{ season: winter }, { weather: snow }]` — a mountain pass\n• **Closed when** `mode: horse` — not for riders\nEmpty: always open / never closed.",
    defaultTerrain: 'Speed × for terrains not listed',
    defaultTerrainHelp:
      "The speed for any terrain missing above:\n• `1` — normal (the default when empty)\n• `0.75` — unknown ground is a bit slower\nA map with a terrain the system doesn't know (`badlands`) uses this.",
    edges: 'Roads and rivers',
    edgesHelp:
      "Following a road, trail or river **from one hex to the next**: its speed replaces the terrain's.\n• `road` × `1.5` — half again as fast as open ground\n• `trail` × `1` — as open ground, even through a forest\n• `river` × `2` — downstream by boat\nLines not listed do nothing. Checks can tell them apart too: `edges: road` in a condition.",
    edge: 'Line',
    edgeMultiplierHelp:
      "Speed along this line, replacing the terrain's:\n• `1.5` — half again as fast as open ground\n• `1` — open-ground speed, whatever the terrain\nA road at `1.5` through a terrain at `0.5` is three times as fast as that terrain.",
    resources: vocabulary.en.terms.supplies,
    resourcesHelp:
      'What the party carries: food, fodder, water, torches… What uses it is **up to the system**, never the app:\n• an action at the end of each day eats: `effects: { party.resources.food: -1 }`\n• a table entry finds some: `effects: { party.resources.food: 2 }`\n• a check without food tires: **Only if** `below: food`\nThe trip panel shows each one and lets the player change it by hand.',
    min: 'Min',
    minHelp:
      'Effects never take it below this: a change past it stops there, the journal says so ("Food can\'t go lower than 0"), and later steps and that day\'s checks see `below: [its id]`.\n• food with Min `0` — eating with none left stays at 0, and a day-end check with **Only if** `below: food` tires the party\n• gold with no Min — it may go negative, like a debt',
    max: 'Max',
    maxHelp:
      "Effects never take it above this; later steps and checks see `above: [its id]`.\n• water with Max `4` — a full waterskin can't hold more\n• morale with Max `5` — a feast can't raise it past 5\nEmpty: no maximum.",
    olderEating:
      'These rules eat the older way (supplies used “per day”, ways of travelling that use supplies, or steps that eat the day’s supplies). They still play the same; converting writes it as an action the system takes at the end of each day, with Min 0 on the supplies.',
    olderEatingConvert: 'Convert',
    weather: vocabulary.en.terms.weather,
    weatherHelp:
      "How each weather slows the party. Tables set it with `set: { weather: … }` (usually rolled at dawn), or a weather model with inertia.\n• `storm` × `0` — no travel that day\n• `heavy-rain` × `0.5` — half speed\n• `fog` × `0.75`\nWeather not listed doesn't change the speed; conditions can still read it (`weather: storm`).",
    weatherState: vocabulary.en.terms.weather,
    speed: 'Speed ×',
    speedHelp:
      'How fast the party marches in this weather:\n• `0` — no travel that day (the day is lost)\n• `0.5` — half speed\n• `1` — as usual',
    actions: 'Actions',
    actionsHelp:
      "What the party can do besides marching: **camp**, **rest** and the system's own (forage, pray, talk to the porters…), each a button in the trip panel, or taken by the system itself (**By itself at**).\nEach one says when it can be taken (**Only when** / **Not when**, **Once a day**) and what it does, **step by step**:\n• rest: `time: 120`, then `effects: { party.stats.fatigue: -1 }`\n• forage: `time: 180`, `speed: 0.5`, its check at `forage`\n• eat, by itself at `day-end`: `effects: { party.resources.food: -1 }`",
    oncePerDay: 'Once a day',
    modeWhenHelp:
      "When it can be chosen (**Only when**) or not (**Not when**), as a condition on where the party is and the moment.\n• a boat only at the water's edge: `any: [{ water: true }, { tags: ferry }]`\n• no horses in the snow: **Not when** `weather: snow`\n• a cart only in summer: **Only when** `season: summer`\nEmpty: always. A value of the day can block it too (**Blocks** `mode.<id>`).",
    values: 'Values of the day',
    valuesHelp:
      "Values this system's tables and actions can set **for the rest of the day**, with what they block while they hold. Tables read them the next day as `yesterday.<id>`.\n• `lost` — set by `set: { lost: true }`, blocks `travel`\n• `snowed-in` — blocks `mode.horse`\n• `mutinous` — blocks `travel` until an action clears it (`set: { mutinous: false }`)\nWithout any, the older built-in `lost` (blocks travel) still works.",
    blocks: 'Blocks',
    blocksHelp:
      "What can't be done while the value holds:\n• `travel` — no more marching today\n• an action's id, e.g. `camp` or `forage` — its button turns off\n• `mode.<id>`, e.g. `mode.horse` — that way of travelling: it can't be chosen, and a party already travelling so stops until it changes\nThe box suggests what this system declares. Blocked buttons stay visible, disabled, saying why (unless the action is **Hidden when it can't be taken**).",
    blocksNothing: 'nothing',
  },
  actions: {
    when: 'Only when',
    unless: 'Not when',
    whenHelp:
      "When the action can be taken (**Only when**) or not (**Not when**), with conditions like the tables':\n• `weather: storm` — today's weather\n• `terrain: [forest, hills]` — the hex the party is in\n• `tags: shrine` — a tag of that hex\n• `party.stats.fatigue: { lt: 2 }` — the party\n• `party.resources.food: { gte: 1 }` — food left\n• `mutinous: true` — a value of the day\n• `moons.silver: full` — the calendar\n• `daylight: true` — only by day (between the system's dawn and nightfall); `hour: { gte: 18 }` — from 18:00\n• `visits: 1` — the first time here; `around.terrain: lake` — next to a lake\n• `doneToday: forage` — after foraging today; `marched: { gte: 6 }` — after 6 hours of marching\n• `trip.km: { gte: 100 }`, `trip.taken.camp: { gte: 7 }`, `trip.spent.food: { gte: 10 }` — what the trip has done so far\n• `party.stats.fatigue: { lt: '{{party.stats.endurance}}' }` — a variable: compared with another value (quoted)\n• `party.stats.wits: { gte: '{{1d20}}' }` — a roll: the same all the moment long\n• `hex.terrain: forest`, `trip.weather: storm`, `time.daylight: true` — by **full name** (`hex.*`, `time.*`, `trip.*`, `system.*`, `world.*`): the same values, never hidden by a stat with the same name\nOtherwise its button stays disabled and says why (or hides, with **Hidden when it can't be taken**); the system's night action that can't be taken lets the night pass without it.",
    marchNote:
      'Marching is the Travel buttons, not a button of its own: Only when / Not when say when the party can march, checked as it marches (it stops as soon as they no longer hold). Its name and description are the first Travel button’s. It has no steps.',
    marchDefault: 'by day, for the day’s marching hours',
    hide: "Hidden when it can't be taken",
    hideHelp:
      "**Unticked**: its button is always there, disabled (saying why) while it can't be taken, so the buttons don't move around.\n**Ticked**: its button only appears while it can be taken. For actions that only make sense now and then:\n• a rite only at a shrine under a full moon\n• talking round porters only while they refuse to march",
    nothing: 'When nothing applies',
    nothingHelp:
      'What the journal says when **none of its checks apply** where the party is; `{terrain}` is the hex\'s terrain.\n• `nothing to forage on {terrain}` → "nothing to forage on Hills"\nEmpty: a generic sentence. An action without checks says nothing more.',
    nothingPlaceholder: 'nothing to find on {terrain}',
    steps: 'What it does',
    stepsHelp:
      "What the action does, **one step per box, in order**, each written like in the YAML:\n• `time: 180` — three hours pass (or `time: dawn`, `time: nightfall`, `time: '14:00'`)\n• `speed: 0.5` — the rest of today's march goes at half speed\n• `effects: { party.stats.fatigue: -1 }` — change the party (a number adds or takes away; `'=0'` sets it; `'-{{party.stats.mouths}}'`: as many as another value, `'+{{1d3}}'`: a roll; `party.members.values.health: 1`, `acting.conditions.wounded: false`: its characters)\n• `set: { lost: true }` — give a value of the day\n• `do: forage` — take another action (if its conditions hold)\n• `roll: ENCOUNTER_CHECK_REQUIRED` — roll a check now\n• `advance: 1` — move one hex (one leg of a way) along the route at once, no time passing: progress by moves instead of marching (`advance: '{{party.stats.rank}}'`: as many as a value)\nA change past a value's **Min** or **Max** stops there, and later steps see `below: [id]` or `above: [id]`.\nThe box beside each step is **its condition**: the step only happens when it holds.\n• `below: food` — only if food hit its minimum today\n• `party.stats.morale: { lte: 1 }` — only with low morale\n• `moment: hex-enter` — only when the action came at that moment\nThe actions that follow this one, and its checks (Checks → **When**: this action), come first.",
    on: 'By itself at',
    onHelp:
      "**Empty**: the player takes it, with a button.\nOtherwise the **moments the system takes it by itself**, if its conditions hold; it isn't a button then, and it comes before that moment's checks:\n• `day-start` — at dawn\n• `hex-enter` — entering each hex\n• `day-end` — as each day ends, camping or not\n• an action's id, e.g. `camp` — right after that action starts\nSeveral, separated by commas: `day-start, hex-enter`. Its conditions see which one it is as `moment` (`when: { moment: hex-enter }`).\nExamples:\n• eating as each day ends: `day-end`\n• porters grumbling at dawn after a hungry day: `day-start` with **Only when** `yesterday.hungry: true`",
    onButton: 'nothing: a button for the player',
    onAfter: 'After: {action}',
    step: 'Step',
    badStep:
      'A step does one thing: time: 60, speed: 0.5, effects: { … }, set: { … }, do: <action>, roll: <check> or advance: 1.',
    stepWhen: 'only when…',
    up: 'Move up',
    down: 'Move down',
    noSteps: 'No steps: it does nothing but roll its checks.',
    addStep: 'Add a step',
    add: 'Add an action',
  },
  kinds: vocabulary.en.kinds,
  checks: {
    title: 'Checks',
    help: 'What is rolled on the way, when, and on which table. A check without a table is only written in the journal (with its **Changes**); only **Pause after it** stops the trip.',
    event: 'Check',
    name: 'Name',
    nameHelp:
      "What players read in the trip panel and the journal instead of the event id:\n• `NAVIGATION_CHECK_REQUIRED` → _Getting lost_\n• `HUNGER_CHECK_REQUIRED` → _Hunger_\nThis box edits it in the current language: the pack's own, or its translation file when the interface is in another one.",
    description: 'Description (its help)',
    at: 'When',
    atOptions: {
      'day-start': 'At dawn',
      'hex-enter': 'Entering a hex',
      camp: 'In camp',
      'day-end': 'At the end of the day',
    },
    atNone: 'only when a step rolls it',
    atHelp:
      "When it is rolled:\n• `day-start` — at dawn, before marching\n• `hex-enter` — entering each hex\n• `day-end` — as each day ends (after the system's day-end actions)\n• an action's id, e.g. `camp` or `forage` — when the party takes it\nSeveral, separated by commas: `hex-enter, rest`. Its conditions and its table see which one it is as `moment` (`when: { moment: rest }`).\nEmpty: only when an action's step rolls it (`roll: <its event>`).",
    atAction: 'Action: {action}',
    when: 'Only if',
    unless: 'Skip if',
    conditionHelp:
      "When the check is rolled (**Only if**) or skipped (**Skip if**), as `key: value` pairs, like in tables:\n• `terrain: forest` — the hex\n• `tags: landmark` — a tag of the hex\n• `edges: [road, river]` — the road or river of the step\n• `danger: { gte: 2 }` — a value of the hex or its region\n• `season: winter`, `weather: storm` — the moment\n• `daylight: false` — only at night (after the system’s nightfall, before its dawn); `watch: 3` — the third watch\n• `from.terrain: forest` — coming out of a forest; `visits: { gte: 2 }` — back again\n• `clocks.the-flood: { gte: 4 }` — a clock of the world clock; `events: market-day` — today’s event\n• `danger: { gt: '{{party.stats.stealth}}' }` — a variable: compared with another value\n• `party.stats.wits: { gte: '{{1d20}}' }` — a roll under a stat\n• `hex.terrain: forest`, `trip.weather: storm`, `time.daylight: true` — by **full name** (`hex.*`, `time.*`, `trip.*`, `system.*`, `world.*`): the same values, never hidden by a stat with the same name\n• `party.resources.food: { lt: 1 }` — the party\n• `acting.values.survival: { gte: 2 }`, `characters.kael.conditions: wounded`, `party.members: kael` — its characters, when the system has a sheet\n• `below: food` — food hit its minimum today (at `day-end`)\n• `moment: rest` — which of its moments it is (when it has several)\n• `any: [{ terrain: forest }, { danger: { gte: 3 } }]` — either",
    always: 'always',
    never: 'never',
    resolve: 'Rolled on',
    resolveHelp:
      "The table, oracle, generator or deck that resolves it. Its result goes to the journal, and its `set` values and `effects` reach the trip.\n• `my-pack/getting-lost` — sets `lost: true` on a bad roll\n• a weather model — the day's weather with inertia\n• **no table** — it's only written in the journal, with its **Changes**; tick **Pause after it** to resolve it by hand",
    weatherModels: 'Weather with inertia',
    weatherModel: 'Weather model: {model}',
    waits: '— no table —',
    olderFormat:
      'This pack is written for an older pack format. It plays the same; updating it writes the format of this version in its pack.yaml.',
    olderFormatPausing:
      'This pack is written for an older pack format, where a check without a table or changes stopped the trip by itself: {checks}. It still plays that way; updating it writes “Pause after it” on them and the new format in its pack.yaml.',
    olderFormatUpdate: 'Update',
    effects: 'Changes',
    effectsHelp:
      "What the check itself changes when it comes up, with or without a table:\n• `party.stats.fatigue: 1` — adds 1\n• `party.resources.food: -1` — takes 1 away\n• `party.stats.fatigue: '=0'` — sets it\n• `party.resources.food: '-{{party.stats.mouths}}'` — as many as another value says (a variable)\n• `party.members.values.health: -1`, `acting.conditions.wounded: true` — its characters (every one, whoever acts)\nHow a system writes its rules as data, e.g. a day without enough food: **When** `day-end`, **Only if** `below: food`, **Changes** `party.stats.fatigue: 1`.",
    pause: 'Pause after it',
    pauseHelp:
      'The trip **stops** when this check comes up (after rolling it, if something resolves it) and waits until you press **Continue**: time to describe the place, write lore or decide something. The only way a check stops the trip: without it, a check with no table is just written in the journal.\n• a shrine found on the way, rolled on its table\n• a landmark to describe, with no table\nA table entry can also pause, only when it comes up (`pause: true` on the entry).',
    context: 'Extra context',
    contextHelp:
      'Values the table sees **only for this check**, written as `key: value` pairs:\n• `timeOfDay: night` — a night encounter rolled on the day table\n• `danger: 3` — as if the hex were more dangerous',
    none: 'No checks: trips only spend time and supplies.',
    add: 'Add a check',
    orphans: 'Tables bound to checks these rules don’t have: {events}.',
    removeOrphans: 'Remove them',
    stats: 'Party stats',
    statsHelp:
      'Numbers of the party the tables can use, edited during the trip:\n• `survival` — in a roll: `1d6 + {{survival}}`\n• `morale` — in a condition: `party.stats.morale: { lte: 1 }`\n• `fatigue` — changed by effects: `party.stats.fatigue: 1`',
    statName: 'Name',
    statDescription: 'Description',
    statDefault: 'Starts at',
    noStats: 'No party stats.',
    addStat: 'Add a stat',
    statFrom: 'From the members',
    statFromHelp:
      "With characters in the party, the stat is made of theirs (and effects on it are overwritten); without, it's kept as any other. One of:\n• `max: survival` — the best Survival among them\n• `min: stealth` — the worst\n• `sum: strength` — all of them together\n• `count: true` — how many they are\nAdd `when` / `unless` to count only some, and `none` for when nobody counts:\n• `count: true, unless: { conditions: wounded }` — those not wounded\n• `max: wits, when: { values.health: { gt: 0 } }, none: 0` — the best of those still standing\nNeeds a sheet (the **Sheet** tab).",
    statFromNone: 'kept by the party',
    roles: 'Journey roles',
    rolesHelp:
      "Jobs the party's characters take for the journey (lead the way, keep watch, forage…), Forbidden Lands-style: in a trip, each role is given to one character, and the system's checks, tables and actions read the holder and change them:\n• `roles.guide.values.pathfinding: { gte: 2 }` — the guide is good enough\n• `modeWhen: { advantage: { roles.lookout.values.stealth: { gte: 2 } } }` — a table rolled with advantage\n• `roles.lookout.values.health: -1` — an effect on the lookout\nNeeds a sheet.",
    roleName: 'Name',
    roleDescription: 'Description',
    carried: 'Supplies the members carry',
    carriedHelp:
      'With characters in the party, a supply here is what they carry between them: the trip shows their sum, its bounds are the sums of theirs, and what the trip spends or gains is shared out among them. Without characters, the party keeps it as a whole.\n• **food**, carried in `rations`, shared out evenly',
    noSheet: 'This system has no sheet yet (the Sheet tab): the party is played as a whole.',
    carriedSupply: 'Supply',
    carriedIn: 'Carried in',
    carriedInHelp: "The value of the members' sheet that holds each one's share.\n• `rations`",
    share: 'Shared out',
    shareHelp:
      '**evenly** (the default): taken from whoever has most, given to whoever has least, one at a time.\n**in order**: the first member gives (or takes) all it can, then the next.',
    shareEven: 'even (default)',
  },
  edit: {
    readOnly: 'This system comes bundled and is read-only.',
    personalCopy: 'Your copy stays in this browser and is personal use only.',
    editedCopy:
      'Your edited copy of a bundled system: it replaces the bundled one in this browser.',
    revert: 'Revert to bundled',
    updatedTip:
      'The bundled version of this system changed since you made your copy: open it to take or keep each change.',
    confirmRevert:
      'Discard your changes to this system and go back to the bundled version? (↶ undoes it.)',
    makeCopy: 'Edit a copy',
    builtIn:
      "The Generic rules are built in and can't be edited. Create a new system (below the list on the left) to start your own from them.",
    playInTravel: 'Play it in Travel →',
    staleCopy:
      'This system uses your copy of «{pack}», and the bundled «{pack}» changed since you made it. Your copy replaces the bundled pack whole, so what the newer one added (a table this system names…) is missing until you take it:',
    staleTip:
      'A pack this system uses is your copy of a bundled pack that changed since: open it to take or keep each change.',
  },
  try: {
    intro:
      "A trip without a map to try the system while you make it: describe a way hex by hex and travel it. It plays the rules as they are now, so a change in another tab counts from the next step; **New trip** starts over with the changes in the first day too. These test trips are kept apart from the Travel app's.",
  },
  yaml: { line: 'line {line}' },
  terrains: vocabulary.en.terrains,
  edgeKinds: vocabulary.en.pathKinds,
  storage: { full: 'Browser storage is full: export your packs to keep them safe.' },
} as const

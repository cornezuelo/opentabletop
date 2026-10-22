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
    help: 'Help and manual',
    undo: 'Undo the last change to your packs (Ctrl+Z)',
    redo: 'Redo (Ctrl+Shift+Z)',
    newSystem: 'New system',
    import: 'Import a system (.zip)…',
    problems: '{count} problems',
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
    clocks: 'Clocks',
    calendar: 'Calendar',
    weather: 'Weather',
    modes: 'Roll modes',
    try: 'Try it',
    yaml: 'YAML',
  },
  parts: {
    clocks: {
      title: 'Its progress clocks',
      intro:
        'Clocks of its world (`kind: clocks`): segments that fill as something advances (a threat, a plan, a season of raids), each with what happens when it fills. In the Hexmapper they come with the world clock when it starts; trips, tables and faction turns fill them with effects, and conditions read them.',
      help: "One clocks definition per system, named in its **Overview** (`clocks:`). Conditions and tables read each by its id:\n• `world.clocks.the-wyrm-wakes: { gte: 6 }` — once it is full\nEffects fill it, from a trip, a table or a faction turn:\n• `world.clocks.the-wyrm-wakes: 1` — a segment more\n• `world.clocks.the-wyrm-wakes: -2` — two less\n• `world.clocks.the-wyrm-wakes: '=0'` — empty",
      none: 'This system declares no progress clocks: they can still be made by hand on a map.',
      create: 'New clocks',
    },
    factions: {
      title: 'Its factions',
      intro:
        "The powers of its world (`kind: factions`): each a character of a sheet (its values, conditions and relations) holding land on a map. On every world turn each one rolls a table, and what comes up changes it, another faction, its territory or the world clock's progress clocks. Their land is the hexes they hold on a map: each starts with the regions written here (on any map that has them) and the hexes (only on the map they're on) when a map brings them in (the Hexmapper's World panel); from then on it's the map's, painted by hand there and won or lost hex by hex on world turns.",
      help: 'One factions definition per system, named in its **Overview** (`factions:`). Tables and conditions read them anywhere:\n• `factions.the-crown.values.strength: { gte: 3 }`\n• `hex.faction: the-crown` — who holds the hex\nTheir turn tables change them with effects:\n• `faction.values.strength: 1` — the faction whose turn it is\n• `factions.the-rebels.values.strength: -1` — another\n• `faction.territory: 1` — a hex more, from its border\n• `world.clocks.the-siege: 1` — a progress clock of the world clock',
      none: 'This system has no factions.',
      create: 'New factions',
    },
    sheet: {
      title: 'Its sheets: the party and its characters',
      intro:
        "Two sheets, both optional. **The party's own** (`partySheet`): what belongs to the whole party (morale, fatigue, hirelings…), in every trip whoever travels. **Its characters'** (`sheet`): what each character has, so the party can be made of characters who join and leave; the **Checks** tab says which party stats come from them and which supplies they carry. Each has values with their bounds, tracks, conditions and relations.",
      help: "Named in its **Overview** (`partySheet:`, `sheet:`). Conditions and tables read the party's sheet and each character:\n• `party.values.morale: { gte: 3 }` — the party\n• `characters.kael.values.health: { lte: 1 }` — one by id\n• `acting.values.wits: { gte: 3 }` — the one acting now\nEffects change them:\n• `party.values.morale: -1`\n• `party.members.values.health: -1` — every character\nA party stat can be a value of the party sheet: `from: { party: morale }` (in **Checks**).",
      none: 'This system has no sheet: its party is played as a whole, with its stats.',
      create: 'New characters sheet',
      createParty: 'New party sheet',
      partyTab: 'the party',
      charactersTab: 'its characters',
      onlyParty: "This is the party's own sheet; the system has none for its characters yet.",
    },
    calendar: {
      title: "The system's calendar",
      intro:
        'The calendar its trips and the world clock name time with: the divisions of the day (meals, watches…), months and their seasons, weekdays, moons and holidays.',
      help: 'One calendar per system (`kind: calendar`), named in its **Overview**. Tables and checks read what it says about each moment:\n• `time.month: seedtime`, `time.weekday: fairday`, `time.year: { gte: 1022 }`\n• `time.moons.silver: full`\n• `time.holidays: lantern-night`\nWithout one, the default calendar counts days and four seasons of 90 days.',
      none: 'This system has no calendar: it uses the default one (days and four seasons).',
      create: 'New calendar',
    },
    weather: {
      title: 'Its weather models',
      intro:
        'Weather with inertia: today follows yesterday, with odds per season. A check whose binding names a model rolls it (`weather: weather.highland-skies`).',
      help: "Weather models (`kind: weather`) the system's bindings can name, listed in its **Overview**. Each kind of weather can set values for the day (`set: { snowed-in: true }`) that conditions read; the day's weather is `weather` in tables and conditions:\n• `trip.weather: storm`\n• `trip.weather: [rain, storm]`",
      none: 'This system names no weather models.',
      create: 'New weather model',
    },
    modes: {
      title: 'Roll modes of its packs',
      intro:
        'Ways of rolling its tables: advantage, disadvantage, or your own (three rolls keeping the middle one…). Tables offer them with `modes:` and use them by themselves with `modeWhen:`.',
      help: "Roll modes (`kind: roll-modes`) of the packs the system brings, its own first; another pack's (Core's) are read-only here, shared by every system that brings it: make your own in the system's pack to change them. A table uses them:\n• `modes: [advantage, disadvantage]` — offered when rolling by hand\n• `modeWhen: { advantage: { explorer: { gte: 1 } } }` — by itself when it holds",
      none: 'The packs of this system declare no roll modes.',
      create: 'New roll modes',
    },
  },
  clocksForm: {
    name: 'Name',
    nameHelp: 'What these clocks are called together.\n• **Threats of the realm**',
    clocks: 'Clocks',
    clocksHelp:
      'Each clock, by an id tables and conditions read it with (`world.clocks.<id>`): its name, its segments, where it starts and what happens when it fills. Leave **When full**, **Rolls** and **Changes** empty for a clock that only fills.',
    clockName: 'Name',
    segments: 'Segments',
    segmentsHelp:
      'How many segments it has: any number from 1.\n• `4` — a short threat\n• `12` — a long campaign',
    filled: 'Starts at',
    filledHelp:
      'Segments already filled when the world clock starts (empty: none).\n• `2` — already under way',
    description: 'When full',
    descriptionHelp:
      'What happens when it fills, in words: a line on the timeline and a notice.\n• **The Wyrm wakes and leaves its lair.**',
    resolve: 'Rolls',
    resolveHelp:
      "A table, oracle, generator or deck rolled when it fills, with what the world clock and the factions say (like a faction's turn). What comes up goes to the timeline, and its effects apply.\n• `table.the-raid` — a table of this pack\n• `core/table.twists` — Core's twists",
    effects: 'Changes',
    effectsHelp:
      "What it changes when it fills, as `key: value` pairs: other clocks and the factions (a trip's party isn't the world's).\n• `world.clocks.the-siege: 2` — fills two segments of another\n• `factions.the-crown.values.strength: -1`\n• `factions.the-rebels.territory: 1` — a hex more",
    then: 'Then',
    thenHelp:
      'What becomes of it once full:\n• `keep` — it stays full (the default): conditions read it full\n• `reset` — it starts over, empty, and may fill again\n• `remove` — it goes away',
    keepByDefault: 'keep',
  },
  factionsForm: {
    name: 'Name',
    nameHelp: 'What these factions are called together.\n• **The powers of the realm**',
    sheet: 'Their sheet',
    sheetHelp:
      "The sheet every faction is made with (`kind: sheet`): their values (strength, wealth…), conditions (at war…) and kinds of relation (ally, rival). It can be the characters' or one of their own.",
    turn: 'Their turn',
    turnHelp:
      "What each faction rolls on a world turn (a table, oracle, generator or deck), with its own values as `faction.*`:\n• `table.faction-turn` — a table of this pack\n• `generator.schemes` — a generator of this pack\n• `core/table.faction-turn` — Core's, for any game: it grows, holds or loses ground",
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
      "It starts holding every hex of these regions of the map (by name), comma-separated: the land it gets when a map brings the factions in. From then on its land is the map's (painted by hand, won and lost on world turns): changing this doesn't move it.\n• `The Hollow Hills`",
    map: 'On the map',
    mapHelp:
      "The example map of this pack (`maps:` in its system) its **Hexes** are on: they're given only there, since the same coordinates are somewhere else on another map. Its regions are given on any map that has them.\n• `maps/frontier.otd.json`",
    hexes: 'Hexes',
    hexesHelp:
      'And these hexes (column,row) of the map chosen in **On the map**, comma-separated; they need it.\n• `15,9`',
    ownTurn: 'Own turn',
    ownTurnHelp: "A turn table of its own, instead of the factions' one.\n• `clan-turn`",
  },
  sheet: {
    name: 'Name',
    nameHelp: "The sheet's name, shown where characters are made.\n• **Companion**",
    descriptionHelp:
      'What the sheet is for, shown where characters are made. Basic Markdown.\n• _One of the Company: their skills, their wounds and the rations they carry._',
    values: 'Values',
    valuesHelp:
      "Numbers each character has, with the bounds the system gives them (none: no bound, it may go negative). Tables and conditions read them as `characters.<id>.values.<value>` and `acting.values.<value>`:\n• `wits` — default `2`, min `0`, max `5`\n• `health` — max `'{{self.values.maxHealth}}'`: another value is its bound\n• `stress` — a **track** of 9 boxes",
    valueName: 'Name',
    default: 'Starts at',
    defaultHelp: 'What a new character has (empty: 0).\n• `2`',
    min: 'Min',
    max: 'Max',
    boundHelp:
      "Effects never take it past this. A number, or another value of the sheet in braces:\n• `0`\n• `'{{self.values.maxHealth}}'` — as high as the character's maxHealth\nEmpty: no bound.",
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
      "What the party can't do while any member has it, comma-separated:\n• `travel.move` — no moving on\n• `actions.forced-march` — an action of the system\n• `modes.horse` — a way of travelling\nThe trip says who has it.",
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
    divisions: 'Divisions of the day',
    divisionsHelp:
      'The ways your world divides the day, as many as you want: meals, watches, bells, prayers… Each one has its parts, and lasts from one part to the next (the last one until the first, past midnight). Conditions and tables read what it is now as `time.<id>`, and the tags of the parts it is in as `time.tags`; the World panel waits until any part.\n• `meal` with **elevenses** from `11:00` — `time.meal: elevenses` holds from 11:00 to the next meal\n• `watch` split into parts of `4` hours (**Split into equal parts…**) — `time.watch: 2` from 04:00 to 08:00\n• a part with **Until** `07:00` — none of its division after 07:00 until the next part\n• **Tags** `dark` on the night — `time.tags: dark`',
    divisionIdHelp:
      'How conditions and tables read it: `time.<id>` (`time.meal: elevenses`). It can’t be a name the moment already has (`day`, `hour`, `season`, `tags`…).',
    divisionReserved: '“{id}” is already a name of the moment (time.{id}); choose another.',
    split: 'Split into equal parts…',
    splitTitle: 'Split the day into equal parts',
    splitMessage:
      'Parts of how many hours each, numbered from midnight? They replace the parts this division has; then rename or adjust them as you like.',
    splitHours: '{hours} h',
    splitHelp:
      'Writes the day as numbered parts of the same length from midnight, one row each, to see, rename or adjust: the shifts of a watch, bells, prayers at fixed hours. Parts named 1, 2, 3… are read as numbers.\n• `4` hours — **1** from `00:00`, **2** from `04:00` … **6** from `20:00`: `time.watch: 2` from 04:00 to 08:00\nFor stretches of your own (morning, the night, meals), write the rows instead, each from its hour.',
    everyNote:
      'Numbered parts every {hours} hours from midnight (written with every in the YAML), as the strip shows: read as numbers, like time.watch: 2.',
    writeRows: 'Write them as rows',
    partFrom: 'From',
    partFromHelp:
      'When it starts; it lasts until the next part starts, in the order of the day, whatever order they are written in.\n• `11:00`',
    partUntil: 'Until',
    partUntilHelp:
      'When it ends, if before the next part starts: until then, none of this division’s parts.\n• watches only at night: the last one **Until** `06:00`\nEmpty: until the next part.',
    partTags: 'Tags',
    partTagsHelp:
      'Words a system may read while it lasts (`time.tags`), with commas; they mean only what your rules make of them.\n• `dark` — `when: { time.tags: dark }`\n• `meal, rest`',
    addDivision: 'Add a division',
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
    weekdaysHelp:
      'The days of the week, in order; tables read `time.weekday: fairday`. Empty: no week.',
    moons: 'Moons',
    moonsHelp:
      'Moons and their phases (new, waxing, full, waning), read as `moons.<id>: full`.\n• `moon` — 28 days\n• `red` — 45 days, offset 20',
    cycle: 'Cycle (days)',
    cycleHelp: 'Days from one new moon to the next.',
    offset: 'Offset',
    offsetHelp: 'The day of its cycle on day 1 (default 0: new on day 1).',
    holidays: 'Holidays',
    holidaysHelp:
      'Fixed days of the year, read as `time.holidays: lantern-night` (a list, since several may fall on one day).',
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
      "A hex flower: 19 cells (rows of 3, 4, 5, 4 and 3), each a kind of weather; the day's weather is the cell it's on. Each day 2d6 moves it to a neighbouring cell (the compass beside it says which way each roll goes), so tomorrow's weather is close to today's: it drifts instead of jumping.\n• the day is on **Rain** in the middle; 2d6 rolls 7, south-east: tomorrow is the cell below and to the right, say **Grey**\n• put harsh weather at the top and fair at the bottom: the middle rolls (6–7, the commonest) go south-east, so the weather tends to clear\n• more cells of a kind make it commoner: three **Clear** cells at the bottom, one **Storm** at the top\n**At the edge** says what happens when a roll would leave the flower.",
    flower: 'The flower',
    paint: 'Paint with',
    paintHelp:
      'Choose a kind of weather here, then click cells of the flower to give them it (Enter on a cell does it too). Each colour is one kind, as in this list.',
    moves: 'Where each 2d6 goes',
    movesHelp:
      'From the cell the day is on (the middle), the 2d6 totals that move it each way: 2–3 north-east, 4–5 east, 6–7 south-east… A pack may change them (`moves` in the YAML).',
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
      "The definitions the system plays with, each by its kind and id: this pack's (`travel-rules.default`) or a dependency's (`core/travel-rules.default`).\n• **Travel rules** — how a trip goes (`kind: travel-rules`); none: the Generic rules\n• **Bindings** — which table answers each check, and the party's stats (`kind: bindings`)\n• **Calendar** — how days are named, by trips and the world clock (`kind: calendar`); none: the default one",
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
      "The weather models (`kind: weather`) its bindings can name in a check (`weather: weather.highland-skies`), so the day's weather has inertia: this pack's and its dependencies'.\n• `weather: [weather.highland-skies]`\n• `weather: [weather.coast, core/weather.plains]`",
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
    /** Beside a button with help: its explanation, without pressing it. */
    whatItDoes: 'What it does',
    description: 'Description (its help)',
    descriptionHelp:
      "What it is and what it's for, in a sentence or two: players read it as its help where they meet it (the trip panel, a character's or a faction's card, the World panel), before what the apps add (how tables read it, its bounds…). Basic Markdown. Written in the current language: the pack's own, or its translation file.\n• _Lost to fords, ambushes and the cold; a fed night in camp gives one back._",
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
      'Hexes whose terrain the map marks as **water** (Hexmapper: Edit palette → Water) and that have no rule of their own in Terrains.\nOften **not passable**; a way of travelling whose **Only through** holds on water can still sail them:\n• a boat: `hex.water: true`\n• a boat that also hugs the shore: `any: [{ hex.water: true }, { hex.terrain: coast }]`\nA terrain listed in Terrains (a frozen `lake` with **Open when** `time.season: winter`) uses its own rule instead.',
    day: 'The day',
    dayHelp:
      "When trips start, the scale of their speeds and what the party does when it can't march. When and how far the party marches is its actions' (Actions below: an action with a `travel.move` step, like **March**), and how the trip goes on by itself is one of them (**Goes on by itself with**).\n• **Trips start** `06:00` or `time.part.morning` — a new trip's first moment\n• **Halt** `time.part.night` → `camp` — from then on, a party that can't march camps by itself",
    tripStart: 'Trips start',
    tripStartHelp:
      "When a new trip starts on its first day: a clock or a part of the calendar's day (when it starts). Empty: at midnight.\n• `06:00`\n• `time.part.morning` — if the calendar divides its day into `part`s with a `morning`",
    halt: 'Halt',
    haltAt: 'Halt from',
    haltDo: 'Halt action',
    haltHelp:
      "What the party does when **it can't march and the time moves on by itself**: the world clock moving with a trip on, a travel order with nothing left to march, **Wait to go on**. From this moment (a clock or a part of the day) until the day ends, a party that isn't marching takes the action, once a day.\n• **from** `20:00`, **action** `camp`\n• **from** `time.part.night`, **action** `watch`\nWhen the action **can't be taken** (its **Only when** / **Not when**, or a value that blocks it), the journal says why and the time passes without it until the party can march.\n• camp with **Only when** `party.resources.food: { gte: 1 }` — a hungry party sleeps in the open\nNo action: the party just waits.",
    haltNone: 'nothing: the party waits',
    onwardDo: 'Goes on by itself with',
    onwardHelp:
      "The action the trip takes **when it goes on by itself**: the world clock moving with a trip on, or a travel order. It takes it whenever it can (its **Only when** / **Not when**) and waits otherwise (with the **Halt**). It's usually the action that moves the party, with how far:\n• **action** `march`, **with** `until: destination` — marches on to the destination, day after day\n• **action** `sail`, **with** `until: hex` — one hex at a time\nNothing: the trip only waits; the player moves it with the action buttons.",
    onwardNone: 'nothing: the trip only waits',
    onwardWith: 'With',
    onwardWithHelp:
      "The values of that action's **Parameters**, as `parameter: choice` pairs; the ones left out take their default.\n• `until: destination`\n• `until: 3` — three hexes\nEmpty: every parameter at its default.",
    hoursPerDay: 'Marching hours a day',
    hoursPerDayHelp:
      "The hours a way of travelling's **km a day** are marched in: the scale of its speed (km an hour). How long the party may march each day is the **March** action's (`trip.marched: { lt: '{{system.hoursPerDay}}' }` reads this number).\n• `8` — 24 km a day is 3 km an hour\n• `10` — the same 24 km at 2.4 km an hour",
    hexKm: 'km per hex',
    hexKmHelp:
      "The scale the system is played at: how many km a hex measures. With the speeds of its ways of travelling, it says how long a hex takes.\n• `30` — large hexes: about one a day for a way of travelling that makes 30 km\n• `10` — small hexes: several a day\nTrips without a map (Travel, **Try it**) are played at it; a map with this system takes it, unless the map sets its own scale (Hexmapper: Map settings → Map). Empty: the map's or the way's, 10 by default.",
    modes: 'Ways of travelling',
    modesHelp:
      'Ways of travelling: on foot, on horseback, by boat… Each has a speed in **km per marching day** on easy ground (terrains and roads change it), and can be limited to some places and moments.\n• `foot` — 24 km a day\n• `horse` — 40 km a day, **Not when** `trip.weather: snow`\n• `boat` — 50 km a day, **Only through** `hex.water: true`\nThe trip panel lets the player switch between them.',
    kmPerDay: 'km per day',
    name: 'Name',
    nameHelp:
      "What players read in the trip panel and the journal instead of the id:\n• `horse` → _On horseback_\n• `food` → _Rations_\nWritten in the current language: the pack's own, or its translation file (`locales/<language>/`) when the interface is in another one. Empty: the id (or the app's name for the usual ones: foot, horse, food…).",
    allowedTerrains: 'Only through',
    allowedTerrainsHelp:
      'Where this way of travelling can go: a condition on **each hex it enters** (its terrain, water, tags, region, fields, the roads or rivers of the step).\n• a boat: `hex.water: true`\n• a boat that also follows the coast: `any: [{ hex.water: true }, { hex.terrain: coast }]`\n• a cart only by road: `trip.edges: road`\n• a mount that avoids forests: `not: { hex.terrain: [forest, dense-forest] }`\nWhere it holds, even closed terrains are open to it. Empty: wherever terrains allow.',
    anyTerrain: 'wherever terrains allow',
    terrains: vocabulary.en.terms.terrains,
    terrainsHelp:
      'How each terrain changes the speed, and whether it can be entered. Terrain ids are the ones the map uses:\n• `forest` × `0.5` — half as fast\n• `plains` × `1` — normal speed\n• `peaks` × `0.25`, **Open when** `time.season: summer`\nTerrains not listed use **Speed × for terrains not listed**.',
    terrain: vocabulary.en.terms.terrain,
    multiplier: 'Speed ×',
    multiplierHelp:
      'How fast this terrain is crossed, compared with easy ground:\n• `1` — normal speed\n• `0.5` — half as fast\n• `0.25` — a quarter\n• `2` — twice as fast\nFor example, with a way of travelling of 24 km a day and 12 km hexes, a hex at `0.5` takes a whole marching day.',
    passable: 'Passable',
    passableHelp:
      '**Unticked**: no way of travelling can enter it (routes go around), except one whose **Only through** holds there (a boat on a lake).\n**Ticked**, it can still open or close on a condition:\n• **Open when** `time.season: winter` — a lake crossed on the ice\n• **Closed when** `trip.weather: [snow, storm]` — a pass shut by the weather',
    openWhen: 'Open when',
    closedWhen: 'Closed when',
    passableWhenHelp:
      "When the terrain can be entered, as a condition on **the hex entered and the moment**: its terrain, tags, region, fields, the roads or rivers of the step, the way of travelling, the weather, the season and calendar, today's values.\n• **Open when** `time.season: winter` — only while it holds: a lake crossed on the ice\n• **Open when** `time.month: [1, 12]` — the two coldest months of the calendar\n• **Closed when** `any: [{ time.season: winter }, { trip.weather: snow }]` — a mountain pass\n• **Closed when** `trip.mode: horse` — not for riders\nEmpty: always open / never closed.",
    defaultTerrain: 'Speed × for terrains not listed',
    defaultTerrainHelp:
      "The speed for any terrain missing above:\n• `1` — normal (the default when empty)\n• `0.75` — unknown ground is a bit slower\nA map with a terrain the system doesn't know (`badlands`) uses this.",
    edges: 'Roads and rivers',
    edgesHelp:
      "Following a road, trail or river **from one hex to the next**: its speed replaces the terrain's.\n• `road` × `1.5` — half again as fast as open ground\n• `trail` × `1` — as open ground, even through a forest\n• `river` × `2` — downstream by boat\nLines not listed do nothing. Checks can tell them apart too: `trip.edges: road` in a condition.",
    edge: 'Line',
    edgeMultiplierHelp:
      "Speed along this line, replacing the terrain's:\n• `1.5` — half again as fast as open ground\n• `1` — open-ground speed, whatever the terrain\nA road at `1.5` through a terrain at `0.5` is three times as fast as that terrain.",
    resources: vocabulary.en.terms.supplies,
    resourcesHelp:
      'What the party carries: food, fodder, water, torches… What uses it is **up to the system**, never the app:\n• an action at the end of each day eats: `effects: { party.resources.food: -1 }`\n• a table entry finds some: `effects: { party.resources.food: 2 }`\n• a check without food tires: **Only if** `trip.below: food`\nThe trip panel shows each one and lets the player change it by hand.',
    min: 'Min',
    minHelp:
      'Effects never take it below this: a change past it stops there, the journal says so ("Food can\'t go lower than 0"), and later steps and that day\'s checks see `trip.below: [its id]`.\n• food with Min `0` — eating with none left stays at 0, and a day-end check with **Only if** `trip.below: food` tires the party\n• gold with no Min — it may go negative, like a debt',
    max: 'Max',
    maxHelp:
      "Effects never take it above this; later steps and checks see `trip.above: [its id]`.\n• water with Max `4` — a full waterskin can't hold more\n• morale with Max `5` — a feast can't raise it past 5\nA new trip starts with 6 of each supply, or its Max if lower (its Min if higher).\nEmpty: no maximum.",
    weather: vocabulary.en.terms.weather,
    weatherHelp:
      "How each weather slows the party. Tables set it with `set: { weather: … }` (usually rolled at dawn), or a weather model with inertia.\n• `storm` × `0` — no travel that day\n• `heavy-rain` × `0.5` — half speed\n• `fog` × `0.75`\nWeather not listed doesn't change the speed; conditions can still read it (`trip.weather: storm`).",
    weatherState: vocabulary.en.terms.weather,
    speed: 'Speed ×',
    speedHelp:
      'How fast the party marches in this weather:\n• `0` — no travel that day (the day is lost)\n• `0.5` — half speed\n• `1` — as usual',
    actions: 'Actions',
    actionsHelp:
      "What the party can do: **march**, **camp**, **rest** and the system's own (forage, pray, talk to the porters…), each a button in the trip panel, or taken by the system itself (**By itself at**). Nothing is built in: marching is an action like the rest.\nEach one says when it can be taken (**Only when** / **Not when**, **Once a day**) and what it does, **step by step**:\n• march: `travel.move: '{{params.until}}'`, with a parameter `until` (to the destination or one hex)\n• rest: `time: 120`, then `effects: { party.stats.fatigue: -1 }`\n• forage: `time: 180`, `travel.speed: 0.5`, its check at `forage`\n• eat, by itself at `time.day-end`: `effects: { party.resources.food: -1 }`",
    oncePerDay: 'Once a day',
    modeWhenHelp:
      "When it can be chosen (**Only when**) or not (**Not when**), as a condition on where the party is and the moment.\n• a boat only at the water's edge: `any: [{ hex.water: true }, { hex.tags: ferry }]`\n• no horses in the snow: **Not when** `trip.weather: snow`\n• a cart only in summer: **Only when** `time.season: summer`\nEmpty: always. A value of the day can block it too (**Blocks** `modes.<id>`).",
    values: 'Values of the day',
    valuesHelp:
      "Values this system's tables and actions can set **for the rest of the day**, with what they block while they hold. Tables read them the next day as `yesterday.<id>`.\n• `lost` — set by `set: { lost: true }`, blocks `travel.move`\n• `snowed-in` — blocks `modes.horse`\n• `mutinous` — blocks `travel.move` until an action clears it (`set: { mutinous: false }`)\nWithout any, nothing blocks travel.",
    blocks: 'Blocks',
    blocksHelp:
      "What can't be done while the value holds:\n• `travel.move` — no more moving on today\n• an action, e.g. `actions.camp` or `actions.forage` — its button turns off\n• a way of travelling, e.g. `modes.horse` — that way of travelling: it can't be chosen, and a party already travelling so stops until it changes\nThe box suggests what this system declares. Blocked buttons stay visible, disabled, saying why (unless the action is **Hidden when it can't be taken**).",
    blocksNothing: 'nothing',
  },
  actions: {
    when: 'Only when',
    unless: 'Not when',
    whenHelp:
      "When the action can be taken (**Only when**) or not (**Not when**), with conditions like the tables':\n• `trip.weather: storm` — today's weather\n• `hex.terrain: [forest, hills]` — the hex the party is in\n• `hex.tags: shrine` — a tag of that hex\n• `party.stats.fatigue: { lt: 2 }` — the party\n• `party.resources.food: { gte: 1 }` — food left\n• `mutinous: true` — a value of the day\n• `time.moons.silver: full` — the calendar\n• `time.hour: { gte: 6, lt: 20 }` — only by day, from 06:00 to 20:00; `time.part: night`, `time.tags: dark` — a part of the calendar's day, or its tags\n• `trip.visits: 1` — the first time here; `around.terrain: lake` — next to a lake\n• `trip.doneToday: forage` — after foraging today; `trip.marched: { gte: 6 }` — after 6 hours of marching\n• `trip.km: { gte: 100 }`, `trip.taken.camp: { gte: 7 }`, `trip.spent.food: { gte: 10 }` — what the trip has done so far\n• `party.stats.fatigue: { lt: '{{party.stats.endurance}}' }` — a variable: compared with another value (quoted)\n• `party.stats.wits: { gte: '{{1d20}}' }` — a roll: the same all the moment long\nEach value by its **full name**, which says where it comes from (`hex.*`, `time.*`, `trip.*`, `system.*`, `world.*`, `party.*`): never hidden by a stat with the same name\nOtherwise its button stays disabled and says why (or hides, with **Hidden when it can't be taken**); the halt's action that can't be taken lets the time pass without it.",
    params: 'Parameters',
    paramsHelp:
      "What the player chooses when taking it (beside its button, a choice for each), and what a `do:` step or **Goes on by itself with** gives it. Each parameter has its **choices** (the first is its default, unless `default` says another); its steps and conditions read the one chosen as `{{params.<id>}}`.\n• `until: { choices: [destination, hex, 3] }` — how far a march goes: with the step `travel.move: '{{params.until}}'`\n• `pace: { choices: [steady, quick], default: steady }` — with **Only when** `params.pace: quick` on a step\nA choice may have a name to show: `{ id: 3, name: Three hexes }` (translated in the pack's locales). Empty: no choices, just the button.",
    noParams: 'none: just the button',
    hide: "Hidden when it can't be taken",
    hideHelp:
      "**Unticked**: its button is always there, disabled (saying why) while it can't be taken, so the buttons don't move around.\n**Ticked**: its button only appears while it can be taken. For actions that only make sense now and then:\n• a rite only at a shrine under a full moon\n• talking round porters only while they refuse to march",
    nothing: 'When nothing applies',
    nothingHelp:
      'What the journal says when **none of its checks apply** where the party is; `{terrain}` is the hex\'s terrain.\n• `nothing to forage on {terrain}` → "nothing to forage on Hills"\nEmpty: a generic sentence. An action without checks says nothing more.',
    nothingPlaceholder: 'nothing to find on {terrain}',
    steps: 'What it does',
    stepsHelp:
      "What the action does, **one step per card, in order**: choose what each one does in its first box, then fill in its fields (each explains itself). Click a card's title to fold or open it; folded, it reads in words (_Pass 3 h_, _Take March (until: hex)_). ↑ and ↓ reorder them.\n**Only when** / **Not when** on a step: it only happens when they hold, built as rows (what it reads · comparison · value). Besides what the action's own conditions see, they see:\n• `params.how` — the action's parameters\n• `trip.below` is `food` — food hit its minimum during the action (`trip.above`: a maximum)\n• `trip.moment` is `trip.hex-enter` — when the system took it\n• `trip.doing` — the action under way\n**Edit as YAML** on a card shows the step as the pack writes it (`time: 180`, `do: actions.march, with: { until: hex }`), for what the form doesn't cover; nothing written there is lost by the form. A step may have an `id` there (`id: song`), which its translations name.\nThe actions that follow this one, and its checks (Checks → **When**: this action), come first.",
    on: 'By itself at',
    onHelp:
      "**Empty**: the player takes it, with a button.\nOtherwise the **moments the system takes it by itself**, if its conditions hold; it isn't a button then, and it comes before that moment's checks:\n• a clock, e.g. `06:00` — as it strikes\n• a part of the calendar's day, e.g. `time.part.morning` — as it begins\n• `trip.hex-enter` — entering each hex\n• `time.day-end` — as each day ends, camping or not\n• an action, e.g. `actions.camp` — right after that action starts\n• a progress clock filling, e.g. `world.clocks.the-threat.full` — once the step that filled it is done, or at once when it fills by hand or in another app (on the trip's next step there); one made by hand is named by its name in lowercase with dashes\nSeveral, separated by commas: `06:00, trip.hex-enter`. Its conditions see which one it is as `moment` (`when: { trip.moment: trip.hex-enter }`).\nExamples:\n• eating as each day ends: `time.day-end`\n• porters grumbling in the morning after a hungry day: `time.part.morning` (or `06:00`) with **Only when** `yesterday.hungry: true`",
    onButton: 'nothing: a button for the player',
    onAfter: 'After: {action}',
    step: 'Step',
    badStep:
      "A step does one thing: time: 60, travel.move: destination, travel.speed: 0.5, travel.advance: 1, travel.mode: modes.<way>, effects: { … }, set: { … }, do: <action> (and its with: { … }), roll: checks.<check>, say: <text>, pause: true, ask: <parameter> or wait: { … } with limit: '18:00'.",
    up: 'Move up',
    down: 'Move down',
    noSteps: 'No steps: it does nothing but roll its checks.',
    addStep: 'Add a step',
    add: 'Add an action',
  },
  steps: {
    kind: 'What it does',
    kindHelp:
      "What this step does: one thing, chosen here; its fields change with it.\n• **Pass time** — minutes, or until a clock or a part of the day\n• **Move** — along the route while time passes\n• **Change speed**, **Advance hexes**, **Change way of travelling** — the rest of the trip's moving\n• **Change values** — the party, its characters, factions, clocks\n• **Set a value of the day** — one the system declares\n• **Take another action**, **Roll a check or a table** — the system's own, or the Oracle's\n• **Say**, **Pause**, **Ask the player** — talk to the player\n• **Wait for something** — time passes until a condition holds\nChanging it keeps the step's conditions.",
    kinds: {
      time: 'Pass time',
      'travel-move': 'Move',
      'travel-speed': 'Change speed',
      'travel-advance': 'Advance hexes',
      'travel-mode': 'Change way of travelling',
      effects: 'Change values',
      set: 'Set a value of the day',
      do: 'Take another action',
      roll: 'Roll a check or a table',
      say: 'Say',
      pause: 'Pause',
      ask: 'Ask the player',
      wait: 'Wait for something',
    },
    fields: {
      time: 'How long, or until when',
      'travel-move': 'How far',
      'travel-speed': 'Speed',
      'travel-advance': 'How many',
      'travel-mode': 'Way of travelling',
      effects: 'Changes',
      set: 'Values of the day',
      do: 'Action',
      with: 'With',
      roll: 'What it rolls',
      say: 'Text',
      pause: 'Why (optional)',
      ask: 'Parameter',
      wait: 'Until',
      limit: 'At most until',
    },
    help: {
      time: "Minutes that pass, or until when time passes, living everything on the way (each moment's checks and actions, the day ending):\n• `180` — three hours\n• `'14:00'` — until the clock next strikes 14:00\n• `time.part.morning` — until that part of the calendar's day next begins",
      'travel-move':
        "How far the party moves along its route, minute by minute, while the action's **Only when** / **Not when** hold (a march by day stops as night falls):\n• `destination` — to the end of the route\n• `hex` — the next hex\n• `3` — three hexes\n• `'{{params.until}}'` — as the action's parameter says\nA check that needs the player stops it on the way; **Go on** goes on with it.",
      'travel-speed':
        "How fast the rest of today's moving goes, multiplied with the weather's:\n• `0.5` — half speed\n• `1.5` — faster\n• `0` — no more moving today",
      'travel-advance':
        "Hexes (or legs of a way) the party moves along its route at once, no time passing: progress by moves instead of marching.\n• `1` — one hex\n• `'{{party.stats.rank}}'` — as many as a value says",
      'travel-mode':
        "The way of travelling from now on, if it can be chosen now (its own conditions hold and nothing blocks it); otherwise nothing changes. With a destination, the route is planned again for it.\n• `modes.boat` — one of the system's ways\n• `'{{params.by}}'` — as the action's parameter says",
      effects:
        "What changes, one row each: a number adds or takes away.\n• `party.stats.fatigue` · `1` — adds 1\n• `party.resources.food` · `-1` — takes 1 away\n• `party.stats.fatigue` · `=0` — sets it\n• `party.resources.food` · `-{{party.stats.mouths}}` — as many as another value\n• `party.members.values.health` · `1`, `acting.conditions.wounded` · `false` — its characters\nA change past a value's **Min** or **Max** stops there, and later steps see `trip.below` / `trip.above`.",
      set: 'Values of the day the system declares (**Rules → Values of the day**), one row each; they last until the day ends.\n• `lost` · `true`\n• `ferry` · `true` — what a **Wait for something** step may wait for',
      do: 'Another action of the system, taken now if its conditions hold (otherwise nothing happens). **With** gives its parameters; empty, each takes its default.\n• **March**, with **until** `hex` — one hex of marching\n• a forced march: **Change speed** `1.5`, then **Take another action** March',
      roll: 'What is rolled now, its result when the action ends (so later steps don’t see it yet):\n• a check of the system (**Checks**), whatever its **When**\n• a table, oracle, generator or deck of the system’s packs, e.g. `table.ruins`: no check around it, its result in the journal by its name, its values and changes reach the trip, and an entry with a pause stops it',
      say: "A line of the system's own in the journal. Values in it are read then:\n• `The porters sing as they walk.`\n• `Across, with {{party.resources.food}} food left.`",
      pause:
        'The trip waits here until the player presses **Continue**, then goes on with the rest. Empty: it just waits; with a text, the waiting box and the journal say it (`The ferry is on the far bank.`).',
      ask: "The trip waits for the player to choose one of this action's **Parameters**, with a button per choice; later steps read the answer, e.g. **Only when** `params.how` is `swim`.",
      wait: 'Time passes until this condition holds, minute by minute, living the moments on the way. If it already holds, no time passes.\n• `today.ferry` is `true` — set by an action at noon\n• `time.part` is one of `afternoon, evening`',
      limit:
        "The most it waits, written like **Pass time**:\n• `60` — minutes from now\n• `'18:00'`\n• `time.part.night`",
    },
    with: {
      default: 'its default',
      none: 'This action has no parameters.',
    },
    pairs: {
      key: 'What changes',
      value: 'Value',
      add: '+ Row',
      remove: 'Remove this row',
    },
    noChoice: '— choose —',
    noParams: 'This action has no parameters to ask: declare one in **Parameters** first.',
    open: 'Show this step',
    close: 'Fold this step',
    yaml: 'Edit as YAML',
    form: 'Edit as a form',
    unknown: 'This step doesn’t do one thing the trip knows: fix it as YAML.',
    partBegins: '{part} begins',
    onlyWhen: 'only when {condition}',
    notWhen: 'not when {condition}',
    say: {
      time: 'Pass {time}',
      timeUntil: 'Pass time until {time}',
      moveDestination: 'Move to the destination',
      moveHex: 'Move one hex',
      moveHexes: 'Move {count} hexes',
      move: 'Move: {value}',
      speed: 'Speed ×{value} the rest of the day',
      advance: 'Advance {value} along the route',
      mode: 'Travel: {mode}',
      effects: 'Change: {changes}',
      set: 'Set: {values}',
      do: 'Take {action}',
      doWith: 'Take {action} ({with})',
      roll: 'Roll {check}',
      say: 'Say “{text}”',
      pause: 'Pause until Continue',
      pauseText: 'Pause: “{text}”',
      ask: 'Ask: {param}',
      wait: 'Wait until {condition} (at most {limit})',
      unknown: 'Unknown step: {step}',
    },
  },
  kinds: vocabulary.en.kinds,
  checks: {
    title: 'Checks',
    help: 'What is rolled on the way, when, and on which table. A check without a table is only written in the journal (with its **Changes**); only **Pause after it** stops the trip.',
    event: 'Check',
    name: 'Name',
    nameHelp:
      "What players read in the trip panel and the journal instead of the event id:\n• `NAVIGATION_CHECK_REQUIRED` → _Getting lost_\n• `HUNGER_CHECK_REQUIRED` → _Hunger_\nThis box edits it in the current language: the pack's own, or its translation file when the interface is in another one.",
    at: 'When',
    atOptions: {
      'hex-enter': 'Entering a hex',
      camp: 'In camp',
      'day-end': 'At the end of the day',
    },
    atNone: 'only when a step rolls it',
    atPart: 'As {part} begins',
    atClock: 'At {clock}',
    atFull: 'When {clock} fills',
    atHelp:
      "When it is rolled:\n• a clock, e.g. `06:00` — as it strikes, marching, waiting or asleep\n• a part of the calendar's day, e.g. `time.part.morning` — as it begins\n• `trip.hex-enter` — entering each hex\n• `time.day-end` — as each day ends (after the system's day-end actions)\n• an action, e.g. `actions.camp` or `actions.forage` — when the party takes it\n• a progress clock filling, e.g. `world.clocks.the-threat.full` — whatever fills it: the trip, a faction's turn, or a hand on the World panel; one made by hand is named by its name in lowercase with dashes\nSeveral, separated by commas: `trip.hex-enter, actions.rest`. Its conditions and its table see which one it is as `moment` (`when: { trip.moment: actions.rest }`).\nEmpty: only when an action's step rolls it (`roll: checks.<its event>`).",
    atAction: 'Action: {action}',
    when: 'Only if',
    unless: 'Skip if',
    conditionHelp:
      "When the check is rolled (**Only if**) or skipped (**Skip if**), as `key: value` pairs, like in tables:\n• `hex.terrain: forest` — the hex\n• `hex.tags: landmark` — a tag of the hex\n• `trip.edges: [road, river]` — the road or river of the step\n• `danger: { gte: 2 }` — a value of the hex or its region\n• `time.season: winter`, `trip.weather: storm` — the moment\n• `time.hour: { gte: 20 }` — from 20:00; `time.watch: 3` — the third watch\n• `time.meal: elevenses`, `time.tags: dark` — a part of the calendar's day, or its tags\n• `from.terrain: forest` — coming out of a forest; `trip.visits: { gte: 2 }` — back again\n• `world.clocks.the-flood: { gte: 4 }` — a clock of the world clock; `world.events: market-day` — today’s event\n• `danger: { gt: '{{party.stats.stealth}}' }` — a variable: compared with another value\n• `party.stats.wits: { gte: '{{1d20}}' }` — a roll under a stat\nEach value by its **full name**, which says where it comes from (`hex.*`, `time.*`, `trip.*`, `system.*`, `world.*`, `party.*`): never hidden by a stat with the same name\n• `party.resources.food: { lt: 1 }` — the party\n• `acting.values.survival: { gte: 2 }`, `characters.kael.conditions: wounded`, `party.members: kael` — its characters, when the system has a sheet\n• `trip.below: food` — food hit its minimum today (at `time.day-end`)\n• `trip.moment: actions.rest` — which of its moments it is (when it has several)\n• `any: [{ hex.terrain: forest }, { danger: { gte: 3 } }]` — either\nRead just before the check is rolled: the checks of one moment come one by one, in the list's order, each seeing what the ones before it set (at dawn, after the weather's, `trip.weather: storm` is today's)",
    always: 'always',
    never: 'never',
    resolve: 'Rolled on',
    resolveHelp:
      "The table, oracle, generator or deck that resolves it. Its result goes to the journal, and its `set` values and `effects` reach the trip.\n• `table.getting-lost` — sets `lost: true` on a bad roll\n• `oracle.ford` — an oracle, its input from the check's context\n• a weather model — the day's weather with inertia\n• **no table** — it's only written in the journal, with its **Changes**; tick **Pause after it** to resolve it by hand",
    weatherModels: 'Weather with inertia',
    weatherModel: 'Weather model: {model}',
    waits: '— no table —',
    effects: 'Changes',
    effectsHelp:
      "What the check itself changes when it comes up, with or without a table:\n• `party.stats.fatigue: 1` — adds 1\n• `party.resources.food: -1` — takes 1 away\n• `party.stats.fatigue: '=0'` — sets it\n• `party.resources.food: '-{{party.stats.mouths}}'` — as many as another value says (a variable)\n• `party.members.values.health: -1`, `acting.conditions.wounded: true` — its characters (every one, whoever acts)\nHow a system writes its rules as data, e.g. a day without enough food: **When** `time.day-end`, **Only if** `trip.below: food`, **Changes** `party.stats.fatigue: 1`.",
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
      'Numbers of the party the tables can use, edited during the trip:\n• `survival` — in a roll: `1d6 + {{party.stats.survival}}`\n• `morale` — in a condition: `party.stats.morale: { lte: 1 }`\n• `fatigue` — changed by effects: `party.stats.fatigue: 1`',
    statName: 'Name',
    statDescription: 'Description',
    statDefault: 'Starts at',
    noStats: 'No party stats.',
    addStat: 'Add a stat',
    statFrom: 'From the sheets',
    statFromHelp:
      "With characters in the party, the stat is made of theirs (and effects on it are overwritten); without, it's kept as any other. One of:\n• `max: survival` — the best Survival among them\n• `min: stealth` — the worst\n• `sum: strength` — all of them together\n• `count: true` — how many they are\n• `pick: charisma` — whoever the player chooses to roll in the trip (the best by default)\nAdd `when` / `unless` to count only some, and `none` for when nobody counts:\n• `count: true, unless: { conditions: wounded }` — those not wounded\n• `max: wits, when: { values.health: { gt: 0 } }, none: 0` — the best of those still standing\nNeeds a sheet (the **Sheet** tab).\nOr one value of the party's own sheet, always: the stat is that value, and effects on it change the sheet:\n• `party: morale` — the party sheet's Morale",
    statFromNone: 'kept by the party',
    roles: 'Journey roles',
    rolesHelp:
      "Jobs the party's characters take for the journey (lead the way, keep watch, forage…), Forbidden Lands-style: in a trip, each role is given to one character, and the system's checks, tables and actions read the holder and change them:\n• `roles.guide.values.pathfinding: { gte: 2 }` — the guide is good enough\n• `modeWhen: { advantage: { roles.lookout.values.stealth: { gte: 2 } } }` — a table rolled with advantage\n• `roles.lookout.values.health: -1` — an effect on the lookout\nNeeds a sheet.",
    roleName: 'Name',
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
    dependency:
      'From {pack}, a pack this system brings along: read-only here, since every system that brings it shares it. To change it for this system, make your own in the system’s pack.',
    builtIn:
      'The Generic rules are Core’s system, the one a map plays when it chooses none: read-only here, as every system may bring Core. To change them, create a new system (below the list on the left): it starts from a copy of their rules.',
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
  uses: {
    title: 'Used by',
    help: "Where this is used in the system's packs: the travel rules' actions and checks, the bindings, the sheets, the clocks and factions, and the tables, oracles, generators and decks. Each place says whether it **reads** it (a condition, a `{{…}}`), **changes** it (effects), **sets** it (`set`) or **is made of** it (a stat's `from`).\n• The number is how many places use it; press it to see them below the row, each with a link to where it's edited (tables open in the Oracle).\n• **–** means nothing uses it yet: often fine (a value the player reads), sometimes a mistake (a stat no table reads, a name written differently).\nWhat the map gives (a hex's own values) and what the engines read by themselves aren't listed.",
    count: 'Used in {n} places',
    none: 'Not used yet',
    as: 'as {name}',
    how: { reads: 'reads it', changes: 'changes it', sets: 'sets it', derives: 'is made of it' },
    kinds: {
      action: 'action',
      check: 'check',
      rules: 'travel rules',
      stat: 'party stat',
      carried: 'carried supply',
      bindings: 'bindings',
      sheet: 'sheet',
      clock: 'clock',
      clocks: 'clocks',
      faction: 'faction',
      factions: 'factions',
      weather: 'weather model',
      table: 'table',
      oracle: 'oracle',
      generator: 'generator',
      deck: 'deck',
    },
    find: 'Find a name',
    findHelp:
      "Every place in the system's packs that reads, changes or sets a name, as written or by its full name: tables included, which no other tab shows.\n• `pathfinding` — a value of the characters' sheet\n• `party.stats.morale` — a party stat by its full name, also found where it's written short (`morale`)\n• `roles.guide` — everything read of whoever holds a role\n• `today.lost` — a value of the day\nA name nothing in the system declares is often a typo: it says so, with the names it looks like.",
    findPlaceholder: 'pathfinding, party.stats.morale…',
    nothing: 'Nothing in this system uses it.',
    undeclared: "Nothing in this system declares it, and the engines don't give it: a typo?",
    close: 'Names like it: {names}',
  },
  yaml: { line: 'line {line}' },
  terrains: vocabulary.en.terrains,
  edgeKinds: vocabulary.en.pathKinds,
  storage: { full: 'Browser storage is full: export your packs to keep them safe.' },
} as const

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
    bestiary: 'Bestiary',
    places: 'Places',
    items: 'Items',
    factions: 'Factions',
    clocks: 'Clocks',
    world: 'World',
    calendar: 'Calendar',
    weather: 'Weather',
    land: 'Land',
    modes: 'Roll modes',
    try: 'Try it',
    yaml: 'YAML',
  },
  parts: {
    items: {
      title: 'Its items',
      intro:
        "What its characters may carry (`kind: items`): catalogues of items, each with its name, description, tags, the places it fits and the numbers the sheet gives every item (its **Items** section: slots, weight, uses…). On a character's card, **Add an item** offers them by name; anything else is written by hand. Effects give an item from them when a character has none yet.",
      help: 'Item catalogues, as many as the system wants (gear, weapons, magic), named in its **Overview** (`items:`). Tables and conditions read what a character has:\n• `characters.kael.items.torch.count: { gte: 1 }` — has a torch\n• `acting.items.tags: light` — carries something tagged light\nEffects give and take them:\n• `acting.items.torch: -1` — one torch fewer\n• `party.members.items.ration: 1` — a ration each, from the catalogue if they have none',
      none: 'This system has no item catalogues: its characters may still carry items written by hand.',
      create: 'New catalogue',
    },
    places: {
      title: 'Its places',
      intro:
        "Places a result can make on the party's hex (`kind: places`): templates of points of interest, each with its name, text, icon, fields and the tags it gives the hex. A table, an action or a discovered hex's contents makes one with an effect (`hex.pois.ruins: 1`); on a map in the Hexmapper it's written into the map, in a trip without one the journal notes it. A place keeps what it was made with: changing a template touches only places made after.",
      help: 'Catalogues of places, as many as the system wants, named in its **Overview** (`places:`), and those of the packs a map or campaign adds. Effects make them on the party’s hex:\n• `hex.pois.ruins: 1` — one **Ruins**\n• In discovery’s contents, `effects: { hex.pois.shrine: 1 }` — the hex found holds a shrine, instead of a point of interest made of the result’s text',
      none: 'This system has no catalogue of places: results may still make plain points of interest from their text in discovery.',
      create: 'New catalogue of places',
    },
    bestiary: {
      title: 'Its bestiary',
      intro:
        "Creatures and kinds of people it can make (`kind: bestiary`): templates, each a character of a sheet written as one is, with rolls (`2d4`) filled in for each copy. A table or an action makes copies with an effect (`present.wolf: '{{1d4+2}}'`), and they stand among those present in the trip. A copy keeps what it was made with: changing a template touches only copies made after.",
      help: 'Bestiaries, as many as the system wants, named in its **Overview** (`bestiary:`), and those of the packs a map or campaign adds. Effects and conditions read the copies:\n• `present.wolf: 3` — three wolves come\n• `present.wolf.count: { gte: 1 }` — some wolf is here\n• `present.all.values.morale: -1` — every copy loses one morale',
      none: 'This system has no bestiary.',
      create: 'New bestiary',
    },
    clocks: {
      title: 'Its progress clocks',
      intro:
        "Clocks of its world (`kind: clocks`): segments that fill as something advances (a threat, a plan, a season of raids), each with what becomes of it once full; what happens when one fills is the world's (**World** tab). In the Hexmapper they come with the world clock when it starts; trips, tables and faction turns fill them with effects, and conditions read them.",
      help: "One clocks definition per system, named in its **Overview** (`clocks:`). Conditions and tables read each by its id:\n• `world.clocks.the-wyrm-wakes: { gte: 6 }` — once it is full\nEffects fill it, from a trip, a table or a faction turn:\n• `world.clocks.the-wyrm-wakes: 1` — a segment more\n• `world.clocks.the-wyrm-wakes: -2` — two less\n• `world.clocks.the-wyrm-wakes: '=0'` — empty",
      none: 'This system declares no progress clocks: they can still be made by hand on a map.',
      create: 'New clocks',
    },
    world: {
      title: 'What its world does',
      intro:
        "Its world's rules (`kind: world`): what the world does by itself, with or without a trip going on, when something happens in it: a progress clock fills, a world turn is played, a condition turns true (a faction's value, an event's day). Each reaction does its steps: words on the timeline, a table rolled, changes to clocks and factions, another reaction or a world turn.",
      help: 'One world rules definition per system, named in its kind: system (`world:`). Each reaction comes at:\n• `world.turn` — after every world turn\n• `world.clocks.the-siege.full` — as a clock fills\n• `{ when: { factions.the-crown.values.strength: { lte: 0 } } }` — once, as it turns true\nIts steps: `say`, `roll`, `effects`, `do` (`world.reactions.<id>`, `world.turn`).',
      none: 'This system has no world rules: its world only moves by its clocks and factions.',
      create: 'New world rules',
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
        "Two sheets, both optional. **The party's own** (`partySheet`): what belongs to the whole party (morale, fatigue, hirelings…), in every trip whoever travels. **Its characters'** (`sheet`): what each character has, so the party can be made of characters who join and leave; the **Checks** tab says which party stats come from them, and the party's items are theirs together. Each has values with their bounds, tracks, conditions and relations. When the system has factions, **their sheet** (chosen in the **Factions** tab) is edited here too.",
      help: "Named in its **Overview** (`partySheet:`, `sheet:`). Conditions and tables read the party's sheet and each character:\n• `party.values.morale: { gte: 3 }` — the party\n• `characters.kael.values.health: { lte: 1 }` — one by id\n• `acting.values.wits: { gte: 3 }` — the one acting now\nEffects change them:\n• `party.values.morale: -1`\n• `party.members.values.health: -1` — every character\nA party stat can be a value of the party sheet: `from: { party: morale }` (in **Checks**).",
      none: 'This system has no sheet: its party is played as a whole, with its stats.',
      create: 'New characters sheet',
      createParty: 'New party sheet',
      partyTab: 'the party',
      charactersTab: 'its characters',
      factionsTab: 'the factions',
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
    land: {
      title: 'Its land models',
      intro:
        "Terrain with memory: for each terrain, how likely a hex next to it is to be each terrain, so land grows coherent (forests stay forests, hills gather into ranges). The Hexmapper's **Generate land** fills empty hexes with one, and discovery may decide empty hexes with one (`discover.terrain: { land: land.default }`).",
      help: "Land models (`kind: land`), listed in its **Overview** (`land:`). An empty hex adds up the rows of its known neighbours' terrains and picks by those weights:\n• two forest neighbours count the forest row twice\n• none known: **Where nothing is known**\nDiscovery uses one by its bindings (`discover.terrain: { land: land.default }`), or a terrain table hands over to one (`set: { land: land.default }` on an entry).",
      none: 'This system names no land models.',
      create: 'New land model',
    },
    modes: {
      title: 'Roll modes of its packs',
      intro:
        'Ways of rolling its tables: advantage, disadvantage, or your own (three rolls keeping the middle one…). Tables offer them with `modes:` and use them by themselves with `modeWhen:`.',
      help: "Roll modes (`kind: roll-modes`) of the packs the system brings, its own first; another pack's (Core's) are read-only here, shared by every system that brings it: make your own in the system's pack to change them. A table uses them:\n• `modes: [roll-modes.advantage, roll-modes.disadvantage]` — offered when rolling by hand\n• `modeWhen: { roll-modes.advantage: { party.stats.explorer: { gte: 1 } } }` — by itself when it holds",
      none: 'The packs of this system declare no roll modes.',
      create: 'New roll modes',
    },
  },
  itemsForm: {
    name: 'Name',
    nameHelp: 'What this catalogue is called.\n• **Gear**\n• **Weapons**',
    items: 'Items',
    itemsHelp:
      "Each item, by an id tables and effects name it with (`items.<id>`): its name and description, its tags, where it fits, what it holds if it's a container, and a number for each field the sheet gives items (empty: the field's default).\n• `torch` — tags `light`, uses `3`\n• `backpack` — holds `6`, holds tags `pack`",
    itemName: 'Name',
    tags: 'Tags',
    tagsHelp:
      'Words conditions read it by, each one a pill:\n• `light` — `acting.items.tags: light`\n• `food`, `climbing`, `weapon`',
    fits: 'Fits',
    fitsHelp:
      "The places it may go, as a condition on the place (its tags, as the sheet's **Places** give them):\n• `place.tags` is `head` — a helm\n• `place.tags` in `hand, back` — a shield\nEmpty: any place.",
    holdsRoom: 'Holds',
    holdsRoomHelp:
      "A container: how much fits inside (measured as the sheet's places are, by **What fills a place**). What's inside goes with it. Empty with no tags: not a container.\n• `6` — a backpack",
    holdsOverHelp:
      "Whether it takes more than it **Holds**, as a place's **Over its room** in **Sheet → Items**: **allow** (crammed, the room shows red) or **refuse** (nothing goes in that hasn't room left). Empty: as the sheet says for its places.\n• `allow` — a sack you can always stuff one more thing into",
    holdsTags: 'Holds as',
    holdsTagsHelp:
      "What it is as a place, so items fit it by these tags as by the sheet's places':\n• `pack` — anything that fits a pack fits inside it",
    noFields:
      'The sheet gives items no fields yet: add them in **Sheet → Items** (slots, weight, uses…), and each item here gets a box for them.',
  },
  placesForm: {
    name: 'Name',
    nameHelp: 'What this catalogue is called.\n• **Places of the marches**',
    places: 'Places',
    placesHelp:
      'Each place, by an id effects name it with (`hex.pois.<id>`): its name and text, its icon, the tags its hex gets and its fields.\n• `ruins` — icon `game:castle-ruins`, tags `ruins`\n• `shrine` — tags `shrine`, read by an action that only works there (`hex.tags: shrine`)',
    placeName: 'Name',
    descriptionHelp:
      'What the point of interest says. Variables and rolls are read from the result that makes it:\n• `{{result}}` — the result’s own text\n• `A camp of {{1d6+2}} travellers`',
    icon: 'Icon',
    iconHelp:
      'An icon of the map’s, by id, to tell it apart in the hex’s points of interest:\n• `game:castle-ruins`\n• `game:totem`\nEmpty: none.',
    tags: 'Tags of the hex',
    tagsHelp:
      'Tags the hex gets when the place is made there, as discovery’s `set: { tags }`: what rules read.\n• `ruins` — `hex.tags: ruins`\n• `danger`, `landmark`',
    fields: 'Fields',
    fieldsHelp:
      'The point of interest’s fields, `key: value` pairs; values may hold variables and rolls, read when it’s made:\n• `skulls: {{1d6+2}}`\n• `god: forgotten`',
  },
  bestiaryForm: {
    name: 'Name',
    nameHelp: 'What this bestiary is called.\n• **Creatures of the marches**',
    sheet: 'Sheet',
    sheetHelp:
      "The sheet every template is made with, unless it names its own (`sheet.beast`). Creatures usually have a lighter sheet than the party's.",
    templateSheetHelp: "This template's own sheet, when it is not the bestiary's.\n• `sheet.beast`",
    sheetBestiary: "the bestiary's",
    behind: 'Left behind',
    behindHelp:
      "What becomes of copies when the party leaves the place they were made: they **stay** there (met again on return) or **leave** (gone; a new one may be rolled at the next visit). It is the system's to decide. Empty: stay.\n• `leave` — a new encounter every visit",
    behindDefault: 'stay (default)',
    templates: 'Templates',
    templateName: 'Name',
    like: 'Variant of',
    values: 'Values',
    conditions: 'Conditions',
    items: 'Items',
    tags: 'Tags',
    names: 'Names',
    noSheet:
      "Its sheet isn't found: choose one above, or give the bestiary a **Sheet**, to edit its values.",
    templatesHelp:
      'Each template, folded to one line; click one to unfold its editor: the sheet it is made with, the values it starts with (a number or a roll, rolled for each copy), its conditions, tags and items, the template it is a variant of, its names and its token. Its id is what tables and effects name it with (`present.<id>`). Templates are edited here only: the Characters app shows them and makes copies.\n• `wolf` — values `health: {{2d4}}`\n• `wolf-leader` — a variant of `wolf`, tags `leader`',
  },
  clocksForm: {
    name: 'Name',
    nameHelp: 'What these clocks are called together.\n• **Threats of the realm**',
    clocks: 'Clocks',
    clocksHelp:
      "Each clock, by an id tables and conditions read it with (`world.clocks.<id>`): its name, its segments, where it starts and what becomes of it once full. What happens when it fills is the world's (**World** tab): **When full** lists those reactions.",
    clockName: 'Name',
    segments: 'Segments',
    segmentsHelp:
      'How many segments it has: any number from 1.\n• `4` — a short threat\n• `12` — a long campaign',
    filled: 'Starts at',
    filledHelp:
      'Segments already filled when the world clock starts (empty: none).\n• `2` — already under way',
    then: 'Then',
    thenHelp:
      'What becomes of it once full:\n• `keep` — it stays full (the default): conditions read it full\n• `reset` — it starts over, empty, and may fill again\n• `remove` — it goes away',
    keepByDefault: 'keep',
    whenFull: 'When full',
    whenFullHelp:
      "What the world does when it fills: the reactions of the system's world rules on `world.clocks.<id>.full` (the **World** tab), in order: words for the timeline, a table rolled, changes to clocks and factions.\n• **Add what happens when it fills** — a new reaction on it, in the World tab\nWhatever fills it (a trip, a table, a faction's turn, a click on the World panel), it happens once as it fills.",
    nothingWhenFull: 'Nothing: it only fills.',
    addWhenFull: 'Add what happens when it fills',
  },
  worldForm: {
    name: 'Name',
    nameHelp: 'What these rules are called.\n• **How the realm moves**',
    reactions: 'Reactions',
    reactionsHelp:
      "What the world does by itself, with or without a trip going on: each reaction comes at its moments (**At**), if its conditions hold, and does its steps in order. Played wherever the world moves (the World panel, the Campaign app, time moving under a trip), and in the order they're listed here when several come at once.\n• after every world turn, a rumour on the timeline\n• when the siege clock fills, the capital falls\n• once a faction's strength reaches 0, it breaks",
    none: 'No reactions yet: the world does nothing by itself but its clocks and factions.',
    reactionName: 'Name',
    on: 'At',
    onHelp:
      'When it comes, each moment a pill (Enter or a comma adds it):\n• `world.turn` — after every world turn, once every faction has taken its turn\n• `world.clocks.<id>.full` — as a progress clock fills, whatever fills it; a clock made by hand is named by its name in lowercase with dashes\nOr **As this turns true**: a condition, coming once as it turns true and again only after it stopped holding.\n• `factions.the-crown.values.strength` at most `0` — the crown falls\n• `world.events` is `market-day` — as a market day begins',
    asTrueHelp:
      "A moment written as a condition: it comes **once, as this turns true**, and again only after it has stopped holding. Looked at after everything that changes the world (time moving on, a turn, a clock, a trip's effects, a change by hand), and at the start of each day when time moves on several days at once. What already holds in a campaign that has never looked doesn't come.\nExamples:\n• `factions.the-crown.values.strength` at most `0`\n• `world.events` is `market-day` — an event's day\n• `world.clocks.the-siege` at least `4`\n• `time.season` is `winter` — as winter begins",
    when: 'Only when',
    whenHelp:
      'It only happens while this holds, seen as its moment comes (empty: always).\n• `factions.the-vale.values.strength` at most `2` — only a weakened Vale',
    unless: 'Not when',
    unlessHelp:
      "It doesn't happen while this holds.\n• `factions.the-crown.conditions` is `at-war`",
    do: 'Steps',
    doHelp:
      'What it does, in order, each step seeing what the ones before changed:\n• **Say** — a line on the timeline; `{{…}}` read the world: `The siege: {{world.clocks.the-siege}}`\n• **Roll** — a table, oracle, generator or deck: what comes up goes to the timeline, its effects apply\n• **Change** — clocks and factions: `world.clocks.the-siege` · `1`, `factions.the-crown.values.strength` · `-1`, `factions.the-rebels.territory` · `1`\n• **Bring** — another reaction (`world.reactions.<id>`) or a world turn (`world.turn`)\n• **Pause** — the world waits for the player to **Go on**, saying this (or nothing): `The bridge stands empty.`\n• **Ask** — the world waits for the player to choose one of a **Question**’s choices; the steps after it read the answer as `params.<id>` (`params.who` is `clans`)\nWhile the world waits nothing moves it (time, turns, a trip); then the rest goes on. A trip that skips pauses skips the world’s too; questions still wait.\nEach may have its own **Only when**. Reactions bringing each other in a loop are refused when the pack loads; ones that conditions make loop stop after 10 in a row, with a line on the timeline.',
    stepKind: 'What it does',
    kinds: { say: 'Say', roll: 'Roll', effects: 'Change', do: 'Bring', pause: 'Pause', ask: 'Ask' },
    pauseEmpty: 'nothing to say: only Go on',
    askNone: 'Add a question above first (Questions).',
    params: 'Questions',
    paramsHelp:
      "What the reaction may ask the player (an **Ask** step), each by an id its steps read the answer with (`params.<id>`): its question (**Name**) and its choices.\n• `who` · **Who takes the bridge?** · `clans`, `vale` — then a step **Only when** `params.who` is `clans`\nA choice's own name (`{ id: clans, name: The Clans }`) is written in YAML.",
    stepWhen: 'Only when',
    stepWhenHelp:
      'This step only, while this holds (empty: always), seen when its turn comes.\n• `factions.iron-clans.conditions` is `at-war`',
    addStep: 'Add a step',
    up: 'Move up',
    down: 'Move down',
    worldTurn: 'A world turn',
    afterTurn: 'After a world turn',
    clockFills: '{clock} fills',
    asTrue: 'As {when}',
    unknownMoment:
      "A moment the world doesn't have: expected world.turn or world.clocks.<id>.full.",
  },
  factionsForm: {
    name: 'Name',
    nameHelp: 'What these factions are called together.\n• **The powers of the realm**',
    sheet: 'Their sheet',
    sheetHelp:
      "The sheet every faction is made with (`kind: sheet`): their values (strength, wealth…), conditions (at war…) and kinds of relation (ally, rival). It can be the characters' or one of their own, edited in the **Sheet** tab.",
    turn: 'Their turn',
    turnHelp:
      "What each faction rolls on a world turn (a table, oracle, generator or deck), with its own values as `faction.*`:\n• `table.faction-turn` — a table of this pack\n• `generator.schemes` — a generator of this pack\n• `core/table.faction-turn` — Core's, for any game: it grows, holds or loses ground",
    every: 'Every (days)',
    everyHelp:
      "Days of the world clock between turns. Empty or 0: only by hand (the Hexmapper's **World turn**).\n• `7` — a turn a week",
    byHand: 'by hand',
    factions: 'Factions',
    factionsHelp:
      'Each faction, by an id tables read it with (`factions.<id>.*`): its name, its colour on the map, its starting values, where it starts and, if it has one, a turn table of its own.\nTheir order counts: a world turn goes faction by faction in this order, each seeing what the ones before did. Drag a card by its handle (⠿) onto another, or ↑ ↓, to change it.',
    factionName: 'Name',
    color: 'Colour',
    colorHelp: 'Its colour on the map, as `#rrggbb`.\n• `#8b1e1e`',
    values: 'Starts with',
    valuesHelp:
      "Starting values of its sheet, one row each (value · what it starts at); the rest are the sheet's defaults.\n• `strength` · `4`\n• `reputation` · `-1`",
    regions: 'Regions',
    regionsHelp:
      "It starts holding every hex of these regions of the map (by name), each one a pill (Enter or a comma adds it): the land it gets when a map brings the factions in. From then on its land is the map's (painted by hand, won and lost on world turns): changing this doesn't move it.\n• `The Hollow Hills`",
    map: 'On the map',
    mapHelp:
      "The example map of this pack (`maps:` in its system) its **Hexes** are on: they're given only there, since the same coordinates are somewhere else on another map. Its regions are given on any map that has them.\n• `maps/frontier.otd.json`",
    hexes: 'Hexes',
    hexesHelp:
      'And these hexes (column,row) of the map chosen in **On the map**, each one a pill (Enter or a space adds it); they need it.\n• `15,9`',
    ownTurn: 'Own turn',
    ownTurnHelp: "A turn table of its own, instead of the factions' one.\n• `clan-turn`",
  },
  reaction: {
    when: 'As this turns true',
    whenHelp:
      "A moment written as a condition: it comes **once, as this turns true**, and again only after it has stopped holding. It's looked at after every change of the trip (a step, an effect, a result, a change by hand), reading what tables see, and what comes is played there and then. What already holds when a trip begins comes on its first step.\nExamples:\n• `party.values.morale` at most `0` — the hirelings leave\n• `party.values.food` at most `0` — the party starts to starve\n• `world.clocks.the-siege` at least `6` — once, as the siege clock reaches 6\nFor a state that should hold all the while (encumbered, weary), give the sheet's condition a **Holds while** instead. Empty: no such moment.",
    each: 'For each member',
    eachHelp:
      'Looked at member by member, reading each one as `acting` (`acting.values.health` at most `0`), and played with that member acting, so its effects on `acting.…` reach them; the journal says who. Each member comes once, as it turns true for them.',
    said: 'As {when}',
    saidEach: 'As {when}, for each member',
  },
  sheet: {
    name: 'Name',
    nameHelp: "The sheet's name, shown where characters are made.\n• **Companion**",
    descriptionHelp:
      'What the sheet is for, shown where characters are made. Basic Markdown.\n• _One of the Company: their skills, their wounds and the rations they carry._',
    values: 'Values',
    valuesHelp:
      "Numbers each character has, with the bounds the system gives them (none: no bound, it may go negative). Tables and conditions read them as `characters.<id>.values.<value>` and `acting.values.<value>`:\n• `wits` — default `2`, min `0`, max `5`\n• `health` — max `'{{self.values.maxHealth}}'`: another value is its bound\n• `stress` — max `9`, shown as **boxes**",
    valueName: 'Name',
    default: 'Starts at',
    defaultHelp: 'What a new character has (empty: 0).\n• `2`',
    min: 'Min',
    max: 'Max',
    boundHelp:
      "Effects never take it past this. A number, or the sheet's other values in braces, with arithmetic as in **Made of**:\n• `0`\n• `'{{self.values.maxHealth}}'` — as high as the character's maxHealth\n• `'{{self.values.might * 2}}'` — twice Might\nOn a value **Made of** items it caps what's shown, not what's carried (a load of 12 shows 8): to see a load against a limit, use **Shown against**; to stop more going in, a place's room with **Over its room** `refuse`.\nEmpty: no bound.",
    from: 'Made of',
    fromHelp:
      "A value worked out from the sheet's other values, never set by hand nor by effects: it follows them at once (after every change, within its own min and max). Write the values in braces, with `+ - * /`, brackets and `floor`, `ceil`, `round`, `min`, `max`, `abs`; a minus between names takes spaces (ids may hold a hyphen):\n• `'{{self.values.might * 2 + 4}}'` — twice Might, plus 4\n• `'{{self.values.maxHealth - self.values.health}}'` — the wounds taken\n• `'{{floor(self.values.wits / 2)}}'` — half Wits, rounded down\nOr made of the items, as a map (`{ … }`): `sum`, `max` or `min` of a field, or `count: items`, among those its `where` lets in (it reads `item.*` and `place.*`):\n• `{ sum: items.slots }` — the load: every item's slots\n• `{ max: items.armour, where: { place.tags: worn } }` — the best armour worn\n• `{ count: items, where: { item.tags: light } }` — how many lights\nA **Max** caps it without stopping anything being carried: for a limit, see **Shown against** and **Over its room**.\nNo dice (it would change each time it's read). Empty: a value set by hand and by effects.",
    display: 'Shown as',
    displayHelp:
      'How the value is drawn wherever a character is shown (empty: a number box). All but **number** and **levels** need a max:\n• `number` — a number box\n• `of` — the number and its max (or its **Shown against**): **3 / 5**\n• `bar` — a bar filled up to its max (or its **Shown against**)\n• `boxes` — boxes to tick, as many as its max (stress, xp, a vow)\n• `pips` — round dots, as many as its max (a rating from 1 to 5)\n• `dial` — a round clock of as many segments as its max\n• `levels` — the name of one of its **Levels**: the first is its min (or 0), the next one more…',
    levels: 'Levels',
    levelsHelp:
      'With **Shown as** `levels`, the names the value picks, each one a pill (Enter or a comma adds it), from its min (or 0) up; beyond them the number is shown. Translate their names in the translation file, by id:\n• `unhurt, bruised, wounded, dying` — 0 is **unhurt**, 3 is **dying**\n• `d4, d6, d8, d10, d12` — a die size that grows with the value\n• with min `-3`: `hated, wary, neutral, …` — −3 is **hated**',
    tones: 'Tones',
    tonesHelp:
      "The colour it takes from a value up, `value: tone`, among the theme's `good`, `warning`, `danger` and `accent`:\n• `0: danger, 2: warning, 4: good` — red at 0 and 1, amber at 2 and 3, green from 4\n• `5: danger` — red only from 5 up\n• `0: danger, 50%: warning, 75%: good` — shares of its max, following it when it changes: with max 3, red at 0 and 1, amber at 2, green at 3 (with a **Shown against**, shares of it)\n• `0: good, '{{self.values.capacity}}': danger` — red from the capacity up: a threshold may be the sheet's other values in braces\nEmpty: the theme's accent.",
    of: 'Shown against',
    ofHelp:
      "With **Shown as** `of` or `bar`, what the value is drawn against when that isn't its max: never a bound, it may go past it (a load against a capacity); shares in **Tones** are shares of it. A number, or the sheet's other values in braces:\n• `'{{self.values.capacity}}'` — **28 / 8**, a full bar\n• `10`\nEmpty: its max.",
    relationDisplayHelp:
      "How a relation's number is drawn, as a value's **Shown as** (it needs a max, except **number**):\n• `pips` — a bond from 0 to 3 as dots\n• `bar`",
    preview: 'Preview',
    previewHelp:
      'A character made with this sheet as it is now, drawn as everywhere characters are shown. Try it: what you change here is kept nowhere.',
    previewName: 'Example',
    group: 'Group',
    groupHelp: 'The card it is shown in, under the group’s name.\n• `attributes`\n• `meters`',
    groups: 'Groups',
    groupsHelp:
      'The headings values are shown under, in this order, with a name in each language. A value says its group in its **Group** column.\n• `skills` — **Skills**\n• `body` — **Body**',
    groupName: 'Name',
    conditions: 'Conditions',
    conditionsHelp:
      'States a character has or not (wounded, hungry, a trauma). Each may block things for the whole party while someone has it. Effects set and clear them, or one holds by itself while its **Holds while** does; conditions read them:\n• `acting.conditions.wounded: true` — the acting character is wounded\n• `characters.mara.conditions: wounded` — whether Mara is\n• `unless: { conditions: wounded }` in a party stat — counts only the unwounded',
    conditionName: 'Name',
    blocks: 'Blocks',
    blocksHelp:
      "What the party can't do while any member has it, each one a pill (Enter or a comma adds it):\n• `travel.move` — no moving on\n• `actions.forced-march` — an action of the system\n• `modes.horse` — a way of travelling\nThe trip says who has it.",
    holdsWhen: 'Holds while',
    holdsWhenHelp:
      "A condition that holds by itself while this is true, never set or cleared by hand nor by effects: a state, not something that happens. It reads the character as `self` and, on a trip, the world too:\n• `self.values.dread: { gte: 6 }` — while dread is full\n• `self.values.load: { gt: '{{self.values.capacity}}' }` — while carrying more than it can\n• `trip.mode: boat` — while the party travels by boat\n• `time.season: winter` and `self.values.health: { lt: 2 }` — hurt in winter\nOne that reads the world follows it on the trip; in the roster it stays as last seen. Something that should happen once (a line, an effect) is an action, not a condition. Empty: effects set and clear it.",
    byEffects: 'set by effects',
    relations: 'Kinds of relation',
    relationsHelp:
      "Relations a character may hold to anything with a reference (another character, a place, a faction, a note), like Ironsworn's bonds. A kind with bounds carries a number:\n• `bond` — min `0`, max `10`\n• `home` — no number",
    items: 'Items',
    itemsHelp:
      "What items have in this system and where they go; the items themselves are in the **Items** tab's catalogues, or written by hand on a character. Nothing here is required: a sheet without it still lets characters carry items by name and count.",
    itemFields: 'Fields of every item',
    itemFieldsHelp:
      "The numbers every item has in this system, with their bounds and how they're shown, as values are. Tables read them as `characters.<id>.items.<item>.<field>`, and a value **Made of** `{ sum: items.<field> }` adds them up:\n• `slots` — default `1`, min `0`\n• `weight` — min `0`\n• `uses` — min `0`, max `3`, shown as **pips**, **Runs out**",
    spent: 'Runs out',
    spentHelp:
      'Reaching its min uses one of the item up: its count goes down and the next one starts again at its number (a torch of 3 uses, three torches). The last one is gone. Off: the item stays, empty (a lantern without oil).',
    places: 'Places',
    placesHelp:
      "Where items may be (hands, belt, pack, a horse's saddlebags…), each with tags items fit by (an item's **Fits**) and how much room (a number, or the sheet's values: `'{{self.values.might}}'`). Any body: a three-headed beast declares three places tagged `head`. Empty: items are one list.\n• `hands` — tags `hand`, room `2`\n• `pack` — tags `pack`, room `'{{self.values.capacity}}'`",
    placeName: 'Name',
    placeTags: 'Tags',
    room: 'Room',
    size: 'What fills a place',
    sizeHelp:
      'The field that says how much room an item takes (times how many there are). Empty: each item takes one.\n• `slots`',
    sizeCount: 'one each',
    share: 'Shared out',
    shareHelp:
      "How what the party spends or gains of an item (`party.items.ration: -3`, `party.items.ration: 2`) is shared out among the characters of this sheet: the party's own items go first, then theirs.\n• **even** (the default): taken from whoever has most, given to whoever has least, one at a time\n• **in order**: the first character gives (or takes) all it can, then the next\nWithout characters, the party's own sheet keeps them.",
    shareEven: 'even (default)',
    over: 'Over its room',
    overHelp:
      "Whether a place with a **Room** takes more than fits in it:\n• **allow** (the default): its room is only shown, and goes red when it's over; a condition says what being over means (`self.values.load: { gt: '{{self.values.capacity}}' }`)\n• **refuse**: nothing goes in that hasn't room left. Characters' cards offer no full place, a move there is refused, and what an effect gives goes where there's room; with none, **When it doesn't fit** says what becomes of it\nOn the sheet it's every place's, and the **Room in all**'s; a place may say otherwise in its own column (a pack that holds more, worn hands that don't). A room that shrinks later leaves what's there.",
    overAllow: 'allow (default)',
    roomAll: 'Room in all',
    roomAllHelp:
      "How much a character carries in all, besides the room of each place, measured by **What fills a place** over everything it has (inside containers and in no place too). A number, or the sheet's values in braces. With **Over its room** `refuse`, nothing more goes in past it (each place may still allow more of its own). Tables read it as `self.carried.room`, and what's carried as `self.carried.used`.\n• `'{{self.values.capacity}}'` — no more than the capacity\n• `'{{self.values.capacity * 2}}'` — slowed past the capacity (a condition), stopped at twice it\n• `10`\nEmpty: no room in all; only the places' count.",
    roomAllNone: 'none',
    fullLeave: 'leave (default)',
    full: "When it doesn't fit",
    fullHelp:
      "What becomes of an item an effect gives (a table's find, a share of what the party gains) when there's no room left for it, where a place or the **Room in all** refuses more. As many as fit go in; the rest:\n• **leave** (the default): is left behind, said in the journal\n• **ask**: waits on the character's card, in no place, and the trip waits for the player to make room (drop something, or move it to a place)\nA character's card never adds by hand what has no room.",
    overSheet: "the sheet's",
    start: 'Starts with',
    startHelp:
      "What a new character of this sheet carries, from the system's catalogues (the **Items** tab), one row each: the item and how many. On the party's own sheet, what every new trip starts with (the stores of a party without characters).\n• `ration` · `2` — two rations each\n• `torch` · `1`",
    startItem: 'Item',
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
      'Words a system may read while it lasts (`time.tags`), each one a pill (Enter or a comma adds it); they mean only what your rules make of them.\n• `dark` — `when: { time.tags: dark }`\n• `meal, rest`',
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
  land: {
    name: 'Name',
    nameHelp: "The model's name.\n• **The lie of the land**\n• **Northern wilds**",
    from: 'The hex it’s seen from counts',
    fromHelp:
      'In discovery, how many times the hex the party stands on counts among the neighbours of the hex being decided (empty: once, as any other). Generating land has no such hex.\n• `2` — the land you come from counts twice: a trip into the unknown follows its own land\n• `0` — only the other neighbours count',
    rows: 'Next to each terrain',
    rowsHelp:
      'For each terrain (rows), how likely a hex next to it is to be each terrain (columns): weights, not percentages; empty is 0. An empty hex adds up the rows of all its known neighbours.\n• **Forest** row: `forest 6`, `hills 2`, `plains 2` — forests tend to go on as forest\n• **Hills** row: `hills 4`, `mountains 2` — hills gather into ranges\nA terrain with no row adds nothing; a column with no row is never a neighbour that pulls.',
    fromTo: 'Next to ↓ / becomes →',
    start: 'Where nothing is known',
    startHelp:
      'The weights of a hex with no known neighbour the model has a row for: the first hex of a blank map, a hex in the middle of nowhere.\n• `plains 3`, `forest 2` — mostly open land',
    shares: 'Over many hexes',
    sharesHelp:
      'How much of each terrain a large patch grown from nothing with these weights has: a check that the land feels right.',
    newTerrain: 'Terrain',
    addTerrain: 'Add a terrain',
    preview: 'A patch of this land',
    previewHelp:
      "Land grown from nothing with this model, from the middle outwards, in the Hexmapper's terrain colours. **Another** draws another patch; the Hexmapper's **Generate land** grows it from the land you painted instead.",
    again: 'Another',
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
      'Values of the day this weather sets, one row each (value · what it is). They last the day when the rules declare them (Rules → Values of the day):\n• `climbModifier` · `-1`\n• `snowed-in` · `true`',
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
      'How a trip goes: the day, speeds, actions, checks (`travel: default`). **Open** edits them in the Rules tab; **Create** starts new ones from the Generic rules.\n• none — the Generic rules',
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
    land: 'Land models',
    landHelp:
      "The land models (`kind: land`) the Hexmapper's **Generate land** fills empty hexes with, and discovery may use: this pack's and its dependencies'.\n• `land: [land.default]`\n• `land: [land.hills, core/land.default]`",
    noLand: 'No land models in this pack or its dependencies.',
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
    yes: 'yes',
    no: 'no',
    search: 'Search…',
    /** Beside a button with help: its explanation, without pressing it. */
    whatItDoes: 'What it does',
    description: 'Description (its help)',
    descriptionHelp:
      "What it is and what it's for, in a sentence or two: players read it as its help where they meet it (the trip panel, a character's or a faction's card, the World panel), before what the apps add (how tables read it, its bounds…). Basic Markdown. Written in the current language: the pack's own, or its translation file.\n• _Lost to fords, ambushes and the cold; a fed night in camp gives one back._",
    confirmRemove: 'Remove “{name}”? The forms can’t undo it (edit the YAML to bring it back).',
    id: 'Id',
    add: 'Add',
    remove: 'Remove',
    removeItem: 'Remove {name}',
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
      "What the party does when **it can't march and the time moves on by itself**: the world clock moving with a trip on, a travel order with nothing left to march, **Wait to go on**. From this moment (a clock or a part of the day) until the day ends, a party that isn't marching takes the action, once a day.\n• **from** `20:00`, **action** `camp`\n• **from** `time.part.night`, **action** `watch`\nWhen the action **can't be taken** (its **Only when** / **Not when**, or a value that blocks it), the journal says why and the time passes without it until the party can march.\n• camp with **Only when** `party.values.food: { gte: 1 }` — a hungry party sleeps in the open\nNo action: the party just waits.",
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
      'Ways of travelling: on foot, on horseback, by boat… Each has a speed in **km per marching day** on easy ground (terrains and roads change it), and can be limited to some places and moments.\n• `foot` — 24 km a day\n• `horse` — 40 km a day, **Not when** `trip.weather: snow`\n• `boat` — 50 km a day, **Only through** `hex.water: true`\nThe trip panel lets the player switch between them.\nTheir order counts: the first is a new trip’s way. Drag a card by its handle (⠿) onto another, or ↑ ↓, to change it.',
    kmPerDay: 'km per day',
    name: 'Name',
    nameHelp:
      "What players read in the trip panel and the journal instead of the id:\n• `horse` → _On horseback_\n• `food` → _Rations_\nWritten in the current language: the pack's own, or its translation file (`locales/<language>/`) when the interface is in another one. Empty: the id (or the app's name for the usual ones: foot, horse, food…).",
    allowedTerrains: 'Only through',
    allowedTerrainsHelp:
      "Where this way of travelling can go: a condition on **each hex it enters** (its terrain, water, tags, region, fields, the roads or rivers of the step).\n• a boat: `hex.water: true`\n• a boat that also follows the coast: `any: [{ hex.water: true }, { hex.terrain: coast }]`\n• a cart only by road: `trip.edges: road`\n• a mount that avoids forests: `not: { hex.terrain: [forest, dense-forest] }`\nWhere it holds, even closed terrains are open to it; where it doesn't, it can't go, whatever the terrain says (see **Passable** in Terrains). Empty: wherever terrains allow.",
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
      "Whether a hex of this terrain can be entered. How it meets the rest:\n• A way of travelling with **Only through** (Ways of travelling) goes by that alone: where its condition holds it enters, open or closed (a boat on a lake); where it doesn't, it can't\n• Any other way: **Unticked**, nobody enters (routes go around); **Ticked**, it enters while **Open when** holds (empty: always) and **Closed when** doesn't (empty: never)\nFor example:\n• **Open when** `time.season: winter` — a lake crossed on the ice\n• **Closed when** `trip.weather: [snow, storm]` — a pass shut by the weather",
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
    weather: vocabulary.en.terms.weather,
    weatherHelp:
      "How each weather slows the party. Tables set it with `set: { weather: … }` (usually rolled at dawn), or a weather model with inertia.\n• `storm` × `0` — no travel that day\n• `heavy-rain` × `0.5` — half speed\n• `fog` × `0.75`\nWeather not listed doesn't change the speed; conditions can still read it (`trip.weather: storm`).",
    weatherState: vocabulary.en.terms.weather,
    speed: 'Speed ×',
    speedHelp:
      'How fast the party marches in this weather:\n• `0` — no travel that day (the day is lost)\n• `0.5` — half speed\n• `1` — as usual',
    actions: 'Actions',
    actionsHelp:
      "What the party can do: **march**, **camp**, **rest** and the system's own (forage, pray, talk to the porters…), each a button in the trip panel, or taken by the system itself (**By itself at**). Nothing is built in: marching is an action like the rest.\nEach one says when it can be taken (**Only when** / **Not when**, **Once a day**) and what it does, **step by step**:\n• march: `travel.move: '{{params.until}}'`, with a parameter `until` (to the destination or one hex)\n• rest: `time: 120`, then `effects: { party.stats.fatigue: -1 }`\n• forage: `time: 180`, `travel.speed: 0.5`, its check at `forage`\n• eat, by itself at `time.day-end`: `effects: { party.values.food: -1 }`\nTheir order counts: it's the order of the trip panel's buttons, and the order the system takes those of one moment by itself. Drag a card by its handle (⠿) onto another, or ↑ ↓, to change it.",
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
    search: 'Search the actions (name, id, moment, step…)',
    stepCount: 'Steps: {count}',
    when: 'Only when',
    unless: 'Not when',
    whenHelp:
      "When the action can be taken (**Only when**) or not (**Not when**), with conditions like the tables':\n• `trip.weather: storm` — today's weather\n• `hex.terrain: [forest, hills]` — the hex the party is in\n• `hex.tags: shrine` — a tag of that hex\n• `party.stats.fatigue: { lt: 2 }` — the party\n• `party.values.food: { gte: 1 }` — food left\n• `mutinous: true` — a value of the day\n• `time.moons.silver: full` — the calendar\n• `time.hour: { gte: 6, lt: 20 }` — only by day, from 06:00 to 20:00; `time.part: night`, `time.tags: dark` — a part of the calendar's day, or its tags\n• `trip.visits: 1` — the first time here; `around.terrain: lake` — next to a lake\n• `trip.doneToday: forage` — after foraging today; `trip.marched: { gte: 6 }` — after 6 hours of marching\n• `trip.km: { gte: 100 }`, `trip.taken.camp: { gte: 7 }`, `trip.spent.party.values.food: { gte: 10 }` — what the trip has done so far\n• `party.stats.fatigue: { lt: '{{party.stats.endurance}}' }` — a variable: compared with another value (quoted)\n• `party.stats.wits: { gte: '{{1d20}}' }` — a roll: the same all the moment long\nEach value by its **full name**, which says where it comes from (`hex.*`, `time.*`, `trip.*`, `system.*`, `world.*`, `party.*`): never hidden by a stat with the same name\nOtherwise its button stays disabled and says why (or hides, with **Hidden when it can't be taken**); the halt's action that can't be taken lets the time pass without it.",
    params: 'Parameters',
    paramsHelp:
      "What the player chooses when taking it (beside its button, a choice for each), and what a `do:` step or **Goes on by itself with** gives it. Each parameter has its **choices** (the first is its default, unless `default` says another); its steps and conditions read the one chosen as `{{params.<id>}}`.\n• `until: { choices: [destination, hex, 3] }` — how far a march goes: with the step `travel.move: '{{params.until}}'`\n• `pace: { choices: [steady, quick], default: steady }` — with **Only when** `params.pace: quick` on a step\nA choice may have a name to show: `{ id: 3, name: Three hexes }` (translated in the pack's locales). Empty: no choices, just the button.\nEach parameter is a row: its id, its **Name**, its **Choices** as pills (drag one onto another to change their order: the first is the default) and its **Default** when it isn’t the first. **YAML** writes them all at once, for a choice’s name.",
    noParams: 'none: just the button',
    paramName: 'Name',
    paramChoices: 'Choices',
    paramDefault: 'Default',
    paramFirst: 'the first',
    paramNeedsChoice: 'A parameter needs at least one choice.',
    addParam: 'Add a parameter',
    paramsRows: 'Rows',
    hide: "Hidden when it can't be taken",
    hideHelp:
      "**Unticked**: its button is always there, disabled (saying why) while it can't be taken, so the buttons don't move around.\n**Ticked**: its button only appears while it can be taken. For actions that only make sense now and then:\n• a rite only at a shrine under a full moon\n• talking round porters only while they refuse to march",
    nothing: 'When nothing applies',
    nothingHelp:
      'What the journal says when **none of its checks apply** where the party is; `{terrain}` is the hex\'s terrain.\n• `nothing to forage on {terrain}` → "nothing to forage on Hills"\nEmpty: a generic sentence. An action without checks says nothing more.',
    nothingPlaceholder: 'nothing to find on {terrain}',
    steps: 'What it does',
    stepsHelp:
      "What the action does, **one step per card, in order**: choose what each one does in its first box, then fill in its fields (each explains itself). Click a card's title to fold or open it; folded, it reads in words (_Pass 3 h_, _Take March (until: hex)_). Drag one by its handle (⠿) onto another to move it there, or use ↑ and ↓.\n**Only when** / **Not when** on a step: it only happens when they hold, built as rows (what it reads · comparison · value). Besides what the action's own conditions see, they see:\n• `params.how` — the action's parameters\n• `trip.below` is `food` — food hit its minimum during the action (`trip.above`: a maximum)\n• `trip.moment` is `trip.hex-enter` — when the system took it\n• `trip.doing` — the action under way\n**Edit as YAML** on a card shows the step as the pack writes it (`time: 180`, `do: actions.march, with: { until: hex }`), for what the form doesn't cover; nothing written there is lost by the form. A step may have an `id` there (`id: song`), which its translations name.\nThe actions that follow this one, and its checks (Checks → **When**: this action), come first.",
    on: 'By itself at',
    onHelp:
      "**Empty**: the player takes it, with a button.\nOtherwise the **moments the system takes it by itself**, if its conditions hold; it isn't a button then, and it comes before that moment's checks:\n• a clock, e.g. `06:00` — as it strikes\n• a part of the calendar's day, e.g. `time.part.morning` — as it begins\n• `trip.hex-enter` — entering each hex\n• `time.day-end` — as each day ends, camping or not\n• an action, e.g. `actions.camp` — right after that action starts\n• an action's end, e.g. `actions.forage.done` — once its steps are done\n• a check, e.g. `checks.WEATHER` — right after it's resolved (after **Continue**, if it paused), before the next checks of its moment, which see what this action changed: today's weather just rolled, for instance\n• a progress clock filling, e.g. `world.clocks.the-threat.full` — once the step that filled it is done, or at once when it fills by hand or in another app (on the trip's next step there); one made by hand is named by its name in lowercase with dashes\n• `world.turn` — after a world turn of the campaign (its factions' turns), whatever brought it: time moving on, a hand on the World panel, or a step `do: world.turn`; on the trip's next step\nSeveral, each one a pill (Enter or a comma adds it): `06:00` and `trip.hex-enter`. Its conditions see which one it is as `trip.moment` (`when: { trip.moment: trip.hex-enter }`).\nExamples:\n• eating as each day ends: `time.day-end`\n• porters grumbling in the morning after a hungry day: `time.part.morning` (or `06:00`) with **Only when** `yesterday.hungry: true`",
    onButton: 'nothing: a button for the player',
    onAfter: 'After: {action}',
    step: 'Step',
    badStep:
      "A step does one thing: time: 60, travel.move: destination, travel.speed: 0.5, travel.advance: 1, travel.mode: modes.<way>, effects: { … }, set: { … }, do: <action> (and its with: { … }), roll: checks.<check>, say: <text>, pause: true, ask: <parameter> or wait: { … } with limit: '18:00'.",
    up: 'Move up',
    down: 'Move down',
    reading: {
      button: 'With its button',
      byItself: 'By itself ({moments})',
      oncePerDay: 'once a day',
      choosing: 'choosing {params}',
      grouped: 'a condition with groups (see its field below)',
      more: '…and {count} more',
    },
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
      do: 'Take another action, or a world turn',
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
        "What changes, one row each: a number adds or takes away.\n• `party.stats.fatigue` · `1` — adds 1\n• `party.values.food` · `-1` — takes 1 away\n• `party.stats.fatigue` · `=0` — sets it\n• `party.items.ration` · `-{{party.stats.mouths}}` — as many as another value\n• `party.members.values.health` · `1`, `acting.conditions.wounded` · `false` — its characters\nA change past a value's **Min** or **Max** stops there, and later steps see `trip.below` / `trip.above`.",
      set: 'Values of the day the system declares (**Rules → Values of the day**), one row each; they last until the day ends.\n• `lost` · `true`\n• `ferry` · `true` — what a **Wait for something** step may wait for',
      do: 'Another action of the system, taken now if its conditions hold (otherwise nothing happens). **With** gives its parameters; empty, each takes its default.\n• **March**, with **until** `hex` — one hex of marching\n• a forced march: **Change speed** `1.5`, then **Take another action** March\nOr **A world turn** (`do: world.turn`): in a campaign, its factions take their turn now and the world reacts, as with a turn due as time moves on; the journal says what they did. Without a campaign whose system declares factions, nothing happens, and the journal says so.\n• news carried to a fort: **Say** `The garrison hears of the raids.`, then **A world turn**',
      roll: 'What is rolled now; the steps after it wait for its result and see it (`today.<value>` it sets), and for **Continue** if it pauses:\n• a check of the system (**Checks**), whatever its **When**\n• a table, oracle, generator or deck of the system’s packs, e.g. `table.ruins`: no check around it, its result in the journal by its name, its values and changes reach the trip, and an entry with a pause stops it',
      say: "A line of the system's own in the journal. Values in it are read then:\n• `The porters sing as they walk.`\n• `Across, with {{party.values.food}} food left.`",
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
    },
    noChoice: '— choose —',
    noParams: 'This action has no parameters to ask: declare one in **Parameters** first.',
    open: 'Show this step',
    close: 'Fold this step',
    drag: 'Drag to move this step',
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
      cleared: '{name} (no more)',
      set: 'Set: {values}',
      do: 'Take {action}',
      doWith: 'Take {action} ({with})',
      doWorldTurn: 'Bring a world turn',
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
    search: 'Search the checks (name, event, moment, table…)',
    paused: 'pauses',
    title: 'Checks',
    help: 'What is rolled on the way, when, and on which table. A check without a table is only written in the journal (with its **Changes**); only **Pause after it** stops the trip.\nTheir order counts: the checks of one moment come one by one in this order, each seeing what the ones before set (the weather first, then what reads it). Drag a card by its handle (⠿) onto another, or ↑ ↓, to change it.',
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
    atDone: 'When {action} is done',
    atCheck: 'After the check {check}',
    atHelp:
      "When it is rolled:\n• a clock, e.g. `06:00` — as it strikes, marching, waiting or asleep\n• a part of the calendar's day, e.g. `time.part.morning` — as it begins\n• `trip.hex-enter` — entering each hex\n• `time.day-end` — as each day ends (after the system's day-end actions)\n• an action, e.g. `actions.camp` or `actions.forage` — when the party takes it, before its steps (they wait for it)\n• an action's end, e.g. `actions.forage.done` — once its steps are done (after three hours foraging, say)\n• another check, e.g. `checks.WEATHER` — right after it's resolved\n• a progress clock filling, e.g. `world.clocks.the-threat.full` — whatever fills it: the trip, a faction's turn, or a hand on the World panel; one made by hand is named by its name in lowercase with dashes\n• `world.turn` — after a world turn of the campaign (its factions' turns), whatever brought it, on the trip's next step\nSeveral, each one a pill (Enter or a comma adds it): `trip.hex-enter` and `actions.rest`. Its conditions and its table see which one it is as `trip.moment` (`when: { trip.moment: actions.rest }`).\nEmpty: only when an action's step rolls it (`roll: checks.<its event>`).",
    atAction: 'Action: {action}',
    when: 'Only if',
    unless: 'Skip if',
    conditionHelp:
      "When the check is rolled (**Only if**) or skipped (**Skip if**), with conditions like the tables', one row each (what it reads · comparison · value), or as YAML:\n• `hex.terrain: forest` — the hex\n• `hex.tags: landmark` — a tag of the hex\n• `trip.edges: [road, river]` — the road or river of the step\n• `hex.danger: { gte: 2 }` — a value of the hex or its region\n• `time.season: winter`, `trip.weather: storm` — the moment\n• `time.hour: { gte: 20 }` — from 20:00; `time.watch: 3` — the third watch\n• `time.meal: elevenses`, `time.tags: dark` — a part of the calendar's day, or its tags\n• `from.terrain: forest` — coming out of a forest; `trip.visits: { gte: 2 }` — back again\n• `world.clocks.the-flood: { gte: 4 }` — a clock of the world clock; `world.events: market-day` — today’s event\n• `danger: { gt: '{{party.stats.stealth}}' }` — a variable: compared with another value\n• `party.stats.wits: { gte: '{{1d20}}' }` — a roll under a stat\nEach value by its **full name**, which says where it comes from (`hex.*`, `time.*`, `trip.*`, `system.*`, `world.*`, `party.*`): never hidden by a stat with the same name\n• `party.values.food: { lt: 1 }` — the party\n• `acting.values.survival: { gte: 2 }`, `characters.kael.conditions: wounded`, `party.members: kael` — its characters, when the system has a sheet\n• `trip.below: party.values.food` — the party's food hit its minimum today (at `time.day-end`)\n• `trip.moment: actions.rest` — which of its moments it is (when it has several)\n• `any: [{ hex.terrain: forest }, { danger: { gte: 3 } }]` — either\nRead just before the check is rolled: the checks of one moment come one by one, in the list's order, each seeing what the ones before it set (at dawn, after the weather's, `trip.weather: storm` is today's)",
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
      'What the check itself changes when it comes up, with or without a table, one row each (what changes · value): a number adds or takes away.\n• `party.stats.fatigue` · `1` — adds 1\n• `party.values.food` · `-1` — takes 1 away\n• `party.stats.fatigue` · `=0` — sets it\n• `party.items.ration` · `-{{party.stats.mouths}}` — as many as another value says (a variable)\n• `party.members.values.health` · `-1`, `acting.conditions.wounded` · `true` — its characters (every one, whoever acts)\nHow a system writes its rules as data, e.g. a day without enough food: **When** `time.day-end`, **Only if** `trip.below: party.values.food`, **Changes** `party.stats.fatigue: 1`.',
    pause: 'Pause after it',
    pauseHelp:
      'The trip **stops** when this check comes up (after rolling it, if something resolves it) and waits until you press **Continue**: time to describe the place, write lore or decide something. The only way a check stops the trip: without it, a check with no table is just written in the journal.\n• a shrine found on the way, rolled on its table\n• a landmark to describe, with no table\nA table entry can also pause, only when it comes up (`pause: true` on the entry).',
    context: 'Extra context',
    contextKey: 'What the table sees',
    contextHelp:
      'Values the table sees **only for this check**, one row each (what the table sees · value):\n• `timeOfDay` · `night` — a night encounter rolled on the day table\n• `danger` · `3` — as if the hex were more dangerous',
    none: 'No checks: trips only pass time and do what their actions do.',
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
      "Jobs the party's characters take for the journey (lead the way, keep watch, forage…), Forbidden Lands-style: in a trip, each role is given to one character, and the system's checks, tables and actions read the holder and change them:\n• `roles.guide.values.pathfinding: { gte: 2 }` — the guide is good enough\n• `modeWhen: { roll-modes.advantage: { roles.lookout.values.stealth: { gte: 2 } } }` — a table rolled with advantage\n• `roles.lookout.values.health: -1` — an effect on the lookout\nNeeds a sheet.",
    roleName: 'Name',
  },
  edit: {
    readOnly: 'This system comes bundled and is read-only.',
    editedCopy:
      'Your edited copy of a bundled system: it replaces the bundled one in this browser.',
    updatedTip:
      'The bundled version of this system changed since you made your copy: open it to take or keep each change.',
    confirmRevert:
      'Discard your changes to this system and go back to the bundled version? (↶ undoes it.)',
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
    help: "Where this is used in the system's packs: the travel rules' actions and checks, the bindings, the sheets, the clocks and factions, and the tables, oracles, generators and decks. Each place says whether it **reads** it (a condition, a `{{…}}`), **changes** it (effects), **sets** it (`set`), **is made of** it (a stat's `from`) or **names** it (`do: actions.march`, `blocks: [modes.horse]`, `roll: table.ruins`, a table entry's next table).\n• The number is how many places use it; press it to see them below the row, each with a link to where it's edited (tables open in the Oracle).\n• **–** means nothing uses it yet: often fine (a value the player reads), sometimes a mistake (a stat no table reads, a name written differently).\nWhat the map gives (a hex's own values) and what the engines read by themselves aren't listed.",
    count: 'Used in {n} places',
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

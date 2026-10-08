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
  tabs: { rules: 'Rules', checks: 'Checks', yaml: 'YAML' },
  forms: {
    confirmRemove: 'Remove “{name}”? The forms can’t undo it (edit the YAML to bring it back).',
    id: 'Id',
    add: 'Add',
    remove: 'Remove',
    idExists: 'There is already one called "{id}".',
    badFlow: 'Write it as key: value pairs, e.g. tags: landmark or terrain: [forest, hills].',
    problems: 'This file has {count} problems: open the YAML to see them.',
  },
  rules: {
    water: 'Water hexes',
    waterHelp:
      'Hexes whose terrain the map marks as **water** (Hexmapper: Edit palette → Water) and that have no rule of their own in Terrains.\nUsually **not passable** on foot; a way of travelling whose **Only through** holds on water can still sail them:\n• a boat: `water: true`\n• a boat that also hugs the shore: `any: [{ water: true }, { terrain: coast }]`\nA terrain listed in Terrains (a frozen `lake` with **Open when** `season: winter`) uses its own rule instead.',
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
      'How fast this terrain is crossed, compared with easy ground:\n• `1` — normal speed\n• `0.5` — half as fast (forest, hills)\n• `0.25` — a quarter (mountains)\n• `2` — twice as fast\nWith 24 km a day and 12 km hexes, a forest hex (`0.5`) takes a whole marching day.',
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
      "Speed along this line, replacing the terrain's:\n• `1.5` — half again as fast as open ground\n• `1` — open-ground speed, whatever the terrain\nA road through a forest (`0.5`) with `1.5` is three times as fast as the forest.",
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
      "What the party can do besides marching: **camp**, **rest** and the system's own (forage, pray, talk to the hirelings…), each a button in the trip panel, or taken by the system itself (**By itself at**).\nEach one says when it can be taken (**Only when** / **Not when**, **Once a day**) and what it does, **step by step**:\n• rest: `time: 120`, then `effects: { party.stats.fatigue: -1 }`\n• forage: `time: 180`, `speed: 0.5`, its check at `forage`\n• eat, by itself at `day-end`: `effects: { party.resources.food: -1 }`",
    oncePerDay: 'Once a day',
    modeWhenHelp:
      "When it can be chosen (**Only when**) or not (**Not when**), as a condition on where the party is and the moment.\n• a boat only at the water's edge: `any: [{ water: true }, { tags: ferry }]`\n• no horses in the snow: **Not when** `weather: snow`\n• a cart only in summer: **Only when** `season: summer`\nEmpty: always. A value of the day can block it too (**Blocks** `mode.<id>`).",
    values: 'Values of the day',
    valuesHelp:
      "Values this system's tables and actions can set **for the rest of the day**, with what they block while they hold. Tables read them the next day as `yesterday.<id>`.\n• `lost` — set by `set: { lost: true }`, blocks `travel`\n• `snowbound` — blocks `mode.horse`\n• `refusing` — blocks `travel` until an action clears it (`set: { refusing: false }`)\nWithout any, the older built-in `lost` (blocks travel) still works.",
    blocks: 'Blocks',
    blocksHelp:
      "What can't be done while the value holds:\n• `travel` — no more marching today\n• an action's id, e.g. `camp` or `forage` — its button turns off\n• `mode.<id>`, e.g. `mode.horse` — that way of travelling: it can't be chosen, and a party already travelling so stops until it changes\nThe box suggests what this system declares. Blocked buttons stay visible, disabled, saying why.",
    blocksNothing: 'nothing',
  },
  actions: {
    when: 'Only when',
    unless: 'Not when',
    whenHelp:
      "When the action can be taken (**Only when**) or not (**Not when**), with conditions like the tables':\n• `weather: storm` — today's weather\n• `terrain: [forest, hills]` — the hex the party is in\n• `tags: shrine` — a tag of that hex\n• `party.stats.fatigue: { lt: 2 }` — the party\n• `party.resources.food: { gte: 1 }` — food left\n• `refusing: true` — a value of the day\n• `moons.ember: full` — the calendar\nOtherwise its button stays disabled and says why; the system's night action that can't be taken lets the night pass without it.",
    nothing: 'When nothing applies',
    nothingHelp:
      'What the journal says when **none of its checks apply** where the party is; `{terrain}` is the hex\'s terrain.\n• `nothing to forage on {terrain}` → "nothing to forage on Hills"\nEmpty: a generic sentence. An action without checks says nothing more.',
    nothingPlaceholder: 'nothing to find on {terrain}',
    steps: 'What it does',
    stepsHelp:
      "What the action does, **one step per box, in order**, each written like in the YAML:\n• `time: 180` — three hours pass (or `time: dawn`, `time: nightfall`, `time: '14:00'`)\n• `speed: 0.5` — the rest of today's march goes at half speed\n• `effects: { party.stats.fatigue: -1 }` — change the party (a number adds or takes away; `'=0'` sets it)\n• `set: { lost: true }` — give a value of the day\n• `do: forage` — take another action (if its conditions hold)\n• `roll: ENCOUNTER_CHECK_REQUIRED` — roll a check now\nA change past a value's **Min** or **Max** stops there, and later steps see `below: [id]` or `above: [id]`.\nThe box beside each step is **its condition**: the step only happens when it holds.\n• `below: food` — only if food hit its minimum today\n• `party.stats.morale: { lte: 1 }` — only with low morale\n• `moment: hex-enter` — only when the action came at that moment\nThe actions that follow this one, and its checks (Checks → **When**: this action), come first.",
    on: 'By itself at',
    onHelp:
      "**Empty**: the player takes it, with a button.\nOtherwise the **moments the system takes it by itself**, if its conditions hold; it isn't a button then, and it comes before that moment's checks:\n• `day-start` — at dawn\n• `hex-enter` — entering each hex\n• `day-end` — as each day ends, camping or not\n• an action's id, e.g. `camp` — right after that action starts\nSeveral, separated by commas: `day-start, hex-enter`. Its conditions see which one it is as `moment` (`when: { moment: hex-enter }`).\nExamples:\n• eating as each day ends: `day-end`\n• hirelings grumbling at dawn after a hungry day: `day-start` with **Only when** `yesterday.hungry: true`",
    onButton: 'nothing: a button for the player',
    onAfter: 'After: {action}',
    step: 'Step',
    badStep:
      'A step does one thing: time: 60, speed: 0.5, effects: { … }, set: { … }, do: <action> or roll: <check>.',
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
    help: 'What is rolled on the way, when, and on which table. A check without a table stops the trip and waits for you.',
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
      'When the check is rolled (**Only if**) or skipped (**Skip if**), as `key: value` pairs, like in tables:\n• `terrain: forest` — the hex\n• `tags: landmark` — a tag of the hex\n• `edges: [road, river]` — the road or river of the step\n• `danger: { gte: 2 }` — a value of the hex or its region\n• `season: winter`, `weather: storm` — the moment\n• `party.resources.food: { lt: 1 }` — the party\n• `below: food` — food hit its minimum today (at `day-end`)\n• `moment: rest` — which of its moments it is (when it has several)\n• `any: [{ terrain: forest }, { danger: { gte: 3 } }]` — either',
    always: 'always',
    never: 'never',
    resolve: 'Rolled on',
    resolveHelp:
      "The table, oracle, generator or deck that resolves it. Its result goes to the journal, and its `set` values and `effects` reach the trip.\n• `grey-marches/getting-lost` — sets `lost: true` on a bad roll\n• a weather model — the day's weather with inertia\n• **nothing: wait for me** — the trip stops until you resolve it by hand",
    weatherModels: 'Weather with inertia',
    weatherModel: 'Weather model: {model}',
    waits: '— nothing: wait for me —',
    effects: 'Changes',
    effectsHelp:
      "What the check itself changes when it comes up, with or without a table:\n• `party.stats.fatigue: 1` — adds 1\n• `party.resources.food: -1` — takes 1 away\n• `party.stats.fatigue: '=0'` — sets it\nHow a system writes its rules as data, e.g. a day without enough food: **When** `day-end`, **Only if** `below: food`, **Changes** `party.stats.fatigue: 1`.",
    pause: 'Pause after it',
    pauseHelp:
      'The trip **stops** when this check comes up (after rolling it, if something resolves it) and waits until you press **Continue**: time to describe the place, write lore or decide something.\n• a shrine found on the way\n• a landmark to describe\nA table entry can also pause, only when it comes up (`pause: true` on the entry).',
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
  },
  yaml: { line: 'line {line}' },
  terrains: vocabulary.en.terrains,
  edgeKinds: vocabulary.en.pathKinds,
  storage: { full: 'Browser storage is full: export your packs to keep them safe.' },
} as const

import { vocabulary } from '@open-tabletop/ui-kit'
// Source of truth for UI strings (English is the default locale). `es.ts` mirrors this shape.
export const en = {
  app: {
    title: 'Travel',
    tagline: 'Play trips and build travel systems.',
  },
  nav: {
    systems: 'Travel systems',
    generic: 'Generic',
    help: 'Help and manual',
    undo: 'Undo the last change to your packs (Ctrl+Z)',
    redo: 'Redo (Ctrl+Shift+Z)',
    newSystem: 'New system',
    language: 'Language',
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
    title: 'Travel',
    body: 'Pick a travel system on the left to play a trip with it, or to see and edit its rules: how fast you go over each terrain and road, what you carry, and which checks are rolled on the way. Trips here have no map: you describe the way hex by hex. To travel on a map, use the Hexmapper (Play mode) with the same systems.',
  },
  tabs: { play: 'Play', rules: 'Rules', checks: 'Checks', yaml: 'YAML' },
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
      'Hexes whose terrain the map marks as water (Hexmapper: Edit palette → Water) and that have no rule of their own in Terrains. Usually not passable on foot; a way of travelling “Only through” water (water: true) can still sail them.',
    day: 'The day',
    dayHelp:
      'When the day starts (and dawn checks are rolled) and when night falls: nobody marches after nightfall.',
    start: 'Dawn',
    nightfall: 'Nightfall',
    hoursPerDay: 'Marching hours a day',
    night: 'At nightfall, while waiting',
    nightHelp:
      'What the party does when night falls while it waits (the world clock moving with a trip on): one of the system’s actions, e.g. camp. By default camp, if the system has it; none: the night just passes.',
    nightDefault: 'camp, if there is one',
    nightNone: 'nothing: the night passes',
    hoursPerDayHelp: 'How long the party can march each day before it has to stop.',
    modes: 'Ways of travelling',
    modesHelp:
      'On foot, on horseback… The speed is in km per marching day on easy ground; terrains and roads change it.',
    kmPerDay: 'km per day',
    name: 'Name',
    nameHelp:
      'What players read in the trip panel and the journal instead of the id (e.g. On horseback, Rations). Written in the current language: the pack’s own, or its translation file when the interface is in another one.',
    allowedTerrains: 'Only through',
    allowedTerrainsHelp:
      'Where it can go: a condition on each hex it enters (its terrain, water, tags, region, fields, the roads or rivers of the step), e.g. a boat: any: [{ water: true }, { terrain: coast }]; a cart only by road: edges: road. Where it holds, even closed terrains are open to it. Empty: wherever terrains allow.',
    anyTerrain: 'wherever terrains allow',
    terrains: vocabulary.en.terms.terrains,
    terrainsHelp:
      'How each terrain changes the speed. Terrain ids are the ones the map uses (forest, hills…).',
    terrain: vocabulary.en.terms.terrain,
    multiplier: 'Speed ×',
    multiplierHelp: '1 is normal speed, 0.5 half as fast, 2 twice as fast.',
    passable: 'Passable',
    passableHelp:
      'Unticked: no way of travelling can enter it (routes go around), except one whose “Only through” holds there. Ticked, it can still open or close on a condition (Open when, Closed when).',
    openWhen: 'Open when',
    closedWhen: 'Closed when',
    passableWhenHelp:
      'When it can be entered, as a condition on the hex entered and the moment (its terrain, tags, region, fields, the roads or rivers of the step, the way of travelling, the weather, the season and calendar, today’s values). Open when: only while it holds, e.g. a lake crossed on the ice, season: winter. Closed when: not while it holds, e.g. a mountain pass, any: [{ season: winter }, { weather: blizzard }]. Empty: always open / never closed.',
    defaultTerrain: 'Speed × for terrains not listed',
    defaultTerrainHelp: 'Used for any terrain missing above (1 if empty).',
    edges: 'Roads and rivers',
    edgesHelp:
      'Following a road, trail or river between two hexes: its speed replaces the terrain’s. Lines not listed do nothing.',
    edge: 'Line',
    edgeMultiplierHelp: 'Speed along it: 1.5 is half again as fast as open ground.',
    resources: vocabulary.en.terms.supplies,
    resourcesHelp:
      'What the party carries. What uses it is up to the system: effects of its actions (an action at the end of the day eats), checks and tables (party.resources.food: -1).',
    min: 'Min',
    minHelp:
      'Effects never take it below this: a change past it stops there, and later steps and that day’s checks see below: [its id]. Empty: no minimum (it may go negative).',
    max: 'Max',
    maxHelp:
      'Effects never take it above this (later steps and checks see above: [its id]). Empty: no maximum.',
    olderEating:
      'These rules eat the older way (supplies used “per day”, ways of travelling that use supplies, or steps that eat the day’s supplies). They still play the same; converting writes it as an action the system takes at the end of each day, with Min 0 on the supplies.',
    olderEatingConvert: 'Convert',
    weather: vocabulary.en.terms.weather,
    weatherHelp:
      'How weather slows the party. Tables set it with set: { weather: … } (usually rolled at dawn).',
    weatherState: vocabulary.en.terms.weather,
    speed: 'Speed ×',
    speedHelp: '0 means no travel that day; 0.5 half speed.',
    actions: 'Actions',
    actionsHelp:
      'What the party can do besides marching: camp, rest and the system’s own (forage, pray…), each a button in the trip panel. Each one says when it can be taken and what it does, step by step.',
    oncePerDay: 'Once a day',
    modeWhenHelp:
      'It can only be chosen when this holds, e.g. a boat only at the water’s edge: any: [{ water: true }, { tags: ferry }]. Empty: always. Unless: it can’t be chosen while this holds.',
    values: 'Values of the day',
    valuesHelp:
      'Values this system’s tables can set for the rest of the day (set: { lost: true }), with what they block while they hold: travel, actions by id, or ways of travelling (mode.<id>). Tables read them the next day as yesterday.<id>. Without any, the older built-in lost (blocks travel) still works.',
    blocks: 'Blocks',
    blocksHelp:
      'What can’t be done while the value holds: travel, one of the system’s actions by its id (camp, forage…) or a way of travelling as mode.<id> (mode.horse); the box suggests what this system declares. The buttons stay visible, disabled, saying why.',
    blocksNothing: 'nothing',
  },
  actions: {
    when: 'Only when',
    unless: 'Not when',
    whenHelp:
      'When the button can be pressed, with conditions like the tables’: today’s values (forageImpossible: true), the map (terrain: [forest, hills]), the party (party.stats.faith: { gte: 1 }). Otherwise it stays disabled and says why.',
    nothing: 'When nothing applies',
    nothingHelp:
      'What the journal says when none of its checks apply where the party is; {terrain} is the hex’s terrain. Empty: a generic sentence.',
    nothingPlaceholder: 'nothing to find on {terrain}',
    steps: 'What it does',
    stepsHelp:
      'Its steps, in order, each written like in the YAML: time: 180 (minutes; or dawn, nightfall, 14:00), speed: 0.5 (the rest of today’s march), effects: { party.stats.fatigue: -1 } (a change past a value’s Min or Max stops there; later steps see below: [id] or above: [id]), set: { lost: true } (values of the day), do: forage (another action, if its conditions hold), roll: ENCOUNTER_CHECK_REQUIRED (a check now). The box next to it is the step’s condition: it only happens when it holds (below: food, doing: camp…). The actions that follow this one and its checks (Checks tab, At: this action) come first.',
    on: 'By itself at',
    onHelp:
      'Empty: the player takes it, with a button. Or the moments the system takes it by itself, if its conditions hold: day-start (at dawn), hex-enter (entering a hex), day-end (as each day ends) or an action’s id (right after it), several separated by commas, e.g. day-start, hex-enter. Taken by the system it isn’t a button, and it comes before that moment’s checks; its conditions see which moment it is (moment: hex-enter). E.g. eating as each day ends, whether the party camped or not: day-end.',
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
      'What players read in the trip panel and the journal instead of the event id (e.g. Getting lost). This box edits it in the current language: the pack’s own, or its translation file when the interface is in another one.',
    description: 'Description (tooltip)',
    at: 'When',
    atOptions: {
      'day-start': 'At dawn',
      'hex-enter': 'Entering a hex',
      camp: 'In camp',
      'day-end': 'At the end of the day',
    },
    atNone: 'only when a step rolls it',
    atHelp:
      'When it is rolled: day-start (at dawn), hex-enter (entering a hex), day-end (as each day ends) or an action’s id (with it: camp, forage…), several separated by commas, e.g. hex-enter, camp. Its conditions and table see which one it is (moment: camp). Empty: only when an action’s step rolls it (roll: <its event>).',
    atAction: 'Action: {action}',
    when: 'Only if',
    unless: 'Skip if',
    conditionHelp:
      'Conditions like in tables, as key: value pairs: terrain: forest, tags: landmark, edges: [road, river], season: winter, weather: storm.',
    always: 'always',
    never: 'never',
    resolve: 'Rolled on',
    resolveHelp:
      'The table, oracle, generator or deck that resolves it. Its result goes to the journal, and its set values and effects reach the trip.',
    weatherModels: 'Weather with inertia',
    weatherModel: 'Weather model: {model}',
    waits: '— nothing: wait for me —',
    effects: 'Changes',
    effectsHelp:
      'What the check itself changes when it comes up, with or without a table: party.stats.fatigue: 1, party.resources.food: -1. A number adds or takes away; =3 sets it. How a system writes its rules as data (a day without food: fatigue +1).',
    pause: 'Pause after it',
    pauseHelp:
      'The trip stops when this check comes up (after rolling it, if something resolves it) and waits until you press Continue: time to describe the place, write lore or decide something. A table entry can also pause, only when it comes up.',
    context: 'Extra context',
    contextHelp: 'Values the table sees only for this check, e.g. timeOfDay: night.',
    none: 'No checks: trips only spend time and supplies.',
    add: 'Add a check',
    orphans: 'Tables bound to checks these rules don’t have: {events}.',
    removeOrphans: 'Remove them',
    stats: 'Party stats',
    statsHelp:
      'Numbers of the party the tables can use (e.g. 2d6 + {{charisma}}). They are edited during the trip.',
    statName: 'Name',
    statDescription: 'Description',
    statDefault: 'Starts at',
    noStats: 'No party stats.',
    addStat: 'Add a stat',
  },
  trips: {
    title: 'Trip',
    help: 'Your trips are kept in this browser, each with its system, its way and its journal. Pick one to go on with it.',
    name: 'Name',
    unnamed: '{system}, day {day}',
    new: 'Another trip',
    delete: 'Delete',
    deleteConfirm: 'Delete the trip “{trip}” and its journal?',
  },
  play: {
    current: 'The open trip uses {system}.',
    switch: 'Start a trip with {system}',
    switchConfirm: 'Start this trip again with {system}? Its journal is discarded.',
    way: 'The way',
    wayHelp:
      'A trip without a map: list the hexes ahead, with their terrain and tags and whether a road or river joins each one to the next. The party heads for the last one.',
    hexKm: 'km per hex',
    hex: 'Hex {n}',
    here: 'here',
    terrain: vocabulary.en.terms.terrain,
    tags: vocabulary.en.terms.tags,
    tagsPlaceholder: 'landmark, haunted…',
    edges: 'To the next hex',
    numberHelp:
      'The hexes in order: the party starts at 1 and heads for the last one. Hexes already passed can’t be changed; add more at the end to keep going.',
    terrainHelp:
      'How fast the hex is crossed (the system’s speed for that terrain, and whether it can be crossed at all) and what tables see as terrain (terrain: forest in a condition).',
    tagsHelp:
      'Words that mark the hex, separated by commas, for the checks and tables that look for them (tags: landmark in a condition). The suggestions are the tags the loaded packs use; what each one does depends on the system (see its page in the manual).',
    edgesHelp:
      'Whether a road, trail or river joins this hex to the next one. What that does depends on the system: roads are often faster, and a system may skip some checks on them (edges: road in a condition).',
    addHex: 'Add a hex',
    remove: 'Remove',
    destinationHint: 'Add hexes to the way to set off.',
    arrivedHint: 'Add more hexes to keep going.',
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
      "The Generic rules are built in and can't be edited. Create a new system (on the left) to start your own from them.",
  },
  yaml: { line: 'line {line}' },
  terrains: vocabulary.en.terrains,
  edgeKinds: vocabulary.en.pathKinds,
  storage: { full: 'Browser storage is full: export your packs to keep them safe.' },
} as const

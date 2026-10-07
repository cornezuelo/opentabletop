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
      'Hexes whose terrain the map marks as water (Hexmapper: Edit palette → Water) and that have no rule of their own in Terrains. Usually not passable on foot; a way of travelling “Only through” water (write water) can still sail them.',
    day: 'The day',
    dayHelp:
      'When the day starts (and dawn checks are rolled) and when night falls: nobody marches after nightfall.',
    start: 'Dawn',
    nightfall: 'Nightfall',
    hoursPerDay: 'Marching hours a day',
    hoursPerDayHelp: 'How long the party can march each day before it has to stop.',
    modes: 'Ways of travelling',
    modesHelp:
      'On foot, on horseback… The speed is in km per marching day on easy ground; terrains and roads change it.',
    kmPerDay: 'km per day',
    name: 'Name',
    nameHelp:
      'What players read in the trip panel and the journal instead of the id (e.g. On horseback, Rations). Written in the current language: the pack’s own, or its translation file when the interface is in another one.',
    consumes: 'Uses per day',
    consumesHelp:
      'Supplies this way of travelling uses each day on top of what everyone uses (Supplies → Per day), e.g. fodder: 1 for horses. Empty: nothing extra.',
    consumesNone: 'nothing extra',
    allowedTerrains: 'Only through',
    allowedTerrainsHelp:
      'Terrains it can go through, separated by commas (e.g. a boat: lake, sea). Empty: any.',
    anyTerrain: 'any terrain',
    terrains: vocabulary.en.terms.terrains,
    terrainsHelp:
      'How each terrain changes the speed. Terrain ids are the ones the map uses (forest, hills…).',
    terrain: vocabulary.en.terms.terrain,
    multiplier: 'Speed ×',
    multiplierHelp: '1 is normal speed, 0.5 half as fast, 2 twice as fast.',
    passable: 'Passable',
    passableHelp:
      'Unticked: no way of travelling can enter it (routes go around), except one whose “Only through” lists it.',
    defaultTerrain: 'Speed × for terrains not listed',
    defaultTerrainHelp: 'Used for any terrain missing above (1 if empty).',
    edges: 'Roads and rivers',
    edgesHelp:
      'Following a road, trail or river between two hexes: its speed replaces the terrain’s. Lines not listed do nothing.',
    edge: 'Line',
    edgeMultiplierHelp: 'Speed along it: 1.5 is half again as fast as open ground.',
    resources: vocabulary.en.terms.supplies,
    resourcesHelp:
      'What the party carries and how much is used each day (whether you march or not).',
    perDay: 'Per day',
    perDayHelp:
      'Used every day by everyone, whatever the way of travelling (a way of travelling can add its own: Ways of travelling → Uses per day). 0 for a supply only some ways of travelling use, like fodder for horses. Running short of any supply raises fatigue by 1 that day.',
    weather: vocabulary.en.terms.weather,
    weatherHelp:
      'How weather slows the party. Tables set it with set: { weather: … } (usually rolled at dawn).',
    weatherState: vocabulary.en.terms.weather,
    speed: 'Speed ×',
    speedHelp: '0 means no travel that day; 0.5 half speed.',
    actions: 'Actions',
    actionsHelp: 'What the party can do besides marching.',
    camp: 'Camp (ends the day)',
    rest: 'Rest (a short pause)',
    campHelp:
      'The party stops for the night: camp checks are rolled, it sleeps until dawn, eats the day’s supplies and, if fed, recovers 1 fatigue.',
    restHelp: 'A pause of some minutes during the day; it recovers the fatigue set here.',
    restMinutes: 'Minutes',
    restFatigue: 'Fatigue recovered',
    restFatigueHelp: '0: a pause that recovers nothing (camping does).',
    ownActions: 'Actions of this system',
    ownActionsHelp:
      'Buttons of your own next to Travel, Camp and Rest, e.g. forage: they take time, can slow the rest of the day’s march and recover fatigue. Give them checks in the Checks tab (When: the action). Their name, description and what the journal says when none of their checks apply (nothing) go in the YAML (name: Forage for food), and their translations in locales/ like the checks’.',
    actionSpeedHelp: 'Multiplies the rest of the day’s march: 0.5 halves it. Empty: no change.',
    oncePerDay: 'Once a day',
  },
  checks: {
    title: 'Checks',
    help: 'What is rolled on the way, when, and on which table. A check without a table stops the trip and waits for you.',
    event: 'Check',
    name: 'Name',
    nameHelp:
      'What players read in the trip panel and the journal instead of the event id (e.g. Getting lost). This box edits it in the current language: the pack’s own, or its translation file when the interface is in another one.',
    description: 'Description (tooltip)',
    at: 'When',
    atOptions: { 'day-start': 'At dawn', 'hex-enter': 'Entering a hex', camp: 'In camp' },
    atAction: 'Action: {action}',
    when: 'Only if',
    unless: 'Skip if',
    conditionHelp:
      'Conditions like in tables, as key: value pairs: terrain: forest, tags: landmark, edges: [road, river], season: winter, weather: storm.',
    always: 'always',
    never: 'never',
    resolve: 'Rolled on',
    resolveHelp:
      'The table or generator that resolves it. Its result goes to the journal, and its set values reach the trip.',
    weatherModels: 'Weather with inertia',
    weatherModel: 'Weather model: {model}',
    waits: '— nothing: wait for me —',
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

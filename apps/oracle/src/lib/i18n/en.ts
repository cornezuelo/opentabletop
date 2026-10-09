import { vocabulary } from '@open-tabletop/ui-kit'
/** Reference dictionary: its shape defines the message keys. */
export const en = {
  app: {
    title: 'Oracle',
    tagline: 'Roll and build random tables, generators, oracles and decks.',
  },
  nav: {
    favorites: 'Favorites',
    favorite: 'Favorite: pinned on top of the list (also in the Hexmapper)',
    help: 'Help and manual',
    undo: 'Undo the last change to your packs (Ctrl+Z)',
    redo: 'Redo (Ctrl+Shift+Z)',
    showSidebar: 'Show the pack list',
    hideSidebar: 'Hide the pack list (more room)',
    showHistory: 'Show the history',
    hideHistory: 'Hide the history (more room)',
    showHelp: 'Show the help',
    hideHelp: 'Hide the help (more room)',
    newDefinition: 'New definition',
    search: 'Search tables…',
    newPack: 'New pack',
    import: 'Import .zip',
    importTip:
      'Import packs from a .zip: one pack (a folder with pack.yaml), or a system with the packs it brings.',
    noResults: 'Nothing matches.',
    problems: '{count} problems',
  },
  kinds: vocabulary.en.kinds,
  kindTips: {
    table: 'Roll dice (or pick by weight) and look up the entry.',
    oracle: 'A table with variants chosen by an input, like the odds of a yes/no question.',
    generator: 'Rolls several tables and fills a text template with the results.',
    deck: 'Cards drawn without replacement until the deck is reshuffled.',
  },
  origin: {
    bundled: 'bundled',
    edited: 'edited',
    personal: 'personal use',
    updated: 'update',
  },
  originTips: {
    bundled: 'Comes with the app and is read-only. Edit a copy to change it.',
    edited: 'Your edited copy of a bundled pack; it replaces the bundled one.',
    personal: 'Personal-use content from packs-private/: don’t share or publish it.',
    updated:
      'The bundled version of this pack changed since you made your copy: open the pack to take or keep each change.',
  },
  prefs: {
    seed: 'Seed for rolls',
    seedPlaceholder: 'Empty: at random',
    seedHelp:
      'Any word or number makes the rolls repeatable: the same seed gives the same results to the same rolls, in the same order.\n• `grey-marches-1` — your first session; **New session** in the history starts it over\n• share the seed of a session and someone else can replay it\nEmpty: rolls at random. Kept with the history in this browser.',
    packs: 'Packs in the list',
    packsHelp:
      'Untick the packs you don’t use to leave them out of the list on the left.\nThey still load: other packs’ tables that roll on them and the other apps keep using them. Favorites stay pinned.',
  },
  welcome: {
    title: 'Oracle',
    body: 'Pick a table, generator, oracle or deck on the left to roll it. Packs are folders of YAML files: bundled packs are read-only (edit a copy), your own packs are stored in this browser. Export them as .zip to back them up or share them.',
    packs: '{packs} packs, {definitions} definitions',
  },
  tabs: { roll: 'Roll', edit: 'Edit' },
  edit: {
    readOnly: 'This pack is bundled and read-only.',
    personalCopy: 'Your copy stays in this browser and is personal use only.',
    makeCopy: 'Edit a copy',
    name: 'Name',
    description: 'Description',
    roll: 'Dice',
    rollHelp:
      "Dice rolled on the table; each entry's **Range** says which totals pick it.\n• `1d6`, `2d6`, `1d20` — the usual dice\n• `d66` — two d6 read as tens and units (11–66)\n• `d%` — 1–100\n• `2d6kh1` — roll 2d6, keep the highest\n• `1d6 + {{survival}}` — plus a value the roll is given (a party stat, a field)\nEmpty: an entry is picked by **Weight**.",
    entries: 'Entries',
    range: 'Range',
    rangeHelp:
      'The rolled totals that pick this entry:\n• `3` — only a 3\n• `2-5` — from 2 to 5\n• `11-16` — with `d66`\nRanges must not overlap; the problems list says which totals are missing. Without dice, use **Weight** instead.',
    weight: 'Weight',
    weightHelp:
      'Relative chance when the table has no dice (default `1`):\n• `3` on one entry and `1` on another — three times as likely\n• `0` — never, unless chosen by a condition',
    result: 'Result',
    then: 'Then roll',
    thenHelp:
      "Another table or generator rolled **when this entry comes up**; its result is added to this one's.\n• `ruins` — what the ruins are\n• `core/npc` — a table from another pack (`pack/id`)\nThe table it rolls sees what this entry **Sets**.",
    nothing: 'nothing',
    id: 'Id',
    idHelp:
      "Stable name of the entry, used by **translations** (`entries: { bandits: … }` in `locales/`) and by limits (**Only once**, **At most**).\n• `bandits`, `old-shrine`\nRenaming it breaks its translations; reordering entries doesn't.",
    addEntry: 'Add entry',
    remove: 'Remove',
    moveUp: 'Move up',
    moveDown: 'Move down',
    renumber: 'Number 1–{count}',
    renumberHelp:
      'Gives the entries consecutive ranges `1`, `2`, `3`… and sets the dice to match (`1d6` for six entries). Handy after adding or removing entries.',
    clamp: 'Clamp totals',
    clampHelp:
      'Modifiers can push a roll out of range (`1d6 + 3` gives 9). **On**: a total below the lowest range takes the first entry, above the highest the last one.\n**Off**: nothing comes up.\n• a reaction roll `2d6 + {{charisma}}` — usually on',
    onExhausted: 'When exhausted',
    onExhaustedHelp:
      'What happens when the entry rolled has reached its limit (**Only once** or **At most**):\n• **Roll again** — until an entry that can still come up\n• **Take the next one** — the next entry in the list\n• **Nothing** — no result this time',
    exhausted: { reroll: 'Roll again', next: 'Take the next one', none: 'Nothing' },
    advanced: 'Has conditions, values or limits (⋯ to see them).',
    more: 'Conditions, values and limits',
    when: 'Only if',
    whenHelp:
      "When the entry can come up, as `key: value` pairs on what the table sees (the map, the trip, the inputs, earlier fields):\n• `terrain: forest` — only in forests\n• `tags: landmark` — a tag of the hex\n• `danger: { gte: 3 }` — a value of the hex or region, 3 or more\n• `season: [autumn, winter]` — either season\n• `timeOfDay: night`\n• `danger: { gt: '{{party.stats.stealth}}' }` — a variable: compared with another value\n• `party.stats.str: { gte: '{{1d20}}' }` — a roll under a stat (the same d20 for every entry of the roll)\n• `party.stats.survival: { gte: '{{roll}}' }` — under a stat on the table's own **Roll** (`roll`: its total, also in the entry's text, `set` and changes)\n• `hex.terrain: forest`, `trip.weather: storm`, `time.daylight: true` — by **full name** (`hex.*`, `time.*`, `trip.*`, `system.*`, `world.*`): the same values, never hidden by a stat with the same name\n**Unless**: it can't come up when this matches:\n• `edges: road` — not by road\nEmpty: always. An entry that can't come up is skipped as if it weren't there.",
    unless: 'Unless',
    set: 'Sets',
    setHelp:
      "Values the entry gives when it comes up, as `key: value` pairs. Later tables, the template and the trip read them:\n• `weather: storm` — the day's weather\n• `lost: true` — a value of the day the system declares (it can block travel)\n• `count: '{{2d6}}'` — a number rolled now\n• `terrain: '{{common}}'` — copied from what the table sees\n• `rolled: '{{roll}}'` — the total of the table's own roll",
    effects: 'Changes',
    effectsHelp:
      "What the entry changes in the trip's party when it comes up:\n• `party.stats.morale: -1` — takes 1 away\n• `party.resources.food: '{{1d3}}'` — adds a rolled amount\n• `party.stats.fatigue: '=0'` — sets it\nThe values are the system's (stats and supplies). During a trip they apply at once; rolled by hand, they're offered to the trip (**Apply to the trip**).",
    once: 'Only once',
    onceHelp:
      'Comes up **at most once per session** (a unique NPC, a one-off treasure); after that the table does what **When exhausted** says. Needs an **Id**.',
    pause: 'Pause',
    pauseHelp:
      'When this comes up **during a trip**, the trip stops after the roll and waits until you press **Continue**: time to describe the place, write lore or decide something.\n• a lair found in the forest\n• an ambush\nRolled by hand, it does nothing.',
    maxOccurrences: 'At most',
    maxOccurrencesHelp:
      'Times it can come up per session:\n• `2` — twice, then **When exhausted**\nEmpty: no limit. Needs an **Id**.',
    notAMap: 'Write key: value pairs, e.g. terrain: forest',
    language: 'Language',
    baseLanguage: '{locale} (base)',
    translationHelp:
      'Translations are stored in `locales/<language>/` next to the file (`locales/es/encounters.yaml`), keyed by definition and entry id. Pick a language here and type the texts; empty fields fall back to the base language.',
    needsIds: 'Entries need ids to be translated.',
    assignIds: 'Give entries ids',
    deleteDefinition: 'Delete',
    confirmDelete: 'Delete "{name}"? This can’t be undone.',
    coverage: 'The ranges don’t cover every roll; see the problems below.',
    duplicateRow: 'Duplicate',
    input: 'Input',
    inputHelp:
      "What you choose **before rolling**, each option with its own list of entries:\n• the odds: `low`, `even`, `high`\n• an NPC's attitude: `hostile`, `wary`, `friendly`\nTables and trips can choose it too, with a value of the same name (`odds: high`).",
    inputLabel: 'Label',
    labelHelp:
      'Shown instead of the id when rolling, and translatable:\n• `odds` → _The odds_\n• `even` → _Even_\nEmpty: the id is shown.',
    optionLabel: 'Label',
    modes: 'Roll modes',
    modesHelp:
      'Ways of rolling this table that its system declares (`kind: roll-modes`), such as advantage: roll the whole roll several times and keep one total.\n**Ticked**: offered when rolling by hand.\n**By itself when**: used without asking when the condition holds:\n• `explorer: { gte: 1 }` — a party stat\n• `yesterday.lost: true` — got lost yesterday\n• `weather: clear`\n**Unless**: not used by itself when this holds (written alone, the mode is used always but then):\n• `terrain: dense-forest`\nTwo modes that cancel each other out (advantage and disadvantage), together, give a normal roll.',
    modeWhen: 'by itself when',
    modeUnless: 'unless',
    noModes:
      'This pack and its dependencies declare no roll modes. Add a kind: roll-modes definition (New definition → Roll modes) to roll tables with advantage or any other way.',
    default: 'Default',
    defaultHelp:
      'The option selected when the roll panel opens:\n• `even` — for the odds\nEmpty: the first one.',
    firstOption: 'The first one',
    options: 'Options',
    optionsHelp:
      'The choices of the input, each with its own list of entries:\n• `low`, `even`, `high`\nRenaming an option renames its list of entries too.',
    newOption: 'New option',
    addOption: 'Add option',
    optionExists: 'There is already an option "{option}".',
    variant: '{input}: {option}',
    missingVariant: 'No entries for "{option}" yet.',
    createVariant: 'Create them',
    template: 'Template',
    templateHelp:
      "Text of the result: write `{{field}}` where each field's value goes.\n• `The ruins of {{site}}, guarded by {{guardian}}.`\n• `{{count}} wolves ({{mood}})`\nThe chips below add a field at the end. Empty: the fields are listed one per line.",
    insertField: 'Add to the template',
    fields: 'Fields',
    fieldsHelp:
      'Each field is rolled **in order**; later fields and tables can use earlier values (`{{danger}}`). A field comes from:\n• a **Table** — `ruins`\n• a **Generator** — another generator\n• **Dice** — `2d6kl1`, `d%`\n• a **Fixed value** — `3`, or a text with variables: `danger {{danger}} of 6`',
    fieldName: 'Name',
    fieldSource: 'From',
    fieldValue: 'Table, dice or value',
    sources: { table: 'Table', generator: 'Generator', roll: 'Dice', value: 'Fixed value' },
    fieldMore: 'Conditions and context',
    fieldWhenHelp:
      '**Only if**: the field is rolled only when this matches what the generator sees (its inputs, earlier fields, the map or trip); otherwise it stays empty.\n• `season: winter`\n• `danger: { lte: 2 }` — an earlier field\n**Unless**: not when this matches:\n• `untouched: { lt: 90 }`\nEmpty: always.',
    fieldContext: 'Context',
    fieldContextHelp:
      "Values given to the table or generator this field rolls, as `key: value` pairs:\n• `danger: 3` — as if the place were more dangerous\n• `timeOfDay: night`\n• `terrain: '{{terrain}}'` — passed on from what the generator sees",
    fieldExists: 'There is already a field "{field}".',
    addField: 'Add field',
    reshuffle: 'Reshuffle',
    reshuffleHelp:
      'When drawn cards go back into the deck:\n• **When the deck runs out** — like a real deck\n• **Only by hand** — a deck that empties for good\n• **After every draw** — every card always possible',
    reshuffles: {
      'when-empty': 'When the deck runs out',
      manual: 'Only by hand',
      'after-draw': 'After every draw',
    },
    cards: 'Cards ({count} in the deck)',
    cardIdHelp:
      'Stable name of the card, used by **translations** (`cards: { ace: … }`) and to track drawn cards:\n• `ace-of-cups`',
    copies: 'Copies',
    copiesHelp:
      'How many of this card the deck has:\n• `3` — three times as likely as a single card\n• `1` — a unique card',
    cardText: 'Text',
    addCard: 'Add card',
  },
  pack: {
    files: 'Files',
    addFile: 'Add file',
    fileName: 'File name, e.g. tables/weather.yaml',
    rename: 'Rename',
    renamePrompt: 'New name for {file}',
    deleteFile: 'Delete file',
    confirmDeleteFile: 'Delete {file}?',
    definitions: 'Definitions',
    newDefinition: 'New definition',
    id: 'Id',
    kind: 'Kind',
    inFile: 'In file',
    create: 'Create',
    problems: 'Problems',
    noProblems: 'No problems found.',
    export: 'Export .zip',
    revert: 'Revert to bundled',
    confirmRevert: 'Discard your changes to "{name}" and go back to the bundled version?',
    deletePack: 'Delete pack',
    confirmDeletePack: 'Delete the pack "{name}" and all its files? This can’t be undone.',
    version: 'Version',
    locale: 'Base language',
    license: 'License',
    translations: 'Translations',
    noTranslations: 'None yet.',
    addTranslation: 'Add language',
    translationCode: 'Language code, e.g. es',
    invalidId: 'Ids use lowercase letters, digits and dashes.',
    idTaken: 'There is already a definition "{id}" in this pack.',
    fileExists: 'There is already a file {file}.',
    manifest: 'Manifest',
    manifestHelp:
      'Name, version, base language, licence and dependencies are in `pack.yaml`:\n• `version: 1.2.0`\n• `dependencies: { core: ^0.1.0 }` — tables of another pack it uses',
    other: 'Other definitions',
    otherHelp:
      'Rules for other engines: travel rules, bindings, calendars, weather models. Edit them in their files (YAML), or travel rules in the **Travel** app.',
  },
  defActions: {
    duplicate: 'Duplicate',
    duplicateHelp: 'Make a copy in this pack (as `<id>-copy`) to use as a starting point.',
    copyTo: 'Copy to…',
    copyToHelp:
      "Copy into one of your packs, with its translations. References to this pack's tables keep working (`grey-marches/ruins`).",
    copied: 'Copied as {id}',
  },
  newDef: {
    forTravel: 'Rules of the system',
    forTravelHelp:
      'Rules of a system, besides its tables:\n• **Roll modes** — ways its tables can be rolled (advantage…)\n• **Travel rules** — makes the pack a system you can pick in the Hexmapper (Play → With rules) and in Travel, edited in the Systems app\n• **Bindings** — which table answers each check\n• **Calendar**, **Weather model**\nSee the manual: _Kinds of definition_ and _Connecting tables to maps and trips_.',
    system: {
      'roll-modes': 'Roll modes',
      'travel-rules': 'Travel rules',
      bindings: 'Bindings',
      calendar: 'Calendar',
      weather: 'Weather model',
    },
    systemTips: {
      'roll-modes':
        'Ways of rolling its tables, like advantage: roll several times and keep one total.',
      'travel-rules': 'Speeds, terrains, roads, supplies and which checks are rolled when.',
      calendar:
        'Months and seasons, weekdays, moons and holidays for its trips and the world clock.',
      weather:
        'Weather with memory: per season, how likely each weather is tomorrow. Bind it to a check with weather:.',
      bindings: 'Which table answers each travel check, and the party stats tables read.',
    },
    alreadyHas: 'This pack already has one.',
    title: 'New definition',
    pack: 'In pack',
    noPacks:
      'Definitions go into your own packs: create a pack first (or edit a copy of a bundled one).',
    name: 'Name',
    idPreview: 'Id: {id}',
    fromText: 'From pasted text',
    fromTextHelp:
      'Paste a table and its entries are made for you:\n• a numbered list copied from a PDF: `1. Wolves`, `2–3 Bandits`, `4) A pedlar` (a line the PDF wrapped joins the one before)\n• a CSV or spreadsheet copy: `1,Wolves` or the number and the text in two columns\n• a plain list, one entry per line: equally likely\nThe dice come from the numbers: 1–6 is `1d6`, 2–12 `2d6`, 11–66 `d66`, 01–00 `d100`. Check the table afterwards in its form.',
    fromTextPlaceholder: '1. Wolves\n2-3 Bandits\n4 A pedlar\n5-6 Nothing',
    fromTextRolled: '{count} entries, rolled on {roll}',
    fromTextWeighted: '{count} entries, equally likely',
    fromTextSkipped: 'left out line(s) {lines}',
    file: 'File',
    fileHelp:
      'YAML file of the pack it is written to. Any file works; group them as you like:\n• `encounters.yaml`\n• `tables/weather.yaml`',
    newFile: 'New file…',
  },
  newPack: {
    title: 'New pack',
    id: 'Folder / id',
    idHelp:
      'Lowercase letters, digits and dashes. Other packs refer to its tables as `id/table`:\n• `my-setting` → `my-setting/encounters`',
    name: 'Name',
    locale: 'Base language',
    localeHelp:
      'Language the tables are written in (`en`, `es`…); translations to other languages can be added later.',
    create: 'Create',
    cancel: 'Cancel',
    idTaken: 'There is already a pack "{id}".',
  },
  file: {
    problems: '{count} problems',
    noProblems: 'No problems',
    line: 'line {line}',
    readOnly: 'Read-only (bundled)',
  },
  storage: { full: 'Browser storage is full: export your packs to keep them safe.' },
  common: { cancel: 'Cancel', ok: 'OK', close: 'Close' },
}

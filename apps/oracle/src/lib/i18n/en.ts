import { vocabulary } from '@open-tabletop/ui-kit'
/** Reference dictionary: its shape defines the message keys. */
export const en = {
  app: {
    title: vocabulary.en.apps.oracle,
    tagline: 'Roll and build random tables, generators, oracles and decks.',
  },
  nav: {
    favorites: 'Favorites',
    favorite: 'Favorite: pinned on top of the list (also in Map)',
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
  campaign: {
    title: vocabulary.en.terms.campaign,
    open: vocabulary.en.campaign.open,
    none: 'No campaign',
    help: "Where hand rolls keep their decks, once-only results and history: the campaign you're playing, chosen in **Playing** at the top (shared by every app).\n• **No campaign** — the Oracle's own, kept in this browser\n• a campaign — shared with its maps and trips: a card drawn here is gone on that map's trips too, and the rolls show in its Oracle panel\nYour seed (Preferences) stays this browser's own either way.",
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
    title: vocabulary.en.apps.oracle,
    body: 'Pick a table, generator, oracle or deck on the left to roll it. Packs are folders of YAML files: bundled packs are read-only (edit a copy), your own packs are stored in this browser. Export them as .zip to back them up or share them.',
    packs: '{packs} packs, {definitions} definitions',
  },
  rolledBy: {
    title: 'Rolled by',
    help: "Where the systems that bring this pack roll it: an action's step (`roll: table.ruins`), a check's binding, a progress clock filling, another table's entry or a generator's field. Each place links to where it's edited (the rules in Packs, tables here).\n• **Nothing rolls it** — it's rolled by hand, or by a pack no system brings\nWhat a map or a trip rolls by itself (the weather's own tables, discovery) is said by the system's bindings, listed too.",
    count: '{n} places',
    none: 'Nothing rolls it',
  },
  tabs: { roll: 'Roll', edit: 'Edit' },
  pack: {
    definitions: 'Definitions',
    newDefinition: 'New definition',
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
  storage: { full: 'Browser storage is full: export your packs to keep them safe.' },
  common: { cancel: 'Cancel', ok: 'OK', close: 'Close' },
}

export const en = {
  name: 'Name',
  values: 'Values',
  conditions: 'Conditions',
  tags: 'Tags',
  tagsHelp:
    'Free words about the character (a calling, a secret, an aspect), comma-separated. Conditions read them:\n• `characters.kael.tags: oathbound`',
  tagsPlaceholder: 'oathbound, outlander',
  relations: 'Relations',
  relationsHelp:
    "What this character is tied to: another character, a place, a region, a hex, as the sheet's kinds of relation say (a bond, a home…), some with a number. Conditions read them:\n• `{path}.relations.home: region:The Vale` — this character's home\n• `hex.related: kael` — entering a hex Kael is tied to (it, its region or a place in it)\n• `hex.relations.home: kael` — Kael's home, by kind\nType a name from the list, or a reference: `character:mara`, `poi:inn`, `region:The Vale`, `hex:5,7`.",
  relationKind: 'Kind of relation',
  relationTo: 'Tied to',
  relationToPlaceholder: 'a character, place, region…',
  relationValue: 'Its number',
  relate: 'Add',
  unrelate: 'Remove the relation',
  noConditions: 'None',
  readAs: 'Tables and conditions read it as {keys}.',
  min: 'At least {min}.',
  max: 'At most {max}.',
  blocks: 'While someone has it, the party can’t: {list}.',
  /** Names of the generic system's values and conditions (packs name their own). */
  known: { health: 'Health', wounded: 'Wounded' },
  box: '{value} of {max}',
}

import type { Messages } from '@open-tabletop/ui-kit'
import type { en } from './en'

export const es: Messages<typeof en> = {
  name: 'Nombre',
  values: 'Valores',
  conditions: 'Estados',
  tags: 'Etiquetas',
  tagsHelp:
    'Palabras libres sobre el personaje (una vocación, un secreto, un aspecto), separadas por comas. Las condiciones las leen:\n• `characters.kael.tags: oathbound`',
  tagsPlaceholder: 'juramentado, forastero',
  relations: 'Relaciones',
  relationsHelp:
    'A qué está unido este personaje: otro personaje, un lugar, una región, un hex, según los tipos de relación de la hoja (un vínculo, un hogar…), algunos con un número. Las condiciones las leen:\n• `{path}.relations.home: region:The Vale` — el hogar de este personaje\n• `hex.related: kael` — al entrar en un hex al que Kael está unido (él, su región o un lugar en él)\n• `hex.relations.home: kael` — el hogar de Kael, por tipo\nEscribe un nombre de la lista, o una referencia: `character:mara`, `poi:inn`, `region:The Vale`, `hex:5,7`.',
  relationKind: 'Tipo de relación',
  relationTo: 'Unido a',
  relationToPlaceholder: 'un personaje, lugar, región…',
  relationValue: 'Su número',
  relate: 'Añadir',
  unrelate: 'Quitar la relación',
  noConditions: 'Ninguno',
  readAs: 'Las tablas y condiciones lo leen como {keys}.',
  min: 'Como mínimo {min}.',
  max: 'Como máximo {max}.',
  blocks: 'Mientras alguien lo tenga, el grupo no puede: {list}.',
  known: { health: 'Salud', wounded: 'Herido' },
  box: '{value} de {max}',
}

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
  noConditions: 'Ninguno',
  readAs: 'Las tablas y condiciones lo leen como {keys}.',
  min: 'Como mínimo {min}.',
  max: 'Como máximo {max}.',
  blocks: 'Mientras alguien lo tenga, el grupo no puede: {list}.',
  known: { health: 'Salud', wounded: 'Herido' },
  box: '{value} de {max}',
}

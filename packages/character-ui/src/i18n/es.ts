import { vocabulary, type Messages } from '@open-tabletop/ui-kit'
import type { en } from './en'

export const es: Messages<typeof en> = {
  name: 'Nombre',
  values: 'Valores',
  conditions: 'Estados',
  tags: 'Etiquetas',
  tagsHelp:
    'Palabras libres sobre el personaje (una vocación, un secreto, un aspecto), cada una una pastilla (Intro o una coma la añade, × la quita). Las condiciones las leen:\n• `characters.kael.tags: oathbound`',
  tagsPlaceholder: 'juramentado, forastero',
  removeTag: 'Quitar',
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
  madeOf: 'Sale de otros valores; no se cambia a mano ni con efectos: {from}.',
  holdsWhen: 'Se cumple por sí solo mientras {when}; no se pone ni se quita a mano ni con efectos.',
  lastSeen:
    'Lee el mundo (el viaje, la hora, el hex…), así que lo sigue mientras el personaje viaja; fuera de un viaje (en el roster) se queda como estaba la última vez.',
  blocks: 'Mientras alguien lo tenga, el grupo no puede: {list}.',
  less: 'Menos {name}',
  more: 'Más {name}',
  box: '{value} de {max}',
  items: {
    title: 'Objetos',
    help: 'Lo que tiene este personaje, cada cosa con cuántas y los números que su sistema da a los objetos (huecos, peso, usos…), en los lugares que declara su hoja (manos, cinturón, mochila…) o dentro de un contenedor que lleve. Añade uno de los catálogos del sistema, o escribe cualquier nombre para hacerlo a mano. Para moverlo, arrastra su asa (⠿) a un lugar o elige el lugar: solo se ofrecen los lugares donde cabe y, si la hoja dice que un lugar no admite más de su sitio, solo los que tienen sitio libre para él. Mantén Mayús al soltar para mover solo uno de un montón. Las tablas y condiciones los leen:\n• `{path}.items.torch.count: { gte: 1 }` — tiene una antorcha\n• `{path}.items.torch.uses` — los usos de la primera antorcha\n• `{path}.items.tags: light` — lleva algo con la etiqueta light\n• `{path}.places.pack.used` — cuánto de la mochila está ocupado\n• `{path}.carried.used` — cuánto lleva en total\nLos efectos los cambian: `{path}.items.torch: -1` quita una, `+2` da dos (del catálogo si no tiene ninguna).',
    count: 'Cuántos',
    room: '{used} / {room}',
    inside: 'En {name}',
    nowhere: 'En ningún lugar',
    empty: 'Nada',
    moveTo: 'Mover a',
    drag: 'Arrástralo a otro lugar; mantén Mayús al soltarlo para mover solo uno',
    remove: 'Soltarlo',
    add: 'Añadir un objeto',
    addPlaceholder: 'del catálogo, o cualquier nombre',
    addByHand: 'cualquier nombre',
    addButton: 'Añadir',
    byHand: 'Escrito a mano: no está en ningún catálogo.',
    tagsOf: 'Etiquetas: {list}.',
    readAs:
      'Las tablas lo leen como `{path}.items.{id}.count` y sus campos como `{path}.items.{id}.{field}`.',
    spent: 'Se gasta: al llegar a su mínimo se acaba uno, y el siguiente empieza de nuevo.',
    ownPlaces: 'Lugares propios',
    ownPlacesHelp:
      'Lugares que solo tiene este personaje, además de los de su hoja (un tercer brazo, una cola, una silla de montar): un nombre, las etiquetas por las que caben los objetos (`hand`, `head`…) y cuánto sitio, si importa. Al quitar uno, lo que había en él queda en ningún lugar.',
    placeName: 'Nombre',
    placeTags: 'Etiquetas (hand, head…)',
    placeRoom: 'Sitio',
    addPlace: 'Añadir un lugar',
    removePlace: 'Quitar este lugar',
    carried: 'Lleva',
    carriedHelp:
      'Cuánto lleva este personaje en total, frente al sitio que le da su hoja (**Sitio en total**), contado como en los lugares: todo, también lo que va dentro de contenedores. Si la hoja dice que no admite más, nada entra pasado ese sitio. Las tablas lo leen como `{path}.carried.used` y `{path}.carried.room`.',
    loose: 'No tiene sitio: suelta algo, o muévelo a un lugar',
    noRoom: 'No queda sitio para {name}',
  },
  template: {
    description: 'Descripción',
    like: 'Variante de',
    likeHelp:
      'Otra plantilla de este bestiario de la que partir: una variante toma sus valores y objetos (escribiendo encima) y suma sus etiquetas y condiciones.\n• `wolf` — un jefe que es un lobo más grande',
    names: 'Nombres de',
    namesHelp:
      'Una tabla o generador que se tira para el nombre de cada copia. Vacío: el nombre de la plantilla, numerado.\n• `names/generator.folk`',
    behind: 'Al dejarlas atrás',
    behindHelp:
      'Qué pasa con las copias cuando el grupo deja el lugar donde se hicieron: se **quedan** allí o **se van**. Lo decide el sistema; vacío toma lo del bestiario, y si no, se quedan.',
    stay: 'Se quedan',
    leave: 'Se van',
    valuesHelp:
      'Los valores de la hoja con que empieza: un número, o una tirada entre llaves que se resuelve para cada copia. Vacío: el valor por defecto de la hoja (en gris).\n• `{{2d4}}` — dos dados de cuatro caras\n• `{{1d6+2}}`\n• `3`',
    tagsHelp:
      'Palabras por las que lo leen las condiciones, cada una una píldora:\n• `beast`, `leader`',
    tagsPlaceholder: 'beast, leader',
    itemsHelp:
      'Lo que lleva, de los catálogos del sistema, con cuántos (un número o una tirada). Vacío: lo que la hoja da al empezar.\n• `knife` · `1`\n• `ration` · `{{1d2}}`',
    token: 'Ficha',
    tokenHelp: 'Cómo se dibuja una copia en un mapa. Todo opcional.',
    tokenIcon: 'Icono',
    tokenKind: 'Tipo',
    tokenKinds: vocabulary.es.tokenKinds,
    tokenColor: 'Color',
  },
  origin: {
    line: 'Hoja: {sheet} · {system}',
    help: 'Lo que tiene esta hoja (sus valores, estados y tipos de relación) lo decide su sistema: solo se muestra lo que declara. Para añadir o cambiar uno, edita la hoja en la aplicación Systems (un sistema incluido se duplica antes).',
    edit: 'Editar en Systems ↗',
  },
}

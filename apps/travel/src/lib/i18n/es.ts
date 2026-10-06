import type { Messages } from '@open-tabletop/ui-kit'
import type { en } from './en'

export const es: Messages<typeof en> = {
  app: {
    title: 'Travel',
    tagline: 'Juega viajes y crea sistemas de viaje.',
  },
  nav: {
    systems: 'Sistemas de viaje',
    generic: 'Genérico',
    help: 'Ayuda y manual',
    newSystem: 'Nuevo sistema',
    language: 'Idioma',
    problems: '{count} problemas',
    builtIn: 'integrado',
  },
  origin: {
    bundled: 'incluido',
    edited: 'editado',
    personal: 'uso personal',
    user: 'tuyo',
  },
  welcome: {
    title: 'Travel',
    body: 'Elige un sistema de viaje a la izquierda para jugar un viaje con él, o para ver y editar sus reglas: a qué velocidad se va por cada terreno y camino, qué se lleva encima y qué comprobaciones se tiran por el camino. Aquí los viajes no tienen mapa: describes el camino hex a hex. Para viajar sobre un mapa, usa el Hexmapper (modo Jugar) con los mismos sistemas.',
  },
  tabs: { play: 'Jugar', yaml: 'YAML' },
  play: {
    current: 'Tu viaje usa {system}.',
    switch: 'Empezar un viaje con {system}',
    switchConfirm:
      '¿Empezar un viaje nuevo con {system}? Se descartan el viaje actual y su diario.',
    way: 'El camino',
    wayHelp:
      'Un viaje sin mapa: lista los hexes que tienes por delante, con su terreno y etiquetas y si un camino o un río une cada uno con el siguiente. El grupo se dirige al último.',
    hexKm: 'km por hex',
    hex: 'Hex {n}',
    here: 'aquí',
    terrain: 'Terreno',
    tags: 'Etiquetas',
    tagsPlaceholder: 'landmark, haunted…',
    edges: 'Al siguiente hex',
    addHex: 'Añadir un hex',
    remove: 'Quitar',
    destinationHint: 'Añade hexes al camino para ponerte en marcha.',
    arrivedHint: 'Añade más hexes para seguir.',
  },
  edit: {
    readOnly: 'Este sistema viene incluido y es de solo lectura.',
    personalCopy: 'Tu copia se queda en este navegador y es solo para uso personal.',
    makeCopy: 'Editar una copia',
    builtIn:
      'Las reglas Genéricas vienen integradas y no se pueden editar. Crea un sistema nuevo (a la izquierda) para hacer el tuyo a partir de ellas.',
  },
  yaml: { line: 'línea {line}' },
  terrains: {
    steppe: 'Estepa',
    plains: 'Llanura',
    farmland: 'Cultivos',
    forest: 'Bosque',
    jungle: 'Jungla',
    taiga: 'Taiga',
    hills: 'Colinas',
    mountains: 'Montañas',
    badlands: 'Tierras baldías',
    desert: 'Desierto',
    swamp: 'Pantano',
    tundra: 'Tundra',
    snow: 'Nieve',
    volcanic: 'Volcánico',
    lake: 'Lago',
    sea: 'Mar',
  },
  edgeKinds: { road: 'camino', trail: 'sendero', river: 'río' },
  storage: {
    full: 'El almacenamiento del navegador está lleno: exporta tus packs para no perderlos.',
  },
}

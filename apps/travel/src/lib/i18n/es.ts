import { vocabulary } from '@open-tabletop/ui-kit'
import type { Messages } from '@open-tabletop/ui-kit'
import type { en } from './en'

export const es: Messages<typeof en> = {
  app: {
    title: 'Travel',
    tagline: 'Juega viajes sin mapa.',
  },
  nav: {
    showSidebar: 'Mostrar la lista de sistemas',
    hideSidebar: 'Ocultar la lista de sistemas (más espacio)',
    showHelp: 'Mostrar la ayuda',
    hideHelp: 'Ocultar la ayuda (más espacio)',
    systems: 'Sistemas',
    generic: vocabulary.es.terms.genericSystem,
    help: 'Ayuda y manual',
    builtIn: 'integrado',
    editInSystems: 'Editar en Systems →',
    makeSystems: 'Crear o editar sistemas →',
  },
  origin: {
    bundled: 'incluido',
    edited: 'editado',
    personal: 'uso personal',
    user: 'tuyo',
  },
  welcome: {
    title: 'Travel',
    body: 'Elige un sistema a la izquierda para jugar un viaje con él. Aquí los viajes no tienen mapa: describes el camino hex a hex, y el sistema decide a qué velocidad se va por cada terreno y camino, qué se lleva encima y qué comprobaciones se tiran por el camino. Los sistemas se crean y editan en la aplicación Systems; para viajar sobre un mapa, usa el Hexmapper (modo Jugar) con los mismos sistemas.',
  },
  trips: {
    title: 'Viaje',
    help: 'Tus viajes se guardan en este navegador, cada uno con su sistema, su camino y su diario. Elige uno para seguir con él.',
    name: 'Nombre',
    unnamed: '{system}, día {day}',
    new: 'Otro viaje',
    delete: 'Borrar',
    deleteConfirm: '¿Borrar el viaje «{trip}» y su diario?',
  },
  play: {
    current: 'El viaje abierto usa {system}.',
    switch: 'Empezar un viaje con {system}',
    switchConfirm: '¿Empezar este viaje de nuevo con {system}? Se descarta su diario.',
    way: 'El camino',
    wayHelp:
      'Un viaje sin mapa: lista los hexes que tienes por delante, cada uno con su terreno y etiquetas y si un camino o un río lo une con el siguiente. El grupo se dirige al último.\n• `plains`, luego `forest` con etiqueta `haunted`, luego `hills` por `road`\nAñade más hexes al final para seguir.',
    hexKm: 'km por hex',
    hex: 'Hex {n}',
    here: 'aquí',
    terrain: vocabulary.es.terms.terrain,
    tags: vocabulary.es.terms.tags,
    tagsPlaceholder: 'landmark, haunted…',
    edges: 'Al siguiente hex',
    numberHelp:
      'Los hexes en orden: el grupo empieza en el 1 y va hacia el último. Los hexes ya recorridos no se pueden cambiar; añade más al final para seguir.',
    terrainHelp:
      'Lo rápido que se cruza el hex (la velocidad que da el sistema a ese terreno, y si se puede cruzar) y lo que las tablas ven como terreno:\n• `forest` — a la mitad en la mayoría de sistemas; `terrain: forest` en una condición\n• `lake` — agua: solo en barca, salvo helado',
    tagsHelp:
      'Palabras que marcan el hex, separadas por comas, para las comprobaciones y tablas que las buscan:\n• `landmark` — `tags: landmark` en una condición\n• `shrine, haunted`\nLas sugerencias son las etiquetas que usan los packs cargados; lo que hace cada una depende del sistema (mira su página en el manual).',
    edgesHelp:
      'Si un camino, sendero o río une este hex con el siguiente. Lo que eso hace depende del sistema:\n• los caminos suelen ser más rápidos (`road` × `1.5`)\n• un sistema puede saltarse algunas comprobaciones en ellos (**Salvo si** `edges: road`)',
    addHex: 'Añadir un hex',
    remove: 'Quitar',
    destinationHint: 'Añade hexes al camino para ponerte en marcha.',
    arrivedHint: 'Añade más hexes para seguir.',
  },
  terrains: vocabulary.es.terrains,
  edgeKinds: vocabulary.es.pathKinds,
  storage: {
    full: 'El almacenamiento del navegador está lleno: exporta tus packs para no perderlos.',
  },
}

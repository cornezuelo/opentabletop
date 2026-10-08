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
  storage: {
    full: 'El almacenamiento del navegador está lleno: exporta tus packs para no perderlos.',
  },
}

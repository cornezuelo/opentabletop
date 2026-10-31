import { vocabulary, type Messages } from '@open-tabletop/ui-kit'
import type { en } from './en'

export const es: Messages<typeof en> = {
  app: {
    title: vocabulary.es.apps.travel,
    tagline: 'Juega viajes sin mapa.',
  },
  nav: {
    showSidebar: 'Mostrar la lista de sistemas',
    hideSidebar: 'Ocultar la lista de sistemas (más espacio)',
    showHelp: 'Mostrar la ayuda',
    hideHelp: 'Ocultar la ayuda (más espacio)',
    systems: 'Sistemas',
    help: 'Ayuda y manual',
    editInSystems: 'Editar en Sistemas →',
    makeSystems: 'Crear o editar sistemas →',
  },
  origin: {
    bundled: 'incluido',
    edited: 'editado',
    personal: 'uso personal',
    user: 'tuyo',
  },
  welcome: {
    title: vocabulary.es.apps.travel,
    body: 'Elige un sistema a la izquierda para jugar un viaje con él. Aquí los viajes no tienen mapa: describes el camino casilla a casilla, y el sistema decide a qué velocidad se va por cada terreno y camino, qué se lleva encima y qué comprobaciones se tiran por el camino. Los sistemas se crean y editan en la aplicación Sistemas; para viajar sobre un mapa, usa Mapa (modo Jugar) con los mismos sistemas.',
  },
  inCampaign: { missing: 'El viaje {id} no está en este navegador.' },
  storage: {
    full: 'El almacenamiento del navegador está lleno: exporta tus packs para no perderlos.',
  },
}

import { vocabulary } from '@open-tabletop/ui-kit'
import type { Messages } from '@open-tabletop/ui-kit'
import type { en } from './en'

export const es: Messages<typeof en> = {
  app: {
    title: 'Campaign',
    tagline: 'Lo que pasa en tu mundo.',
  },
  nav: {
    showSidebar: 'Mostrar la lista de campañas',
    hideSidebar: 'Ocultar la lista de campañas (más espacio)',
    showHelp: 'Mostrar la ayuda',
    hideHelp: 'Ocultar la ayuda (más espacio)',
    help: 'Ayuda y manual',
    campaigns: 'Campañas',
    search: 'Buscar…',
    newCampaign: 'Nueva campaña',
    empty: 'Aún no hay campañas.',
    noMatch: 'Ninguna campaña coincide.',
    untitled: 'Campaña sin nombre',
    makeSystems: 'Crear o editar sistemas →',
  },
  welcome: {
    title: 'Campaign',
    body: 'Una campaña es el mundo que comparten tus mapas y viajes: una fecha y un calendario, los eventos y relojes de progreso por venir, lo que ha pasado (su cronología), las facciones y los mazos del Oráculo. Cada mapa del Hexmapper y cada viaje de Travel está en una; un mapa o viaje nuevo empieza una campaña propia, y se une a otra desde sus ajustes.\n\nElige una campaña a la izquierda, o crea una con **Nueva campaña** y añádele mapas y viajes.',
  },
  new: {
    title: 'Nueva campaña',
    name: 'Nombre',
    namePlaceholder: 'El largo invierno',
    system: vocabulary.es.terms.system,
    systemHelp:
      'El sistema de juego con el que se juegan sus mapas y viajes: su calendario nombra los días, y sus relojes de progreso, su clima y sus facciones son los de la campaña. Un mapa o viaje que se une a la campaña juega con él.',
    create: 'Crear',
  },
  campaign: {
    name: 'Nombre',
    nameHelp:
      'Cómo la llamas; la nombra en todas las aplicaciones (**Ajustes del mapa → Campaña** del Hexmapper, la sala del viaje de Travel, el Oráculo).',
    system: vocabulary.es.terms.system,
    systemHelp:
      'El sistema de juego con el que se juegan sus mapas y viajes: su calendario, sus relojes de progreso, su clima y sus facciones. Se elige en los ajustes de un mapa (o al empezar un viaje en ella), ya que también es de ellos.',
    noSystem: 'El de por defecto (el de Core)',
    editSystem: 'Editar el sistema en Systems →',
    notes: 'Notas',
    notesHelp:
      'Su página en tu aplicación de notas (una ruta como `Campañas/El largo invierno`); **↗** la abre. La aplicación de notas se elige en **Preferencias**. Su historia y su trasfondo viven allí: una campaña guarda solo aquello con lo que juegan las reglas.',
    playing: 'Hay un viaje en marcha en ella: «{name}» ({app}).',
    playingHelp:
      'En una campaña hay un viaje en marcha a la vez, ya que su tiempo es el de la campaña. Si avanzas el tiempo aquí, ese viaje espera hasta la nueva fecha cuando dé su siguiente paso.',
    open: 'Abrir',
    delete: 'Borrar',
    confirmDelete:
      '¿Borrar la campaña «{name}»? Se olvidan su reloj del mundo, su cronología, sus facciones y el estado de su Oráculo. No hay nada en ella.',
    cantDelete: 'Hay mapas o viajes en esta campaña: llévalos a otra (o bórralos) antes.',
    deleted: 'Campaña «{name}» borrada.',
    missing: 'Esta campaña no se guarda en este navegador.',
    noRewindTrip:
      'El reloj no puede volver atrás con un viaje en marcha en la campaña: el tiempo de un viaje nunca retrocede.',
  },
  tabs: {
    label: 'La campaña',
    world: 'Mundo',
    timeline: 'Cronología',
    places: 'Mapas y viajes',
  },
  world: {
    help: 'El reloj de la campaña: la fecha de hoy, eventos que programas (una fiesta, un ataque, un plazo), relojes de progreso y el clima del mundo. Es el mismo reloj en todos los mapas y viajes de la campaña: moverlo aquí lo mueve allí.',
  },
  timeline: {
    none: 'El reloj del mundo aún no está en marcha: ponlo en marcha en **Mundo**.',
  },
  places: {
    maps: 'Mapas',
    mapsHelp:
      'Los mapas del Hexmapper (su biblioteca en este navegador) que están en esta campaña. Un mapa se une a otra campaña en sus **Ajustes del mapa → Campaña**.',
    trips: 'Viajes',
    tripsHelp:
      'Los viajes de Travel (sin mapa) en esta campaña. Un viaje se une a otra campaña en su sala del viaje (**Campaña**). El viaje de un mapa se juega en su mapa.',
    noMaps: 'Ningún mapa.',
    noTrips: 'Ningún viaje.',
    untitledMap: 'Mapa sin nombre',
    untitledTrip: 'Viaje sin nombre',
    open: 'Abrir ↗',
    going: 'en marcha',
    goingHelp: 'El viaje en marcha en la campaña ahora (uno a la vez).',
    howTo:
      'Para añadir un mapa, ábrelo en el Hexmapper y elige esta campaña en **Ajustes del mapa → Campaña**; para añadir un viaje, elígela en la sala del viaje de Travel.',
    newMap: 'Abrir el Hexmapper ↗',
    newTrip: 'Abrir Travel ↗',
  },
  storage: {
    full: 'El almacenamiento del navegador está lleno: puede que no se guarden packs ni campañas.',
  },
}

import { campaignTexts } from '@open-tabletop/campaign-ui'
import { vocabulary } from '@open-tabletop/ui-kit'
import type { Messages } from '@open-tabletop/ui-kit'
import type { en } from './en'

export const es: Messages<typeof en> = {
  app: {
    title: 'Campaign',
    tagline: 'Lo que pasa en tu mundo.',
  },
  nav: {
    loading: 'Leyendo vuestras campañas…',
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
    untitled: vocabulary.es.campaign.untitled,
    makeSystems: 'Crear o editar sistemas →',
  },
  new: {
    title: 'Nueva campaña',
    name: 'Nombre',
    namePlaceholder: 'El largo invierno',
    system: vocabulary.es.terms.system,
    systemHelp:
      'El sistema de juego con el que se juegan sus mapas y viajes: su calendario nombra los días, y sus relojes de progreso, su clima y sus facciones son los de la campaña. Un mapa o viaje que se une a la campaña juega con él.',
    firstTitle: 'Empieza tu campaña',
    firstIntro:
      'Una campaña es el mundo que comparten tus mapas y viajes: su fecha y su calendario, los eventos y relojes de progreso por venir, lo que ha pasado, sus facciones y los mazos del Oráculo. Dale un nombre y el sistema de juego con el que se juega; los mapas, viajes y personajes llegan después.',
    clock: 'Poner en marcha el reloj del mundo',
    clockHelp:
      'La fecha de la campaña, compartida por sus mapas y viajes: avanza según viajan, o a mano. Sin marcar, se puede poner en marcha después en **Mundo**.\n• El día en que empieza es un día del calendario del sistema',
    start: 'Empieza el',
    factions: 'Traer sus facciones ({count})',
    factionsHelp:
      'Los poderes que declara el sistema (`kind: factions`): sus hojas llegan ahora, y la tierra con que empieza cada una llega con cada mapa que entre en la campaña. Sin marcar, se pueden traer después en **Facciones**.',
    without: '¿Solo tirar dados o llevar personajes? Abre',
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
    more: 'Más',
    delete: 'Borrar',
    confirmDelete:
      '¿Borrar la campaña «{name}»? Se olvidan su reloj del mundo, su cronología, sus facciones y el estado de su Oráculo. No hay nada en ella.',
    cantDelete:
      'En esta campaña: {list}. Llévalos a otra campaña (o bórralos) antes: mira **Mapas** y **Viajes**.',
    deleted: 'Campaña «{name}» borrada.',
    missing: 'Esta campaña no se guarda en este navegador.',
    noRewindTrip:
      'El reloj no puede volver atrás con un viaje en marcha en la campaña: el tiempo de un viaje nunca retrocede.',
  },
  whatItDoes: campaignTexts.es.whatItDoes,
  factions: {
    intro:
      'Los poderes de este mundo: la hoja de cada uno, que guarda la campaña, y la tierra que tiene en cada uno de sus mapas. Abre uno para ver y cambiar su hoja.',
    help: campaignTexts.es.factions.help,
    landOn: 'Su tierra en',
    landOnHelp:
      'El mapa de la campaña cuya tierra ves aquí, y donde los turnos del mundo ganan y pierden terreno: **Turno del mundo** abajo, y los turnos que llegan por sí solos según avanza el reloj del mundo en **Mundo**. Cada mapa guarda su propia tierra; las hojas son de la campaña, las mismas en todos los mapas.\nPor defecto, el mapa del viaje en curso; si no, el primero. La tierra se pinta a mano en el mapa, en el Hexmapper (**Pintar en el Hexmapper ↗**, y luego **Mundo → Facciones**).\nSi ese mapa está abierto en el Hexmapper, coge la tierra nueva al momento.',
    paintIn: 'Pintar en el Hexmapper ↗',
    minimap: 'La tierra de las facciones en {map}',
    bringLand: 'Darles aquí su tierra inicial',
    bringLandHelp:
      'Ninguna facción tiene aún tierra en este mapa (entró en la campaña después de que llegaran): cada una recibe la tierra con la que su sistema dice que empieza aquí, todos los hexes de sus regiones iniciales por nombre (y sus hexes iniciales, si este es el mapa para el que son). Sus hojas no cambian.',
    noMaps:
      'No hay ningún mapa en esta campaña: los turnos del mundo cambian las hojas de las facciones y los relojes de progreso, pero no la tierra. Añade un mapa desde el Hexmapper (**Ajustes del mapa → Campaña**).',
    none: 'El sistema de la campaña tiene facciones, aún no en esta campaña: tráelas, cada una con la tierra con la que el sistema dice que empieza en el mapa elegido.',
    noneNoMaps:
      'El sistema de la campaña tiene facciones, aún no en esta campaña: tráelas. Sin ningún mapa en la campaña todavía, solo llegan sus hojas; a un mapa que entre se le da su tierra aquí.',
    bring: campaignTexts.es.factions.bring,
    noSystem: 'El sistema de la campaña no declara facciones.',
    missing:
      'Estas facciones vienen de «{system}», un sistema que no está cargado en este navegador: sus hojas se guardan, pero no se pueden mostrar ni jugar turnos hasta que lo esté.',
    remove: 'Quitar las facciones de la campaña',
    confirmRemove:
      '¿Quitar las facciones de esta campaña? Se olvidan sus hojas, y su tierra en todos sus mapas.',
  },
  tabs: {
    label: 'La campaña',
    overview: 'Resumen',
    world: 'Mundo',
    maps: 'Mapas',
    trips: 'Viajes',
    characters: 'Personajes',
    factions: campaignTexts.es.factions.title,
    timeline: 'Cronología',
  },
  timeline: {
    none: 'El reloj del mundo aún no está en marcha: ponlo en marcha en **Mundo**.',
  },
  places: {
    mapsIntro:
      'Los mapas del Hexmapper (su biblioteca en este navegador) que están en esta campaña: sus viajes y tokens se juegan en su mundo. **Abrir ↗** abre uno allí.',
    tripsIntro:
      'Los viajes de Travel (sin mapa) que están en esta campaña: su tiempo es el de la campaña. El viaje de un mapa se juega en su mapa, en **Mapas**.',
    new: {
      maps: 'Nuevo mapa en esta campaña ↗',
      trips: 'Nuevo viaje en esta campaña ↗',
    },
    add: {
      maps: 'Añadir un mapa existente…',
      trips: 'Añadir un viaje existente…',
    },
    addTitle: {
      maps: 'Los demás mapas de este navegador',
      trips: 'Los demás viajes de este navegador',
    },
    addHelp: {
      maps: 'Un mapa está en una campaña a la vez. **Traerlo** lo abre en el Hexmapper y lo mueve aquí, como hace su **Ajustes del mapa → Campaña**: si su campaña tiene un mundo propio (un reloj, facciones), se pregunta cuál se queda. La campaña que deja se borra si no queda nada en ella.',
      trips:
        'Un viaje está en una campaña a la vez. **Traerlo** lo abre en Travel y lo mueve aquí, como hace la **Campaña** de su sala del viaje: si su campaña tiene un mundo propio, se pregunta cuál se queda. Su tiempo pasa a ser el de esta campaña en su siguiente paso.',
    },
    none: {
      maps: 'Aún no hay ningún mapa en esta campaña.',
      trips: 'Aún no hay ningún viaje en esta campaña.',
    },
    ownCampaign: 'una campaña propia',
    bring: 'Traerlo ↗',
    untitledMap: 'Mapa sin título',
    untitledTrip: 'Viaje sin título',
    open: 'Abrir ↗',
    continue: 'Seguir ↗',
    going: 'en curso',
    goingHelp: 'El viaje en curso en la campaña ahora (uno a la vez).',
  },
  cast: {
    intro:
      'Los personajes de tu plantel (la aplicación Characters) que juegan en esta campaña: en el grupo de sus viajes, entre los presentes, en los tokens de sus mapas o en ella sin viaje (una partida rápida: **En una campaña** en su página de Characters; un viaje nuevo de la campaña ofrece su grupo). Cada uno está en un sitio a la vez.',
    none: 'Aún no juega en esta campaña ningún personaje del plantel.',
    onTrip: 'en «{place}»',
    onToken: 'un token en «{place}»',
    noTrip: 'sin viaje',
    roster: 'Abrir el plantel ↗',
  },
  overview: {
    today: 'Hoy',
    going: 'En curso',
    goingHelp:
      'El viaje en curso en la campaña: uno a la vez, porque su tiempo es el de la campaña. **Seguir ↗** lo abre donde se juega.',
    nothingGoing: 'No hay ningún viaje en curso.',
    next: 'Lo próximo',
    clocks: 'Relojes de progreso',
    latest: 'Últimamente',
    maps: 'Mapas: {count}',
    trips: 'Viajes: {count}',
    cast: 'Personajes: {count}',
    factions: 'Facciones: {count}',
  },
  storage: {
    full: 'El almacenamiento del navegador está lleno: puede que no se guarden packs ni campañas.',
  },
}

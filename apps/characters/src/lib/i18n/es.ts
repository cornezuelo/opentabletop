import { vocabulary, type Messages } from '@open-tabletop/ui-kit'
import type { en } from './en'

export const es: Messages<typeof en> = {
  app: {
    title: 'Characters',
    tagline: 'Tus personajes, de cualquier sistema.',
  },
  nav: {
    showSidebar: 'Mostrar la lista de personajes',
    hideSidebar: 'Ocultar la lista de personajes (más espacio)',
    showHelp: 'Mostrar la ayuda',
    hideHelp: 'Ocultar la ayuda (más espacio)',
    help: 'Ayuda y manual',
    characters: 'Personajes',
    search: 'Buscar…',
    newCharacter: 'Nuevo personaje',
    import: 'Importar…',
    importTip:
      'Añade los personajes de un fichero .otd.json: uno exportado aquí, o el grupo de un mapa.',
    otherSheets: 'Otras hojas',
    empty: 'Aún no hay personajes.',
    noMatch: 'Ningún personaje coincide.',
    makeSystems: 'Crear o editar sistemas →',
  },
  welcome: {
    title: 'Characters',
    body: 'Tu plantel: los personajes que guarda este navegador, de cualquier sistema. Crea uno con **Nuevo personaje**, o guarda uno de un viaje (**Guardar en el plantel** en su ficha, en Travel o en el Hexmapper). Un personaje del plantel puede viajar en cualquier mapa o viaje jugado con su sistema, en uno a la vez, y lo que le pase allí vuelve aquí. Cada uno se hace con la hoja de personajes de su sistema, que se edita en la aplicación Systems.',
  },
  new: {
    title: 'Nuevo personaje',
    system: 'Sistema',
    systemHelp:
      'El sistema con cuya hoja de personajes se hace: decide sus valores, contadores y estados, y los viajes a los que puede unirse (los jugados con un sistema que tenga la misma hoja). Solo salen los sistemas con hoja de personajes.',
    name: 'Nombre',
    namePlaceholder: 'Viejo Tobin',
    create: 'Crear',
    noSystems:
      'Ningún sistema tiene aún hoja de personajes: crea una en Systems (su pestaña **Hoja**).',
  },
  character: {
    sheet: 'Hoja',
    sheetHelp:
      'La hoja con la que está hecho (`pack/id`): sus valores, contadores, estados y tipos de relación. Una hoja es de su sistema, y se edita en la aplicación Systems.',
    editSheet: 'Editar la hoja en Systems →',
    missingSheet:
      'Su hoja ({sheet}) no está cargada: sus valores se muestran tal cual, y no se pueden cambiar hasta que vuelva su pack.',
    id: 'Id',
    idHelp:
      'Cómo lo alcanzan las reglas y las tablas cuando viaja: `characters.{id}.values.health`, y las relaciones con él: `character:{id}`. Sale del nombre con el que se creó, y no cambia.',
    notes: 'Notas',
    notesHelp:
      'Su página en tu aplicación de notas (su ruta): su historia, su aspecto, lo que sabe. ↗ la abre; la aplicación se elige en Preferencias (⚙).',
    notesPlaceholder: 'Personajes/{name}',
    where: 'Dónde juega',
    whereHelp:
      'Un personaje viaja en un sitio a la vez: el viaje de un mapa en el Hexmapper, un viaje en Travel o un token en un mapa. Lo que le pasa allí se vuelca aquí tras cada paso; lo que cambies aquí, el viaje lo encuentra la próxima vez que se abra. Al lado sale la campaña en la que está ese sitio, con un enlace a ella en la aplicación Campaign.',
    nowhere:
      'Solo en el plantel. Para llevarlo de viaje, abre la pestaña **Grupo** del viaje y elígelo en **Del plantel**.',
    playsIn: '{place}, en {app}',
    playsAsToken: 'un token en {place}, en {app}',
    inCampaign: 'en la campaña {campaign}',
    untitledCampaign: 'una campaña sin nombre',
    openCampaign: vocabulary.es.campaign.open,
    open: 'Abrir',
    duplicate: 'Duplicar',
    duplicateTip: 'Una copia con sus valores, solo en el plantel.',
    copyName: '{name} (copia)',
    export: 'Exportar',
    exportTip: 'Lo descarga como fichero .otd.json, para guardarlo o dárselo a alguien.',
    exportAll: 'Exportar todos',
    delete: 'Borrar',
    confirmDelete: '¿Borrar a {name} del plantel?',
    confirmDeletePlaying:
      '¿Borrar a {name} del plantel? Juega en {place}: ese viaje conserva su copia, ya sin enlazar con el plantel.',
    deleted: '{name}, borrado.',
    notFound: 'Este personaje no está en el plantel (borrado, o en otro navegador).',
  },
  imported: {
    some: 'Importados: {names}.',
    none: 'Ese fichero no tiene personajes hechos con una hoja.',
    broken: 'Ese fichero no se puede leer como OTD (.otd.json).',
  },
  storage: {
    full: 'El almacenamiento del navegador está lleno: exporta tus packs para no perderlos.',
  },
}

import { vocabulary, type Messages } from '@open-tabletop/ui-kit'
import type { en } from './en'

export const es: Messages<typeof en> = {
  app: {
    title: 'Characters',
    tagline: 'Tus personajes, de cualquier sistema.',
  },
  nav: {
    showSidebar: 'Mostrar las listas',
    hideSidebar: 'Ocultar las listas (más espacio)',
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
    bestiary: 'Bestiario',
    lists: 'Personajes o plantillas',
    newTemplate: 'Nueva plantilla',
    noTemplates: 'Ningún sistema tiene bestiario.',
    tags: 'Filtrar por etiqueta',
    clearTags: 'Mostrar todos, tengan las etiquetas que tengan',
    makeSystems: 'Crear o editar sistemas →',
  },
  welcome: {
    title: 'Characters',
    body: 'Tu plantel: los personajes que guarda este navegador, de cualquier sistema. Crea uno con **Nuevo personaje**, o guarda uno de un viaje (**Guardar en el plantel** en su ficha, en Travel o en el Hexmapper). Un personaje del plantel puede viajar en cualquier mapa o viaje jugado con su sistema, en uno a la vez, y lo que le pase allí vuelve aquí. Cada uno se hace con la hoja de personajes de su sistema, que se edita en la aplicación Systems.',
  },
  bestiary: {
    title: 'Bestiario',
    help: 'Las criaturas y clases de gente que un sistema puede crear, como **plantillas**: cada una un personaje de una hoja cuyas tiradas (`{{2d4}}`) se hacen de nuevo para cada copia. **Crear un personaje** mete uno en el plantel, con nombre del generador de la plantilla si tiene uno (un PNJ que vuelve); **Crear copias** mete varios (una pelea en la mesa). Las tablas y los efectos las hacen en un viaje (`present.<id>: 3`). Una plantilla de un pack incluido es de solo lectura: **Editar una copia** crea un pack tuyo donde cambiarla; lo que cambies solo afecta a las copias que se hagan después.',
    inRoster: 'En el plantel',
    inRosterHelp:
      'Personajes hechos a partir de esta plantilla, guardados en el plantel como cualquier otro: cada uno con sus propias tiradas (sus valores se tiran de nuevo para cada uno), sus etiquetas y lo que lleva, y recordando la plantilla de la que viene (**Hecho a partir de**).\n• **Crear un personaje** — uno, con nombre de los **Nombres de** de la plantilla si tiene (Hrolf, un bandido que vuelve), y se abre para editarlo\n• **Crear copias** — ese número de una vez (cuatro lobos para la pelea de esta noche), con nombre igual o numerados (_Lobo gris 1_, _2_…)\nDebajo sale cuántos hay en el plantel, con **Borrarlos todos** para quitarlos cuando acabe el encuentro.',
    makeOne: 'Crear un personaje',
    or: 'o',
    makeMany: 'Crear copias',
    copies: '{count} hechos a partir de ella en el plantel.',
    clear: 'Borrarlos todos',
    confirmClear: '¿Borrar del plantel los {count} personajes hechos a partir de «{name}»?',
    confirmClearPlaying:
      '¿Borrar del plantel los {count} personajes hechos a partir de «{name}»? {playing} juegan en algún sitio: sus viajes o tokens conservan su propia copia, ya sin enlazar.',
    cleared: 'Borrados {count} × {name} del plantel.',
    count: 'Cuántas',
    made: 'Hechas {count} × {name}.',
    cantMake: 'No se pueden hacer estas copias: la plantilla no tiene hoja.',
    readOnly: 'Esta plantilla está en el pack incluido «{pack}», que es de solo lectura.',
    delete: 'Borrar la plantilla',
    confirmDelete: '¿Borrar la plantilla «{name}»? Las copias ya hechas conservan lo que tienen.',
    none: 'Aún no hay ningún sistema con bestiario. Crea uno en la aplicación Systems (su pestaña **Bestiario**).',
    intro:
      'Las criaturas y clases de gente que tus sistemas pueden crear, como **plantillas**: cada una un personaje de una hoja cuyas tiradas (`{{2d4}}`) se hacen de nuevo para cada copia. Elige una en **Bestiario**, a la izquierda, por sistema y hoja; búscala, o fíltrala por sus etiquetas. De una plantilla se hacen copias en el plantel, y las tablas y los efectos las hacen en un viaje (`present.<id>: 3`).',
    notFound:
      'Esta plantilla no está en ningún bestiario cargado: puede que se quitara su pack o se borrara la plantilla.',
    noSheet: 'No se encuentra su hoja, así que no se puede mostrar.',
  },
  newTemplate: {
    title: 'Nueva plantilla',
    systemHelp:
      'El sistema en cuyo bestiario va. Solo salen los sistemas con un bestiario en un pack tuyo: para añadir a uno incluido, abre una de sus plantillas y pulsa antes **Editar una copia**.',
    namePlaceholder: 'Oso de las cavernas',
    none: 'Aún no hay ningún sistema con un bestiario en un pack tuyo. Abre una plantilla del bestiario al que quieras añadir y pulsa **Editar una copia**, o crea un bestiario en la aplicación Systems (su pestaña **Bestiario**).',
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
    madeFrom: 'Hecho a partir de',
    madeFromHelp:
      'La plantilla de un bestiario de la que se copió: sus números se tiraron al hacerlo y, desde entonces, es un personaje como cualquier otro. Cambiar la plantilla después no lo cambia.',
    openTemplate: 'Abrir en el Bestiario',
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
      'Solo en el plantel. Para llevarlo de viaje, elígelo en **Del plantel** en la pestaña **Grupo** del viaje: con el grupo, o en **Aquí** entre los presentes (una criatura, un PNJ que se cruza en el camino); o dáselo a un token de un mapa (su **Hoja**).',
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

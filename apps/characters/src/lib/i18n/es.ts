import { vocabulary, type Messages } from '@open-tabletop/ui-kit'
import type { en } from './en'

export const es: Messages<typeof en> = {
  app: {
    title: vocabulary.es.apps.characters,
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
    newTemplate: 'Nueva plantilla ↗',
    noTemplates: 'Ningún sistema tiene bestiario.',
    tags: 'Filtrar por etiqueta',
    clearTags: 'Mostrar todos, tengan las etiquetas que tengan',
    campaign: 'Campaña',
    campaignHelp:
      'Qué personajes muestra la lista, según dónde juegan:\n• la campaña en la que juegas (**Jugando** arriba, por defecto) — los de sus viajes y los de las fichas de sus mapas\n• **Todas las campañas** — todo el plantel\n• **Sin campaña** — los que no juegan en ninguna parte',
    allCampaigns: 'Todas las campañas',
    noCampaign: 'Sin campaña',
    noneInCampaign:
      'Ningún personaje juega en ella: elige «Todas las campañas» para ver todo el plantel.',
    makeSystems: 'Crear o editar sistemas →',
  },
  welcome: {
    title: vocabulary.es.apps.characters,
    body: 'Tu plantel: los personajes que guarda este navegador, de cualquier sistema. Crea uno con **Nuevo personaje**, o guarda uno de un viaje (**Guardar en el plantel** en su ficha, en Viajes o en Mapa). Un personaje del plantel puede viajar en cualquier mapa o viaje jugado con su sistema, en uno a la vez, y lo que le pase allí vuelve aquí. Cada uno se hace con la hoja de personajes de su sistema, que se edita en la aplicación Sistemas.',
  },
  bestiary: {
    title: 'Bestiario',
    help: 'Las criaturas y clases de gente que un sistema puede crear, como **plantillas**: cada una un personaje de una hoja cuyas tiradas (`{{2d4}}`) se hacen de nuevo para cada copia. **Crear un personaje** mete uno en el plantel, con nombre del generador de la plantilla si tiene uno (un PNJ que vuelve); **Crear copias** mete varios (una pelea en la mesa). Las tablas y los efectos las hacen en un viaje (`present.<id>: 3`). Aquí se ven las plantillas tal cual, y se editan en la aplicación Sistemas (**Editar en Sistemas ↗**): lo que cambies allí solo afecta a las copias que se hagan después.',
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
    edit: 'Editar en Sistemas ↗',
    editHelp:
      'Las plantillas son parte de su sistema, como sus hojas, así que se editan en la aplicación Sistemas, en su pestaña **Bestiario**: este enlace la abre en esta plantilla. Las copias ya hechas no cambian con ella: cada una es un personaje del plantel, que se edita aquí como cualquier otro.\n• Allí un sistema incluido es de solo lectura: antes, **Editar una copia**',
    none: 'Aún no hay ningún sistema con bestiario. Crea uno en la aplicación Sistemas (su pestaña **Bestiario**): **Nueva plantilla ↗** te lleva allí.',
    intro:
      'Las criaturas y clases de gente que tus sistemas pueden crear, como **plantillas**: cada una un personaje de una hoja cuyas tiradas (`{{2d4}}`) se hacen de nuevo para cada copia. Elige una en **Bestiario**, a la izquierda, por sistema y hoja; búscala, o fíltrala por sus etiquetas. De una plantilla se hacen copias en el plantel, y las tablas y los efectos las hacen en un viaje (`present.<id>: 3`).',
    notFound:
      'Esta plantilla no está en ningún bestiario cargado: puede que se quitara su pack o se borrara la plantilla.',
    noSheet: 'No se encuentra su hoja, así que no se puede mostrar.',
  },
  new: {
    title: 'Nuevo personaje',
    system: 'Sistema',
    systemHelp:
      'El sistema con cuya hoja de personajes se hace: decide sus valores, contadores y estados, y los viajes a los que puede unirse (los jugados con un sistema que tenga la misma hoja). Solo salen los sistemas con hoja de personajes.',
    name: 'Nombre',
    namePlaceholder: 'Viejo Tobin',
    sheet: 'Hoja',
    sheetHelp:
      'Qué hacer: un personaje, con la hoja de los personajes de su sistema, o un **grupo**, con su hoja de grupo (lo que es de todo el grupo: moral, provisiones…). Un grupo tiene **miembros**, personajes del plantel que eliges después de hacerlo; llevado a un viaje, van con él.',
    aParty: 'un grupo',
    create: 'Crear',
    noSystems:
      'Ningún sistema tiene aún hoja de personajes: crea una en Sistemas (su pestaña **Hoja**).',
  },
  character: {
    sheet: 'Hoja',
    sheetHelp:
      'La hoja con la que está hecho (`pack/id`): sus valores, contadores, estados y tipos de relación. Una hoja es de su sistema, y se edita en la aplicación Sistemas.',
    editSheet: 'Editar la hoja en Sistemas →',
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
      'Un personaje viaja en un sitio a la vez: el viaje de un mapa en la aplicación Mapa, un viaje en la aplicación Viajes o un token en un mapa. Lo que le pasa allí se vuelca aquí tras cada paso; lo que cambies aquí, el viaje lo encuentra la próxima vez que se abra. Al lado sale la campaña en la que está ese sitio, con un enlace a ella en la aplicación Campaña.',
    nowhere:
      'Solo en el plantel. Para llevarlo de viaje, elígelo en **Del plantel** en la pestaña **Grupo** del viaje: con el grupo, o en **Aquí** entre los presentes (una criatura, un PNJ que se cruza en el camino); o dáselo a un token de un mapa (su **Hoja**).',
    playsIn: '{place}, en {app}',
    playsAsToken: 'un token en {place}, en {app}',
    inCampaign: 'en la campaña {campaign}',
    untitledCampaign: 'una campaña sin nombre',
    inCampaignOnly: 'en la campaña {campaign}, sin viaje',
    campaign: 'En una campaña',
    campaignHelp:
      'Una partida rápida: juega en una campaña sin viaje ni token. La pestaña **Personajes** de la campaña lo enseña, la lista de aquí lo encuentra bajo esa campaña, y un viaje nuevo de la campaña ofrece su grupo (un grupo se lleva a sus miembros).\nSigue estando en un solo sitio a la vez: meterlo en una campaña lo saca del viaje o token en el que juega (pregunta antes; ese sitio conserva su copia, ya sin enlazar). Para tener a la misma gente en dos campañas, **Duplícalos**.',
    noCampaign: 'Ninguna',
    leaveConfirm:
      'Esto se los lleva de donde juegan ahora: {list}. ¿Seguir? Esos sitios conservan sus copias, ya sin enlazar con el plantel.',
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
  party: {
    members: 'Miembros',
    membersHelp:
      'Los personajes del plantel que están en este grupo, en orden. Llevado a un viaje (la pestaña **Grupo** del viaje, **Del plantel** en **El grupo**), van con él, y su hoja es el grupo del viaje. Un personaje está en un solo grupo a la vez.\nMientras el grupo juega en algún sitio, ese viaje lleva la lista: sus personajes enlazados son sus miembros.',
    none: 'Aún no tiene miembros.',
    nowhere:
      'Solo en el plantel. Para llevarlo de viaje, elígelo en **Del plantel** en la ficha de **El grupo**, en la pestaña **Grupo** del viaje: sus miembros van con él.',
    add: 'Añadir un miembro',
    remove: 'Sacar del grupo',
    playingNote:
      'Juega en {place}: sus miembros son los personajes de ese viaje, y se cambian allí.',
    moveConfirm: '{name} está en {party}. ¿Pasarlo a este grupo?',
    inParty: 'Grupo',
    inPartyHelp:
      'El grupo en el que está este personaje: va con él a los viajes. Un personaje está en un solo grupo a la vez.',
    duplicateTip:
      'Una copia con sus valores y objetos, solo en el plantel, sin miembros (un personaje está en un solo grupo a la vez).',
    split: 'Dividir el grupo',
    splitTip: 'Algunos miembros siguen su camino, como un grupo nuevo.',
    splitTitle: 'Dividir {name}',
    splitHelp:
      'Marca quién se va. El grupo nuevo empieza como cualquier grupo nuevo de su hoja (sus valores iniciales, nada más), y este se queda con todo: nada sale de la nada. Di qué tiene cada lado de cada valor y objeto; **=** le da al nuevo lo mismo que a este, **½** la mitad a cada uno.',
    newName: 'Nombre del grupo nuevo',
    newNameValue: '{name} (2)',
    who: 'Quién se va',
    value: 'Valor',
    stays: 'Se queda',
    goes: 'Se va',
    same: 'Lo mismo que este',
    half: 'La mitad a cada uno',
    items: 'Objetos',
    itemGoes: 'Cuántos se van',
    cancel: 'Cancelar',
    doSplit: 'Dividir',
    splitDone: '{name} sigue su camino.',
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

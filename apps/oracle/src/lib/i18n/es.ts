import { vocabulary, type Messages } from '@open-tabletop/ui-kit'
import type { en } from './en'

export const es: Messages<typeof en> = {
  app: {
    title: 'Oracle',
    tagline: 'Tira y crea tablas aleatorias, generadores, oráculos y mazos.',
  },
  nav: {
    favorites: 'Favoritos',
    favorite: 'Favorito: fijado arriba de la lista (también en el Hexmapper)',
    help: 'Ayuda y manual',
    undo: 'Deshacer el último cambio en tus packs (Ctrl+Z)',
    redo: 'Rehacer (Ctrl+Shift+Z)',
    showSidebar: 'Mostrar la lista de packs',
    hideSidebar: 'Ocultar la lista de packs (más espacio)',
    showHistory: 'Mostrar el historial',
    hideHistory: 'Ocultar el historial (más espacio)',
    showHelp: 'Mostrar la ayuda',
    hideHelp: 'Ocultar la ayuda (más espacio)',
    newDefinition: 'Nueva definición',
    search: 'Buscar tablas…',
    newPack: 'Nuevo pack',
    import: 'Importar .zip',
    importTip:
      'Importa packs de un .zip: un pack (una carpeta con pack.yaml) o un sistema con los packs que trae.',
    noResults: 'No hay coincidencias.',
    problems: '{count} problemas',
  },
  kinds: vocabulary.es.kinds,
  kindTips: {
    table: 'Tira los dados (o elige por peso) y busca la entrada.',
    oracle:
      'Una tabla con variantes que elige una entrada, como las probabilidades de una pregunta de sí o no.',
    generator: 'Tira varias tablas y rellena una plantilla de texto con los resultados.',
    deck: 'Cartas que se roban sin reponer hasta barajar de nuevo.',
  },
  origin: {
    bundled: 'incluido',
    edited: 'editado',
    personal: 'uso personal',
    updated: 'actualización',
  },
  originTips: {
    bundled: 'Viene con la aplicación y es de solo lectura. Edita una copia para cambiarlo.',
    edited: 'Tu copia editada de un pack incluido; sustituye al original.',
    personal: 'Contenido de uso personal de packs-private/: no lo compartas ni lo publiques.',
    updated:
      'La versión incluida de este pack ha cambiado desde que hiciste tu copia: abre el pack para coger o conservar cada cambio.',
  },
  prefs: {
    seed: 'Semilla de las tiradas',
    seedPlaceholder: 'Vacío: al azar',
    seedHelp:
      'Cualquier palabra o número hace las tiradas repetibles: la misma semilla da los mismos resultados a las mismas tiradas, en el mismo orden.\n• `marcas-grises-1` — tu primera sesión; **Nueva sesión** en el historial la vuelve a empezar\n• comparte la semilla de una sesión y otra persona podrá repetirla\nVacío: tiradas al azar. Se guarda con el historial en este navegador.',
    packs: 'Packs en la lista',
    packsHelp:
      'Desmarca los packs que no uses para quitarlos de la lista de la izquierda.\nSiguen cargados: las tablas de otros packs que tiran en ellos y las demás aplicaciones siguen usándolos. Los favoritos siguen fijados.',
  },
  welcome: {
    title: 'Oracle',
    body: 'Elige una tabla, generador, oráculo o mazo a la izquierda para tirarlo. Los packs son carpetas de ficheros YAML: los incluidos son de solo lectura (edita una copia) y los tuyos se guardan en este navegador. Expórtalos como .zip para tener copia o compartirlos.',
    packs: '{packs} packs, {definitions} definiciones',
  },
  tabs: { roll: 'Tirar', edit: 'Editar' },
  edit: {
    readOnly: 'Este pack viene incluido y es de solo lectura.',
    personalCopy: 'Tu copia se queda en este navegador y es solo para uso personal.',
    makeCopy: 'Editar una copia',
    name: 'Nombre',
    description: 'Descripción',
    roll: 'Dados',
    rollHelp:
      'Los dados que se tiran en la tabla; el **Rango** de cada entrada dice qué totales la eligen.\n• `1d6`, `2d6`, `1d20` — los dados de siempre\n• `d66` — dos d6 leídos como decenas y unidades (11–66)\n• `d%` — de 1 a 100\n• `2d6kh1` — tira 2d6 y quédate con el más alto\n• `1d6 + {{survival}}` — más un valor que recibe la tirada (una característica del grupo, un campo)\nVacío: se elige una entrada por **Peso**.',
    entries: 'Entradas',
    range: 'Rango',
    rangeHelp:
      'Los totales que eligen esta entrada:\n• `3` — solo un 3\n• `2-5` — del 2 al 5\n• `11-16` — con `d66`\nLos rangos no deben solaparse; la lista de problemas dice qué totales faltan. Sin dados, usa **Peso**.',
    weight: 'Peso',
    weightHelp:
      'Probabilidad relativa cuando la tabla no tiene dados (por defecto `1`):\n• `3` en una entrada y `1` en otra — el triple de probable\n• `0` — nunca, salvo que la elija una condición',
    result: 'Resultado',
    then: 'Luego tira',
    thenHelp:
      'Otra tabla o generador que se tira **cuando sale esta entrada**; su resultado se añade a este.\n• `ruins` — qué son las ruinas\n• `core/npc` — una tabla de otro pack (`pack/id`)\nLa tabla que tira ve lo que esta entrada **Fija**.',
    nothing: 'nada',
    id: 'Id',
    idHelp:
      'Nombre estable de la entrada, que usan las **traducciones** (`entries: { bandits: … }` en `locales/`) y los límites (**Solo una vez**, **Como mucho**).\n• `bandits`, `old-shrine`\nCambiarlo rompe sus traducciones; reordenar las entradas no.',
    addEntry: 'Añadir entrada',
    remove: 'Quitar',
    moveUp: 'Subir',
    moveDown: 'Bajar',
    renumber: 'Numerar 1–{count}',
    renumberHelp:
      'Da a las entradas rangos seguidos `1`, `2`, `3`… y ajusta los dados (`1d6` para seis entradas). Útil tras añadir o quitar entradas.',
    clamp: 'Ajustar totales',
    clampHelp:
      'Los modificadores pueden sacar una tirada del rango (`1d6 + 3` da 9). **Activado**: un total por debajo del rango más bajo toma la primera entrada, por encima del más alto la última.\n**Desactivado**: no sale nada.\n• una tirada de reacción `2d6 + {{charisma}}` — normalmente activado',
    onExhausted: 'Al agotarse',
    onExhaustedHelp:
      'Qué pasa cuando la entrada que sale ya llegó a su límite (**Solo una vez** o **Como mucho**):\n• **Tirar otra vez** — hasta una entrada que aún pueda salir\n• **Tomar la siguiente** — la siguiente de la lista\n• **Nada** — esta vez no hay resultado',
    exhausted: { reroll: 'Tirar otra vez', next: 'Tomar la siguiente', none: 'Nada' },
    advanced: 'Tiene condiciones, valores o límites (⋯ para verlos).',
    more: 'Condiciones, valores y límites',
    when: 'Solo si',
    whenHelp:
      "Cuándo puede salir la entrada, en pares `clave: valor` sobre lo que ve la tabla (el mapa, el viaje, las entradas, campos anteriores):\n• `terrain: forest` — solo en bosques\n• `tags: landmark` — una etiqueta del hex\n• `danger: { gte: 3 }` — un valor del hex o la región, 3 o más\n• `season: [autumn, winter]` — cualquiera de las dos estaciones\n• `timeOfDay: night`\n• `danger: { gt: '{{party.stats.stealth}}' }` — una variable: comparado con otro valor\n• `party.stats.str: { gte: '{{1d20}}' }` — una tirada bajo una característica (el mismo d20 para todas las entradas de la tirada)\n• `party.stats.survival: { gte: '{{roll}}' }` — bajo una característica con la propia **Tirada** de la tabla (`roll`: su total, también en el texto de la entrada, sus `set` y sus cambios)\n• `hex.terrain: forest`, `trip.weather: storm`, `time.daylight: true` — por **nombre completo** (`hex.*`, `time.*`, `trip.*`, `system.*`, `world.*`): los mismos valores, sin que los tape una característica con el mismo nombre\n**Salvo**: no puede salir cuando se cumple:\n• `edges: road` — no por camino\nVacío: siempre. Una entrada que no puede salir se salta como si no estuviera.",
    unless: 'Salvo',
    set: 'Fija',
    setHelp:
      "Valores que da la entrada cuando sale, en pares `clave: valor`. Las tablas siguientes, la plantilla y el viaje los leen:\n• `weather: storm` — el clima del día\n• `lost: true` — un valor del día que declara el sistema (puede bloquear el viaje)\n• `count: '{{2d6}}'` — un número tirado ahora\n• `terrain: '{{common}}'` — copiado de lo que ve la tabla\n• `rolled: '{{roll}}'` — el total de la propia tirada de la tabla",
    effects: 'Cambios',
    effectsHelp:
      "Lo que cambia la entrada en el grupo del viaje cuando sale:\n• `party.stats.morale: -1` — quita 1\n• `party.resources.food: '{{1d3}}'` — suma una cantidad tirada\n• `party.stats.fatigue: '=0'` — lo fija\nLos valores son los del sistema (características y provisiones). Durante un viaje se aplican al momento; tirada a mano, se ofrecen al viaje (**Aplicar al viaje**).",
    once: 'Solo una vez',
    onceHelp:
      'Sale **como mucho una vez por sesión** (un PNJ único, un tesoro irrepetible); después la tabla hace lo que diga **Al agotarse**. Necesita **Id**.',
    pause: 'Pausar',
    pauseHelp:
      'Cuando sale **durante un viaje**, el viaje se detiene tras la tirada y espera a que pulses **Continuar**: tiempo para describir el lugar, escribir lore o decidir algo.\n• una guarida encontrada en el bosque\n• una emboscada\nTirada a mano, no hace nada.',
    maxOccurrences: 'Como mucho',
    maxOccurrencesHelp:
      'Veces que puede salir por sesión:\n• `2` — dos veces, luego **Al agotarse**\nVacío: sin límite. Necesita **Id**.',
    notAMap: 'Escribe pares clave: valor, p. ej. terrain: forest',
    language: 'Idioma',
    baseLanguage: '{locale} (base)',
    translationHelp:
      'Las traducciones se guardan en `locales/<idioma>/` junto al fichero (`locales/es/encounters.yaml`), por id de definición y de entrada. Elige aquí un idioma y escribe los textos; los campos vacíos usan el idioma base.',
    needsIds: 'Las entradas necesitan id para poder traducirse.',
    assignIds: 'Dar id a las entradas',
    deleteDefinition: 'Borrar',
    confirmDelete: '¿Borrar "{name}"? No se puede deshacer.',
    coverage: 'Los rangos no cubren todas las tiradas; mira los problemas de abajo.',
    duplicateRow: 'Duplicar',
    input: 'Entrada',
    inputHelp:
      'Lo que eliges **antes de tirar**, cada opción con su propia lista de entradas:\n• la probabilidad: `low`, `even`, `high`\n• la actitud de un PNJ: `hostile`, `wary`, `friendly`\nLas tablas y los viajes también pueden elegirla, con un valor del mismo nombre (`odds: high`).',
    inputLabel: 'Etiqueta',
    labelHelp:
      'Se muestra en lugar del id al tirar, y se puede traducir:\n• `odds` → _Probabilidad_\n• `even` → _Igualada_\nVacío: se muestra el id.',
    optionLabel: 'Etiqueta',
    modes: 'Modos de tirada',
    modesHelp:
      'Formas de tirar esta tabla que declara su sistema (`kind: roll-modes`), como la ventaja: tirar toda la tirada varias veces y quedarse con un total.\n**Marcado**: se ofrece al tirar a mano.\n**Solo cuando**: se usa sin preguntar cuando se cumple la condición:\n• `explorer: { gte: 1 }` — una característica del grupo\n• `yesterday.lost: true` — ayer se perdieron\n• `weather: clear`\n**Salvo**: no se usa por sí mismo cuando se cumple (escrito solo, el modo se usa siempre salvo entonces):\n• `terrain: dense-forest`\nDos modos que se anulan (ventaja y desventaja), juntos, dan una tirada normal.',
    modeWhen: 'solo cuando',
    modeUnless: 'salvo',
    noModes:
      'Este pack y sus dependencias no declaran modos de tirada. Añade una definición kind: roll-modes (Nueva definición → Modos de tirada) para tirar tablas con ventaja o de cualquier otra forma.',
    default: 'Por defecto',
    defaultHelp:
      'La opción elegida al abrir el panel de tirada:\n• `even` — para la probabilidad\nVacío: la primera.',
    firstOption: 'La primera',
    options: 'Opciones',
    optionsHelp:
      'Las opciones de la entrada, cada una con su lista de entradas:\n• `low`, `even`, `high`\nCambiar el nombre de una opción cambia también el de su lista de entradas.',
    newOption: 'Nueva opción',
    addOption: 'Añadir opción',
    optionExists: 'Ya hay una opción «{option}».',
    variant: '{input}: {option}',
    missingVariant: 'Todavía no hay entradas para «{option}».',
    createVariant: 'Crearlas',
    template: 'Plantilla',
    templateHelp:
      'Texto del resultado: escribe `{{campo}}` donde va el valor de cada campo.\n• `Las ruinas de {{site}}, guardadas por {{guardian}}.`\n• `{{count}} lobos ({{mood}})`\nLas fichas de abajo añaden un campo al final. Vacío: se listan los campos, uno por línea.',
    insertField: 'Añadir a la plantilla',
    fields: 'Campos',
    fieldsHelp:
      'Cada campo se tira **en orden**; los campos y tablas siguientes pueden usar los valores anteriores (`{{danger}}`). Un campo sale de:\n• una **Tabla** — `ruins`\n• un **Generador** — otro generador\n• **Dados** — `2d6kl1`, `d%`\n• un **Valor fijo** — `3`, o un texto con variables: `peligro {{danger}} de 6`',
    fieldName: 'Nombre',
    fieldSource: 'Sale de',
    fieldValue: 'Tabla, dados o valor',
    sources: { table: 'Tabla', generator: 'Generador', roll: 'Dados', value: 'Valor fijo' },
    fieldMore: 'Condiciones y contexto',
    fieldWhenHelp:
      '**Solo si**: el campo solo se tira cuando se cumple sobre lo que ve el generador (sus entradas, campos anteriores, el mapa o el viaje); si no, queda vacío.\n• `season: winter`\n• `danger: { lte: 2 }` — un campo anterior\n**Salvo**: no cuando se cumple:\n• `untouched: { lt: 90 }`\nVacío: siempre.',
    fieldContext: 'Contexto',
    fieldContextHelp:
      "Valores que recibe la tabla o generador que tira este campo, en pares `clave: valor`:\n• `danger: 3` — como si el lugar fuera más peligroso\n• `timeOfDay: night`\n• `terrain: '{{terrain}}'` — pasado de lo que ve el generador",
    fieldExists: 'Ya hay un campo «{field}».',
    addField: 'Añadir campo',
    reshuffle: 'Barajar',
    reshuffleHelp:
      'Cuándo vuelven al mazo las cartas robadas:\n• **Cuando se acaba el mazo** — como un mazo de verdad\n• **Solo a mano** — un mazo que se vacía para siempre\n• **Tras cada robo** — todas las cartas siempre posibles',
    reshuffles: {
      'when-empty': 'Cuando se acaba el mazo',
      manual: 'Solo a mano',
      'after-draw': 'Tras cada robo',
    },
    cards: 'Cartas ({count} en el mazo)',
    cardIdHelp:
      'Nombre estable de la carta, que usan las **traducciones** (`cards: { ace: … }`) y el registro de cartas robadas:\n• `ace-of-cups`',
    copies: 'Copias',
    copiesHelp:
      'Cuántas de esta carta tiene el mazo:\n• `3` — el triple de probable que una carta sola\n• `1` — una carta única',
    cardText: 'Texto',
    addCard: 'Añadir carta',
  },
  pack: {
    files: 'Ficheros',
    addFile: 'Añadir fichero',
    fileName: 'Nombre del fichero, p. ej. tablas/clima.yaml',
    rename: 'Renombrar',
    renamePrompt: 'Nuevo nombre para {file}',
    deleteFile: 'Borrar fichero',
    confirmDeleteFile: '¿Borrar {file}?',
    definitions: 'Definiciones',
    newDefinition: 'Nueva definición',
    id: 'Id',
    kind: 'Tipo',
    inFile: 'En el fichero',
    create: 'Crear',
    problems: 'Problemas',
    noProblems: 'No hay problemas.',
    export: 'Exportar .zip',
    revert: 'Volver al incluido',
    confirmRevert: '¿Descartar tus cambios en "{name}" y volver a la versión incluida?',
    deletePack: 'Borrar pack',
    confirmDeletePack: '¿Borrar el pack "{name}" con todos sus ficheros? No se puede deshacer.',
    version: 'Versión',
    locale: 'Idioma base',
    license: 'Licencia',
    translations: 'Traducciones',
    noTranslations: 'Ninguna todavía.',
    addTranslation: 'Añadir idioma',
    translationCode: 'Código de idioma, p. ej. en',
    invalidId: 'Los id usan minúsculas, números y guiones.',
    idTaken: 'Ya hay una definición "{id}" en este pack.',
    fileExists: 'Ya existe el fichero {file}.',
    manifest: 'Manifiesto',
    manifestHelp:
      'Nombre, versión, idioma base, licencia y dependencias están en `pack.yaml`:\n• `version: 1.2.0`\n• `dependencies: { core: ^0.1.0 }` — tablas de otro pack que usa',
    other: 'Otras definiciones',
    otherHelp:
      'Reglas para otros motores: reglas de viaje, bindings, calendarios, modelos de clima. Edítalas en sus ficheros (YAML), o las reglas de viaje en la aplicación **Travel**.',
  },
  defActions: {
    duplicate: 'Duplicar',
    duplicateHelp:
      'Hace una copia en este pack (como `<id>-copy`) para usarla de punto de partida.',
    copyTo: 'Copiar a…',
    copyToHelp:
      'Copia en uno de tus packs, con sus traducciones. Las referencias a tablas de este pack siguen funcionando (`grey-marches/ruins`).',
    copied: 'Copiado como {id}',
  },
  newDef: {
    forTravel: 'Reglas del sistema',
    forTravelHelp:
      'Reglas de un sistema, además de sus tablas:\n• **Modos de tirada** — formas de tirar sus tablas (ventaja…)\n• **Reglas de viaje** — hacen del pack un sistema que puedes elegir en el Hexmapper (Jugar → Con reglas) y en Travel, y que se edita en la aplicación Systems\n• **Bindings** — qué tabla responde a cada comprobación\n• **Calendario**, **Modelo de clima**\nMira el manual: _Tipos de definición_ y _Conectar tablas con mapas y viajes_.',
    system: {
      'roll-modes': 'Modos de tirada',
      'travel-rules': 'Reglas de viaje',
      bindings: 'Bindings',
      calendar: 'Calendario',
      weather: 'Modelo de clima',
    },
    systemTips: {
      calendar:
        'Meses y estaciones, días de la semana, lunas y fiestas para sus viajes y el reloj del mundo.',
      weather:
        'Clima con memoria: por estación, lo probable que es cada clima mañana. Átalo a una comprobación con weather:.',
      'roll-modes':
        'Formas de tirar sus tablas, como la ventaja: tirar varias veces y quedarse con un total.',
      'travel-rules':
        'Velocidades, terrenos, caminos, provisiones y qué comprobaciones se tiran y cuándo.',
      bindings:
        'Qué tabla responde a cada comprobación del viaje, y las estadísticas del grupo que leen las tablas.',
    },
    alreadyHas: 'Este pack ya tiene uno.',
    title: 'Nueva definición',
    pack: 'En el pack',
    noPacks:
      'Las definiciones van en tus propios packs: crea un pack primero (o edita una copia de uno incluido).',
    name: 'Nombre',
    idPreview: 'Id: {id}',
    file: 'Fichero',
    fileHelp:
      'Fichero YAML del pack donde se escribe. Vale cualquiera; agrúpalos como quieras:\n• `encounters.yaml`\n• `tables/weather.yaml`',
    newFile: 'Nuevo fichero…',
  },
  newPack: {
    title: 'Nuevo pack',
    id: 'Carpeta / id',
    idHelp:
      'Minúsculas, dígitos y guiones. Otros packs se refieren a sus tablas como `id/tabla`:\n• `mi-mundo` → `mi-mundo/encounters`',
    name: 'Nombre',
    locale: 'Idioma base',
    localeHelp:
      'Idioma en que están escritas las tablas (`en`, `es`…); las traducciones a otros idiomas se pueden añadir después.',
    create: 'Crear',
    cancel: 'Cancelar',
    idTaken: 'Ya hay un pack "{id}".',
  },
  file: {
    problems: '{count} problemas',
    noProblems: 'Sin problemas',
    line: 'línea {line}',
    readOnly: 'Solo lectura (incluido)',
  },
  storage: {
    full: 'El almacenamiento del navegador está lleno: exporta tus packs para no perderlos.',
  },
  common: { cancel: 'Cancelar', ok: 'Aceptar', close: 'Cerrar' },
}

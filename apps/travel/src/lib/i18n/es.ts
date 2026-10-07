import { vocabulary } from '@open-tabletop/ui-kit'
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
    undo: 'Deshacer el último cambio en tus packs (Ctrl+Z)',
    redo: 'Rehacer (Ctrl+Shift+Z)',
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
    updated: 'actualización',
  },
  welcome: {
    title: 'Travel',
    body: 'Elige un sistema de viaje a la izquierda para jugar un viaje con él, o para ver y editar sus reglas: a qué velocidad se va por cada terreno y camino, qué se lleva encima y qué comprobaciones se tiran por el camino. Aquí los viajes no tienen mapa: describes el camino hex a hex. Para viajar sobre un mapa, usa el Hexmapper (modo Jugar) con los mismos sistemas.',
  },
  tabs: { play: 'Jugar', rules: 'Reglas', checks: 'Comprobaciones', yaml: 'YAML' },
  forms: {
    confirmRemove:
      '¿Quitar «{name}»? Los formularios no lo pueden deshacer (edita el YAML para recuperarlo).',
    id: 'Id',
    add: 'Añadir',
    remove: 'Quitar',
    idExists: 'Ya hay uno que se llama «{id}».',
    badFlow: 'Escríbelo como pares clave: valor, p. ej. tags: landmark o terrain: [forest, hills].',
    problems: 'Este fichero tiene {count} problemas: abre el YAML para verlos.',
  },
  rules: {
    water: 'Hexes de agua',
    waterHelp:
      'Hexes cuyo terreno el mapa marca como agua (Hexmapper: Editar paleta → Agua) y que no tienen regla propia en Terrenos. Normalmente no se cruzan a pie; una forma de viajar «Solo por» agua (water: true) sí puede navegarlos.',
    day: 'El día',
    dayHelp:
      'Cuándo empieza el día (y se tiran las comprobaciones del alba) y cuándo cae la noche: nadie marcha de noche.',
    start: 'Alba',
    nightfall: 'Anochecer',
    hoursPerDay: 'Horas de marcha al día',
    night: 'Al anochecer, esperando',
    nightHelp:
      'Lo que hace el grupo cuando cae la noche mientras espera (el reloj del mundo avanzando con un viaje en marcha): una acción del sistema, p. ej. camp. Por defecto camp, si el sistema la tiene; ninguna: la noche simplemente pasa.',
    nightDefault: 'camp, si existe',
    nightNone: 'nada: la noche pasa',
    hoursPerDayHelp: 'Cuánto puede marchar el grupo cada día antes de tener que parar.',
    modes: 'Formas de viajar',
    modesHelp:
      'A pie, a caballo… La velocidad va en km por día de marcha en terreno fácil; los terrenos y caminos la cambian.',
    kmPerDay: 'km por día',
    name: 'Nombre',
    nameHelp:
      'Lo que leen los jugadores en el panel del viaje y el diario en lugar del id (p. ej. A caballo, Raciones). Se escribe en el idioma actual: el del pack, o su fichero de traducción si la interfaz está en otro.',
    allowedTerrains: 'Solo por',
    allowedTerrainsHelp:
      'Por dónde puede ir: una condición sobre cada hex en el que entra (su terreno, agua, etiquetas, región, campos, los caminos o ríos del paso), p. ej. una barca: any: [{ water: true }, { terrain: coast }]; un carro solo por camino: edges: road. Donde se cumple, ni los terrenos cerrados la paran. Vacío: por donde dejen los terrenos.',
    anyTerrain: 'por donde dejen los terrenos',
    terrains: vocabulary.es.terms.terrains,
    terrainsHelp:
      'Cómo cambia la velocidad cada terreno. Los ids son los que usa el mapa (forest, hills…).',
    terrain: vocabulary.es.terms.terrain,
    multiplier: 'Velocidad ×',
    multiplierHelp: '1 es la velocidad normal, 0.5 la mitad, 2 el doble.',
    passable: 'Transitable',
    passableHelp:
      'Sin marcar: ninguna forma de viajar puede entrar (las rutas lo rodean), salvo una cuyo “Solo por” se cumpla allí.',
    defaultTerrain: 'Velocidad × de los terrenos no listados',
    defaultTerrainHelp: 'Para cualquier terreno que no esté arriba (1 si está vacío).',
    edges: 'Caminos y ríos',
    edgesHelp:
      'Seguir un camino, sendero o río entre dos hexes: su velocidad sustituye a la del terreno. Las líneas no listadas no hacen nada.',
    edge: 'Línea',
    edgeMultiplierHelp: 'Velocidad por ella: 1.5 es la mitad más rápido que a campo abierto.',
    resources: vocabulary.es.terms.supplies,
    resourcesHelp:
      'Lo que lleva el grupo. Qué lo gasta lo decide el sistema: efectos de sus acciones (una acción al final del día come), comprobaciones y tablas (party.resources.food: -1).',
    min: 'Mín',
    minHelp:
      'Los efectos nunca la bajan de aquí: un cambio que lo pasaría se queda en él, y los pasos siguientes y las comprobaciones de ese día ven below: [su id]. Vacío: sin mínimo (puede quedar en negativo).',
    max: 'Máx',
    maxHelp:
      'Los efectos nunca la suben de aquí (los pasos siguientes y las comprobaciones ven above: [su id]). Vacío: sin máximo.',
    olderEating:
      'Estas reglas comen a la manera antigua (provisiones gastadas “al día”, formas de viajar que gastan provisiones o pasos que comen las provisiones del día). Se siguen jugando igual; convertirlas lo escribe como una acción que el sistema hace al final de cada día, con Mín 0 en las provisiones.',
    olderEatingConvert: 'Convertir',
    weather: vocabulary.es.terms.weather,
    weatherHelp:
      'Cómo frena el clima al grupo. Las tablas lo fijan con set: { weather: … } (normalmente al alba).',
    weatherState: vocabulary.es.terms.weather,
    speed: 'Velocidad ×',
    speedHelp: '0 es que ese día no se viaja; 0.5 a media velocidad.',
    actions: 'Acciones',
    actionsHelp:
      'Lo que puede hacer el grupo además de marchar: acampar, descansar y las propias del sistema (buscar comida, rezar…), cada una un botón en el panel del viaje. Cada una dice cuándo se puede hacer y qué hace, paso a paso.',
    oncePerDay: 'Una vez al día',
    modeWhenHelp:
      'Solo se puede elegir cuando se cumple, p. ej. una barca solo a la orilla: any: [{ water: true }, { tags: ferry }]. Vacío: siempre. (En YAML también vale unless.)',
    values: 'Valores del día',
    valuesHelp:
      'Valores que las tablas de este sistema pueden poner para el resto del día (set: { lost: true }), con lo que bloquean mientras se cumplen: viajar, acciones por su id o formas de viajar (mode.<id>). Las tablas los leen al día siguiente como yesterday.<id>. Sin ninguno, sigue funcionando el antiguo lost incorporado (bloquea el viaje).',
    blocks: 'Bloquea',
    blocksHelp:
      'Lo que no se puede hacer mientras se cumple el valor: travel (viajar), camp, rest, el id de una acción o una forma de viajar como mode.<id> (mode.horse). Los botones siguen visibles, desactivados, diciendo por qué.',
    blocksNothing: 'nada',
  },
  actions: {
    when: 'Solo si',
    unless: 'Salvo si',
    whenHelp:
      'Cuándo se puede pulsar el botón, con condiciones como las de las tablas: los valores de hoy (forageImpossible: true), el mapa (terrain: [forest, hills]), el grupo (party.stats.faith: { gte: 1 }). Si no, se queda desactivado y dice por qué.',
    nothing: 'Cuando no se aplica nada',
    nothingHelp:
      'Lo que dice el diario cuando no se aplica ninguna de sus comprobaciones donde está el grupo; {terrain} es el terreno del hex. Vacío: una frase genérica.',
    nothingPlaceholder: 'no hay nada que encontrar en {terrain}',
    steps: 'Qué hace',
    stepsHelp:
      'Sus pasos, en orden, cada uno escrito como en el YAML: time: 180 (minutos; o dawn, nightfall, 14:00), speed: 0.5 (el resto de la marcha de hoy), effects: { party.stats.fatigue: -1 } (un cambio que pasaría el Mín o el Máx de un valor se queda en él; los pasos siguientes ven below: [id] o above: [id]), set: { lost: true } (valores del día), do: forage (otra acción, si se cumplen sus condiciones), roll: ENCOUNTER_CHECK_REQUIRED (una comprobación ya). La casilla de al lado es la condición del paso: solo ocurre si se cumple (below: food, doing: camp…). Las acciones que siguen a esta y sus comprobaciones (pestaña Comprobaciones, En: esta acción) van primero.',
    on: 'La hace',
    onHelp:
      'El jugador (un botón), o el propio sistema en un momento (al alba, al entrar en un hex, al final de cada día) o tras otra acción, si se cumplen sus condiciones. Si la hace el sistema no es un botón; va antes de las comprobaciones de ese momento. P. ej. comer al acabar cada día, se acampe o no.',
    onButton: 'El jugador (un botón)',
    onAfter: 'Tras: {action}',
    step: 'Paso',
    badStep:
      'Un paso hace una cosa: time: 60, speed: 0.5, effects: { … }, set: { … }, do: <acción> o roll: <comprobación>.',
    stepWhen: 'solo si…',
    up: 'Subir',
    down: 'Bajar',
    noSteps: 'Sin pasos: no hace nada salvo tirar sus comprobaciones.',
    addStep: 'Añadir un paso',
    add: 'Añadir una acción',
  },
  kinds: vocabulary.es.kinds,
  checks: {
    title: 'Comprobaciones',
    help: 'Qué se tira por el camino, cuándo y en qué tabla. Una comprobación sin tabla detiene el viaje y te espera.',
    event: 'Comprobación',
    name: 'Nombre',
    nameHelp:
      'Lo que leen los jugadores en el panel del viaje y el diario en lugar del id del evento (p. ej. Perderse). Esta caja lo edita en el idioma actual: el del pack, o su fichero de traducción si la interfaz está en otro.',
    description: 'Descripción (tooltip)',
    at: 'Cuándo',
    atOptions: {
      'day-start': 'Al alba',
      'hex-enter': 'Al entrar en un hex',
      camp: 'Al acampar',
      'day-end': 'Al final del día',
    },
    atNone: 'Solo cuando un paso la tira',
    atAction: 'Acción: {action}',
    when: 'Solo si',
    unless: 'Salvo si',
    conditionHelp:
      'Condiciones como en las tablas, en pares clave: valor: terrain: forest, tags: landmark, edges: [road, river], season: winter, weather: storm.',
    always: 'siempre',
    never: 'nunca',
    resolve: 'Se tira en',
    resolveHelp:
      'La tabla, oráculo, generador o mazo que la resuelve. Su resultado va al diario, y sus valores set y efectos llegan al viaje.',
    weatherModels: 'Clima con inercia',
    weatherModel: 'Modelo de clima: {model}',
    waits: '— nada: espérame —',
    effects: 'Cambios',
    effectsHelp:
      'Lo que cambia la propia comprobación cuando sale, con tabla o sin ella: party.stats.fatigue: 1, party.resources.food: -1. Un número suma o resta; =3 lo fija. Así escribe un sistema sus reglas como datos (un día sin comida: fatiga +1).',
    pause: 'Pausar después',
    pauseHelp:
      'El viaje se detiene cuando sale esta comprobación (tras tirarla, si algo la resuelve) y espera a que pulses Continuar: tiempo para describir el lugar, escribir lore o decidir algo. Una entrada de tabla también puede pausar, solo cuando sale.',
    context: 'Contexto extra',
    contextHelp: 'Valores que la tabla ve solo en esta comprobación, p. ej. timeOfDay: night.',
    none: 'Sin comprobaciones: los viajes solo gastan tiempo y provisiones.',
    add: 'Añadir una comprobación',
    orphans: 'Tablas asociadas a comprobaciones que estas reglas no tienen: {events}.',
    removeOrphans: 'Quitarlas',
    stats: 'Características del grupo',
    statsHelp:
      'Números del grupo que pueden usar las tablas (p. ej. 2d6 + {{charisma}}). Se editan durante el viaje.',
    statName: 'Nombre',
    statDescription: 'Descripción',
    statDefault: 'Empieza en',
    noStats: 'Sin características del grupo.',
    addStat: 'Añadir una característica',
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
      'Un viaje sin mapa: lista los hexes que tienes por delante, con su terreno y etiquetas y si un camino o un río une cada uno con el siguiente. El grupo se dirige al último.',
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
      'Lo rápido que se cruza el hex (la velocidad que da el sistema a ese terreno, y si se puede cruzar) y lo que las tablas ven como terreno (terrain: forest en una condición).',
    tagsHelp:
      'Palabras que marcan el hex, separadas por comas, para las comprobaciones y tablas que las buscan (tags: landmark en una condición). Las sugerencias son las etiquetas que usan los packs cargados; lo que hace cada una depende del sistema (mira su página en el manual).',
    edgesHelp:
      'Si un camino, sendero o río une este hex con el siguiente. Lo que eso hace depende del sistema: los caminos suelen ser más rápidos, y un sistema puede saltarse algunas comprobaciones en ellos (edges: road en una condición).',
    addHex: 'Añadir un hex',
    remove: 'Quitar',
    destinationHint: 'Añade hexes al camino para ponerte en marcha.',
    arrivedHint: 'Añade más hexes para seguir.',
  },
  edit: {
    readOnly: 'Este sistema viene incluido y es de solo lectura.',
    personalCopy: 'Tu copia se queda en este navegador y es solo para uso personal.',
    editedCopy: 'Tu copia editada de un sistema incluido: sustituye al incluido en este navegador.',
    revert: 'Volver a la versión incluida',
    updatedTip:
      'La versión incluida de este sistema ha cambiado desde que hiciste tu copia: ábrelo para coger o conservar cada cambio.',
    confirmRevert:
      '¿Descartar tus cambios en este sistema y volver a la versión incluida? (↶ lo deshace.)',
    makeCopy: 'Editar una copia',
    builtIn:
      'Las reglas Genéricas vienen integradas y no se pueden editar. Crea un sistema nuevo (a la izquierda) para hacer el tuyo a partir de ellas.',
  },
  yaml: { line: 'línea {line}' },
  terrains: vocabulary.es.terrains,
  edgeKinds: vocabulary.es.pathKinds,
  storage: {
    full: 'El almacenamiento del navegador está lleno: exporta tus packs para no perderlos.',
  },
}

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
      'Lo que hace el grupo cuando cae la noche mientras espera (el reloj del mundo avanzando con un viaje en marcha): una de las acciones del sistema, p. ej. camp.\nPor defecto camp, si el sistema la tiene; ninguna: la noche simplemente pasa.\nSi la acción no se puede hacer (su Solo cuando / Salvo cuando, o un valor que la bloquea), la noche pasa sin ella y el diario dice por qué; un grupo al que mandas viajar al anochecer hace lo mismo y sigue marchando al alba.\n• camp con Solo cuando party.resources.food: { gte: 1 } — un grupo sin comida duerme a la intemperie',
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
      'Por dónde puede ir: una condición sobre cada hex en el que entra (su terreno, agua, etiquetas, región, campos, los caminos o ríos del paso).\n• una barca: any: [{ water: true }, { terrain: coast }]\n• un carro solo por camino: edges: road\nDonde se cumple, ni los terrenos cerrados la paran. Vacío: por donde dejen los terrenos.',
    anyTerrain: 'por donde dejen los terrenos',
    terrains: vocabulary.es.terms.terrains,
    terrainsHelp:
      'Cómo cambia la velocidad cada terreno. Los ids son los que usa el mapa (forest, hills…).',
    terrain: vocabulary.es.terms.terrain,
    multiplier: 'Velocidad ×',
    multiplierHelp: '1 es la velocidad normal, 0.5 la mitad, 2 el doble.',
    passable: 'Transitable',
    passableHelp:
      'Sin marcar: ninguna forma de viajar puede entrar (las rutas lo rodean), salvo una cuyo “Solo por” se cumpla allí. Marcado, aún puede abrirse o cerrarse con una condición (Abierto cuando, Cerrado cuando).',
    openWhen: 'Abierto cuando',
    closedWhen: 'Cerrado cuando',
    passableWhenHelp:
      'Cuándo se puede entrar en el terreno, como condición sobre el hex al que se entra y el momento (su terreno, etiquetas, región, campos, los caminos o ríos del paso, la forma de viajar, el clima, la estación y el calendario, los valores del día).\n• Abierto cuando: solo mientras se cumple, p. ej. un lago que se cruza sobre el hielo: season: winter\n• Cerrado cuando: no mientras se cumple, p. ej. un paso de montaña: any: [{ season: winter }, { weather: snow }]\nVacío: siempre abierto / nunca cerrado.',
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
      'Los efectos nunca lo bajan de aquí: un cambio más allá se queda ahí, el diario lo dice, y los pasos siguientes y las comprobaciones de ese día ven below: [su id].\nP. ej. comida con Mín 0: comer sin nada se queda en 0, y una comprobación day-end con Solo si below: food cansa al grupo.\nVacío: sin mínimo (puede ser negativo, como una deuda).',
    max: 'Máx',
    maxHelp:
      'Los efectos nunca lo suben de aquí; los pasos y comprobaciones siguientes ven above: [su id].\nP. ej. agua con Máx 4: un odre lleno no admite más.\nVacío: sin máximo.',
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
      'Cuándo se puede elegir (Solo si) o no (Salvo si), como condición sobre dónde está el grupo y el momento.\n• una barca solo a la orilla: any: [{ water: true }, { tags: ferry }]\n• sin caballos con nieve: weather: snow\nVacío: siempre. Un valor del día también puede bloquearla (Bloquea: mode.<id>).',
    values: 'Valores del día',
    valuesHelp:
      'Valores que las tablas y acciones de este sistema pueden poner para el resto del día (set: { lost: true }), con lo que bloquean mientras se cumplen. Las tablas los leen al día siguiente como yesterday.<id>.\n• lost — bloquea el viaje\n• snowbound — bloquea mode.horse\nSin ninguno, sigue funcionando el antiguo lost integrado (bloquea el viaje).',
    blocks: 'Bloquea',
    blocksHelp:
      'Lo que no se puede hacer mientras se cumple el valor:\n• travel — no se marcha más\n• el id de una acción, p. ej. camp o forage\n• mode.<id>, p. ej. mode.horse — esa forma de viajar: no se puede elegir, y un grupo que ya viaja así se detiene hasta que cambie\n\nLa caja sugiere lo que declara este sistema. Los botones bloqueados siguen visibles, desactivados, diciendo por qué.',
    blocksNothing: 'nada',
  },
  actions: {
    when: 'Solo si',
    unless: 'Salvo si',
    whenHelp:
      'Cuándo se puede pulsar el botón (Solo si) o no (Salvo si), con condiciones como las de las tablas:\n• weather: storm — el clima de hoy\n• terrain: [forest, hills] — el hex donde está el grupo\n• tags: shrine — una etiqueta de ese hex\n• party.stats.fatigue: { lt: 2 } — el grupo\n• refusing: true — un valor del día\n• moons.ember: full — el calendario\n\nSi no, sale desactivado y dice por qué.',
    nothing: 'Cuando no se aplica nada',
    nothingHelp:
      'Lo que dice el diario cuando no se aplica ninguna de sus comprobaciones donde está el grupo; {terrain} es el terreno del hex. Vacío: una frase genérica.',
    nothingPlaceholder: 'no hay nada que encontrar en {terrain}',
    steps: 'Qué hace',
    stepsHelp:
      "Lo que hace la acción, un paso por caja, en orden, cada uno escrito como en el YAML:\n• time: 180 — pasan tres horas (o time: dawn, time: nightfall, time: '14:00')\n• speed: 0.5 — lo que queda de marcha hoy va a media velocidad\n• effects: { party.stats.fatigue: -1 } — cambia el grupo (un número suma o resta; '=0' lo fija). Un cambio más allá del Mín o Máx de un valor se queda ahí, y los pasos siguientes ven below: [id] o above: [id]\n• set: { lost: true } — da un valor del día\n• do: forage — hace otra acción (si se cumplen sus condiciones)\n• roll: ENCOUNTER_CHECK_REQUIRED — tira una comprobación ya\n\nLa caja junto a cada paso es su condición: el paso solo ocurre cuando se cumple.\n• below: food — solo si la comida llegó hoy a su mínimo\n• party.stats.morale: { lte: 1 } — solo con la moral baja\n• moment: hex-enter — solo cuando la acción llegó en ese momento\n\nLas acciones que siguen a esta, y sus comprobaciones (Comprobaciones → Cuándo: esta acción), van primero.",
    on: 'Sola en',
    onHelp:
      'Vacío: la hace el jugador, con un botón.\n\nSi no, los momentos en que la hace el propio sistema, si se cumplen sus condiciones; entonces no es un botón, y va antes de las comprobaciones de ese momento:\n• day-start — al alba\n• hex-enter — al entrar en cada hex\n• day-end — al acabar cada día, se acampe o no\n• el id de una acción, p. ej. camp — justo al empezar esa acción\n\nVarios, separados por comas: day-start, hex-enter. Sus condiciones ven cuál es como moment (when: { moment: hex-enter }).\n\nP. ej. comer al acabar cada día: day-end.',
    onButton: 'nada: un botón para el jugador',
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
    description: 'Descripción (su ayuda)',
    at: 'Cuándo',
    atOptions: {
      'day-start': 'Al alba',
      'hex-enter': 'Al entrar en un hex',
      camp: 'Al acampar',
      'day-end': 'Al final del día',
    },
    atNone: 'solo cuando un paso la tira',
    atHelp:
      'Cuándo se tira:\n• day-start — al alba, antes de marchar\n• hex-enter — al entrar en cada hex\n• day-end — al acabar cada día (tras las acciones day-end del sistema)\n• el id de una acción, p. ej. camp o forage — cuando el grupo la hace\n\nVarios, separados por comas: hex-enter, rest. Sus condiciones y su tabla ven cuál es como moment (when: { moment: rest }).\n\nVacío: solo cuando la tira un paso de una acción (roll: <su evento>).',
    atAction: 'Acción: {action}',
    when: 'Solo si',
    unless: 'Salvo si',
    conditionHelp:
      'Cuándo se tira la comprobación (Solo si) o se salta (Salvo si), en pares clave: valor, como en las tablas:\n• terrain: forest — el hex\n• tags: landmark — una etiqueta del hex\n• edges: [road, river] — el camino o río del paso\n• danger: { gte: 2 } — un valor del hex o de su región\n• season: winter, weather: storm — el momento\n• party.resources.food: { lt: 1 } — el grupo\n• moment: rest — cuál de sus momentos es (si tiene varios)',
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
      "Lo que cambia la propia comprobación cuando sale, con o sin tabla:\n• party.stats.fatigue: 1 — suma 1\n• party.resources.food: -1 — quita 1\n• party.stats.fatigue: '=0' — lo fija\n\nEs como un sistema escribe sus reglas como datos, p. ej. un día sin comida suficiente: en day-end, Solo si below: food, Cambios party.stats.fatigue: 1.",
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

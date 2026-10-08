import { vocabulary } from '@open-tabletop/ui-kit'
import type { Messages } from '@open-tabletop/ui-kit'
import type { en } from './en'

export const es: Messages<typeof en> = {
  app: {
    title: 'Systems',
    tagline: 'Crea y edita sistemas de juego.',
  },
  nav: {
    showSidebar: 'Mostrar la lista de sistemas',
    hideSidebar: 'Ocultar la lista de sistemas (más espacio)',
    showHelp: 'Mostrar la ayuda',
    hideHelp: 'Ocultar la ayuda (más espacio)',
    systems: 'Sistemas',
    generic: vocabulary.es.terms.genericSystem,
    help: 'Ayuda y manual',
    undo: 'Deshacer el último cambio en tus packs (Ctrl+Z)',
    redo: 'Rehacer (Ctrl+Shift+Z)',
    newSystem: 'Nuevo sistema',
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
    title: 'Systems',
    body: 'Un sistema es aquello con lo que se juega una partida: sus reglas de viaje (a qué velocidad se va por cada terreno y camino, qué se lleva encima, qué puede hacer el grupo), las comprobaciones que se tiran por el camino y las tablas que las responden. Elige uno a la izquierda para verlo y editarlo, o crea uno nuevo debajo de la lista. Los sistemas incluidos son de solo lectura: edita una copia. Juégalos en la aplicación Travel (viajes sin mapa) o sobre un mapa en el Hexmapper.',
  },
  tabs: { rules: 'Reglas', checks: 'Comprobaciones', yaml: 'YAML' },
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
      'Hexes cuyo terreno el mapa marca como **agua** (Hexmapper: Editar paleta → Agua) y que no tienen regla propia en Terrenos.\nNormalmente **no se cruzan** a pie; una forma de viajar cuyo **Solo por** se cumple en el agua sí puede navegarlos:\n• una barca: `water: true`\n• una barca que además bordea la costa: `any: [{ water: true }, { terrain: coast }]`\nUn terreno listado en Terrenos (un `lake` helado con **Abierto cuando** `season: winter`) usa su propia regla.',
    day: 'El día',
    dayHelp:
      'Cuándo empieza el día y cuándo cae la noche, como horas:\n• **Alba** `06:00` — se tiran las comprobaciones del alba y se puede empezar a marchar\n• **Anochecer** `20:00` — nadie marcha después; el grupo acampa (o hace la acción de la noche del sistema)\nCon 8 horas de marcha, un grupo que sale al alba para a las 14:00 aunque falte mucho para la noche.',
    start: 'Alba',
    nightfall: 'Anochecer',
    hoursPerDay: 'Horas de marcha al día',
    night: 'Al anochecer, esperando',
    nightHelp:
      'Lo que hace el grupo cuando cae la noche **mientras el tiempo avanza solo**: el reloj del mundo avanzando con un viaje en marcha, o una orden de viajar que llega a la noche. Una de las acciones del sistema:\n• `camp` — por defecto, si el sistema la tiene\n• otra acción, p. ej. `watch`\n• ninguna — la noche simplemente pasa\nSi la acción **no se puede hacer** (su **Solo si** / **Salvo si**, o un valor que la bloquea), la noche pasa sin ella y el diario dice por qué; un grupo al que mandas viajar al anochecer hace lo mismo y sigue marchando al alba.\n• camp con **Solo si** `party.resources.food: { gte: 1 }` — un grupo sin comida duerme a la intemperie, sin el alivio de una noche bien comidos',
    nightDefault: 'camp, si existe',
    nightNone: 'nada: la noche pasa',
    hoursPerDayHelp:
      'Cuánto puede marchar el grupo cada día antes de tener que parar, aunque falte mucho para la noche.\n• `8` — una jornada larga a pie\n• `10` — a marchas forzadas\nEl tiempo de las acciones (descansar, buscar comida) no cuenta como marcha.',
    modes: 'Formas de viajar',
    modesHelp:
      'Formas de viajar: a pie, a caballo, en barca… Cada una tiene una velocidad en **km por día de marcha** en terreno fácil (los terrenos y caminos la cambian) y puede limitarse a algunos sitios y momentos.\n• `foot` — 24 km al día\n• `horse` — 40 km al día, **Salvo si** `weather: snow`\n• `boat` — 50 km al día, **Solo por** `water: true`\nEl panel del viaje deja al jugador cambiar de una a otra.',
    kmPerDay: 'km por día',
    name: 'Nombre',
    nameHelp:
      'Lo que leen los jugadores en el panel del viaje y el diario en lugar del id:\n• `horse` → _A caballo_\n• `food` → _Raciones_\nSe escribe en el idioma actual: el del pack, o su fichero de traducción (`locales/<idioma>/`) si la interfaz está en otro. Vacío: el id (o el nombre de la aplicación para los habituales: foot, horse, food…).',
    allowedTerrains: 'Solo por',
    allowedTerrainsHelp:
      'Por dónde puede ir esta forma de viajar: una condición sobre **cada hex en el que entra** (su terreno, agua, etiquetas, región, campos, los caminos o ríos del paso).\n• una barca: `water: true`\n• una barca que además sigue la costa: `any: [{ water: true }, { terrain: coast }]`\n• un carro solo por camino: `edges: road`\n• una montura que evita los bosques: `not: { terrain: [forest, dense-forest] }`\nDonde se cumple, ni los terrenos cerrados la paran. Vacío: por donde dejen los terrenos.',
    anyTerrain: 'por donde dejen los terrenos',
    terrains: vocabulary.es.terms.terrains,
    terrainsHelp:
      'Cómo cambia la velocidad cada terreno, y si se puede entrar. Los ids son los que usa el mapa:\n• `forest` × `0.5` — a la mitad\n• `plains` × `1` — velocidad normal\n• `peaks` × `0.25`, **Abierto cuando** `season: summer`\nLos terrenos no listados usan **Velocidad × de los terrenos no listados**.',
    terrain: vocabulary.es.terms.terrain,
    multiplier: 'Velocidad ×',
    multiplierHelp:
      'Lo rápido que se cruza este terreno, comparado con el terreno fácil:\n• `1` — velocidad normal\n• `0.5` — a la mitad (bosque, colinas)\n• `0.25` — a un cuarto (montañas)\n• `2` — el doble de rápido\nCon 24 km al día y hexes de 12 km, un hex de bosque (`0.5`) lleva un día entero de marcha.',
    passable: 'Transitable',
    passableHelp:
      '**Sin marcar**: ninguna forma de viajar puede entrar (las rutas lo rodean), salvo una cuyo **Solo por** se cumpla allí (una barca en un lago).\n**Marcado**, aún puede abrirse o cerrarse con una condición:\n• **Abierto cuando** `season: winter` — un lago que se cruza sobre el hielo\n• **Cerrado cuando** `weather: [snow, storm]` — un paso cerrado por el clima',
    openWhen: 'Abierto cuando',
    closedWhen: 'Cerrado cuando',
    passableWhenHelp:
      'Cuándo se puede entrar en el terreno, como condición sobre **el hex al que se entra y el momento**: su terreno, etiquetas, región, campos, los caminos o ríos del paso, la forma de viajar, el clima, la estación y el calendario, los valores del día.\n• **Abierto cuando** `season: winter` — solo mientras se cumple: un lago que se cruza sobre el hielo\n• **Abierto cuando** `month: [1, 12]` — los dos meses más fríos del calendario\n• **Cerrado cuando** `any: [{ season: winter }, { weather: snow }]` — un paso de montaña\n• **Cerrado cuando** `mode: horse` — no para jinetes\nVacío: siempre abierto / nunca cerrado.',
    defaultTerrain: 'Velocidad × de los terrenos no listados',
    defaultTerrainHelp:
      'La velocidad de cualquier terreno que no esté arriba:\n• `1` — normal (lo que vale si está vacío)\n• `0.75` — el terreno desconocido es algo más lento\nUn mapa con un terreno que el sistema no conoce (`badlands`) usa esto.',
    edges: 'Caminos y ríos',
    edgesHelp:
      'Seguir un camino, sendero o río **de un hex al siguiente**: su velocidad sustituye a la del terreno.\n• `road` × `1.5` — la mitad más rápido que a campo abierto\n• `trail` × `1` — como a campo abierto, aunque cruce un bosque\n• `river` × `2` — río abajo en barca\nLas líneas no listadas no hacen nada. Las comprobaciones también las distinguen: `edges: road` en una condición.',
    edge: 'Línea',
    edgeMultiplierHelp:
      'Velocidad por esta línea, en lugar de la del terreno:\n• `1.5` — la mitad más rápido que a campo abierto\n• `1` — velocidad de campo abierto, sea cual sea el terreno\nUn camino por un bosque (`0.5`) con `1.5` es el triple de rápido que el bosque.',
    resources: vocabulary.es.terms.supplies,
    resourcesHelp:
      'Lo que lleva el grupo: comida, forraje, agua, antorchas… Qué lo gasta lo decide **el sistema**, nunca la aplicación:\n• una acción al final de cada día come: `effects: { party.resources.food: -1 }`\n• una entrada de tabla encuentra: `effects: { party.resources.food: 2 }`\n• una comprobación sin comida cansa: **Solo si** `below: food`\nEl panel del viaje muestra cada una y deja al jugador cambiarla a mano.',
    min: 'Mín',
    minHelp:
      'Los efectos nunca lo bajan de aquí: un cambio más allá se queda ahí, el diario lo dice («La comida no puede bajar de 0»), y los pasos siguientes y las comprobaciones de ese día ven `below: [su id]`.\n• comida con Mín `0` — comer sin nada se queda en 0, y una comprobación day-end con **Solo si** `below: food` cansa al grupo\n• oro sin Mín — puede ser negativo, como una deuda',
    max: 'Máx',
    maxHelp:
      'Los efectos nunca lo suben de aquí; los pasos y comprobaciones siguientes ven `above: [su id]`.\n• agua con Máx `4` — un odre lleno no admite más\n• moral con Máx `5` — un festín no la sube de 5\nVacío: sin máximo.',
    olderEating:
      'Estas reglas comen a la manera antigua (provisiones gastadas “al día”, formas de viajar que gastan provisiones o pasos que comen las provisiones del día). Se siguen jugando igual; convertirlas lo escribe como una acción que el sistema hace al final de cada día, con Mín 0 en las provisiones.',
    olderEatingConvert: 'Convertir',
    weather: vocabulary.es.terms.weather,
    weatherHelp:
      'Cómo frena cada clima al grupo. Las tablas lo fijan con `set: { weather: … }` (normalmente al alba), o un modelo de clima con inercia.\n• `storm` × `0` — ese día no se viaja\n• `heavy-rain` × `0.5` — a media velocidad\n• `fog` × `0.75`\nLos climas no listados no cambian la velocidad; las condiciones aún pueden leerlos (`weather: storm`).',
    weatherState: vocabulary.es.terms.weather,
    speed: 'Velocidad ×',
    speedHelp:
      'A qué velocidad marcha el grupo con este clima:\n• `0` — ese día no se viaja (es un día perdido)\n• `0.5` — a media velocidad\n• `1` — como siempre',
    actions: 'Acciones',
    actionsHelp:
      'Lo que puede hacer el grupo además de marchar: **acampar**, **descansar** y las propias del sistema (buscar comida, rezar, hablar con los mercenarios…), cada una un botón en el panel del viaje, o hecha por el propio sistema (**Sola en**).\nCada una dice cuándo se puede hacer (**Solo si** / **Salvo si**, **Una vez al día**) y qué hace, **paso a paso**:\n• descansar: `time: 120`, luego `effects: { party.stats.fatigue: -1 }`\n• buscar comida: `time: 180`, `speed: 0.5`, su comprobación en `forage`\n• comer, sola en `day-end`: `effects: { party.resources.food: -1 }`',
    oncePerDay: 'Una vez al día',
    modeWhenHelp:
      'Cuándo se puede elegir (**Solo si**) o no (**Salvo si**), como condición sobre dónde está el grupo y el momento.\n• una barca solo a la orilla: `any: [{ water: true }, { tags: ferry }]`\n• sin caballos con nieve: **Salvo si** `weather: snow`\n• un carro solo en verano: **Solo si** `season: summer`\nVacío: siempre. Un valor del día también puede bloquearla (**Bloquea** `mode.<id>`).',
    values: 'Valores del día',
    valuesHelp:
      'Valores que las tablas y acciones de este sistema pueden poner **para el resto del día**, con lo que bloquean mientras se cumplen. Las tablas los leen al día siguiente como `yesterday.<id>`.\n• `lost` — lo pone `set: { lost: true }`, bloquea `travel`\n• `snowbound` — bloquea `mode.horse`\n• `refusing` — bloquea `travel` hasta que una acción lo quita (`set: { refusing: false }`)\nSin ninguno, sigue funcionando el antiguo `lost` integrado (bloquea el viaje).',
    blocks: 'Bloquea',
    blocksHelp:
      'Lo que no se puede hacer mientras se cumple el valor:\n• `travel` — no se marcha más hoy\n• el id de una acción, p. ej. `camp` o `forage` — su botón se desactiva\n• `mode.<id>`, p. ej. `mode.horse` — esa forma de viajar: no se puede elegir, y un grupo que ya viaja así se detiene hasta que cambie\nLa caja sugiere lo que declara este sistema. Los botones bloqueados siguen visibles, desactivados, diciendo por qué.',
    blocksNothing: 'nada',
  },
  actions: {
    when: 'Solo si',
    unless: 'Salvo si',
    whenHelp:
      'Cuándo se puede hacer la acción (**Solo si**) o no (**Salvo si**), con condiciones como las de las tablas:\n• `weather: storm` — el clima de hoy\n• `terrain: [forest, hills]` — el hex donde está el grupo\n• `tags: shrine` — una etiqueta de ese hex\n• `party.stats.fatigue: { lt: 2 }` — el grupo\n• `party.resources.food: { gte: 1 }` — queda comida\n• `refusing: true` — un valor del día\n• `moons.ember: full` — el calendario\nSi no, su botón sale desactivado y dice por qué; la acción de la noche del sistema que no se puede hacer deja pasar la noche sin ella.',
    nothing: 'Cuando no se aplica nada',
    nothingHelp:
      'Lo que dice el diario cuando **no se aplica ninguna de sus comprobaciones** donde está el grupo; `{terrain}` es el terreno del hex.\n• `no hay nada que buscar en {terrain}` → «no hay nada que buscar en Colinas»\nVacío: una frase genérica. Una acción sin comprobaciones no dice nada más.',
    nothingPlaceholder: 'no hay nada que encontrar en {terrain}',
    steps: 'Qué hace',
    stepsHelp:
      "Lo que hace la acción, **un paso por caja, en orden**, cada uno escrito como en el YAML:\n• `time: 180` — pasan tres horas (o `time: dawn`, `time: nightfall`, `time: '14:00'`)\n• `speed: 0.5` — lo que queda de marcha hoy va a media velocidad\n• `effects: { party.stats.fatigue: -1 }` — cambia el grupo (un número suma o resta; `'=0'` lo fija)\n• `set: { lost: true }` — da un valor del día\n• `do: forage` — hace otra acción (si se cumplen sus condiciones)\n• `roll: ENCOUNTER_CHECK_REQUIRED` — tira una comprobación ya\nUn cambio más allá del **Mín** o **Máx** de un valor se queda ahí, y los pasos siguientes ven `below: [id]` o `above: [id]`.\nLa caja junto a cada paso es **su condición**: el paso solo ocurre cuando se cumple.\n• `below: food` — solo si la comida llegó hoy a su mínimo\n• `party.stats.morale: { lte: 1 }` — solo con la moral baja\n• `moment: hex-enter` — solo cuando la acción llegó en ese momento\nLas acciones que siguen a esta, y sus comprobaciones (Comprobaciones → **Cuándo**: esta acción), van primero.",
    on: 'Sola en',
    onHelp:
      '**Vacío**: la hace el jugador, con un botón.\nSi no, los **momentos en que la hace el propio sistema**, si se cumplen sus condiciones; entonces no es un botón, y va antes de las comprobaciones de ese momento:\n• `day-start` — al alba\n• `hex-enter` — al entrar en cada hex\n• `day-end` — al acabar cada día, se acampe o no\n• el id de una acción, p. ej. `camp` — justo al empezar esa acción\nVarios, separados por comas: `day-start, hex-enter`. Sus condiciones ven cuál es como `moment` (`when: { moment: hex-enter }`).\nEjemplos:\n• comer al acabar cada día: `day-end`\n• los mercenarios refunfuñan al alba tras un día de hambre: `day-start` con **Solo si** `yesterday.hungry: true`',
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
      'Lo que leen los jugadores en el panel del viaje y el diario en lugar del id del evento:\n• `NAVIGATION_CHECK_REQUIRED` → _Perderse_\n• `HUNGER_CHECK_REQUIRED` → _Hambre_\nEsta caja lo edita en el idioma actual: el del pack, o su fichero de traducción si la interfaz está en otro.',
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
      'Cuándo se tira:\n• `day-start` — al alba, antes de marchar\n• `hex-enter` — al entrar en cada hex\n• `day-end` — al acabar cada día (tras las acciones day-end del sistema)\n• el id de una acción, p. ej. `camp` o `forage` — cuando el grupo la hace\nVarios, separados por comas: `hex-enter, rest`. Sus condiciones y su tabla ven cuál es como `moment` (`when: { moment: rest }`).\nVacío: solo cuando la tira un paso de una acción (`roll: <su evento>`).',
    atAction: 'Acción: {action}',
    when: 'Solo si',
    unless: 'Salvo si',
    conditionHelp:
      'Cuándo se tira la comprobación (**Solo si**) o se salta (**Salvo si**), en pares `clave: valor`, como en las tablas:\n• `terrain: forest` — el hex\n• `tags: landmark` — una etiqueta del hex\n• `edges: [road, river]` — el camino o río del paso\n• `danger: { gte: 2 }` — un valor del hex o de su región\n• `season: winter`, `weather: storm` — el momento\n• `party.resources.food: { lt: 1 }` — el grupo\n• `below: food` — la comida llegó hoy a su mínimo (en `day-end`)\n• `moment: rest` — cuál de sus momentos es (si tiene varios)\n• `any: [{ terrain: forest }, { danger: { gte: 3 } }]` — cualquiera de los dos',
    always: 'siempre',
    never: 'nunca',
    resolve: 'Se tira en',
    resolveHelp:
      'La tabla, oráculo, generador o mazo que la resuelve. Su resultado va al diario, y sus valores `set` y `effects` llegan al viaje.\n• `grey-marches/getting-lost` — pone `lost: true` con una mala tirada\n• un modelo de clima — el clima del día con inercia\n• **nada: espérame** — el viaje se detiene hasta que la resuelvas a mano',
    weatherModels: 'Clima con inercia',
    weatherModel: 'Modelo de clima: {model}',
    waits: '— nada: espérame —',
    effects: 'Cambios',
    effectsHelp:
      "Lo que cambia la propia comprobación cuando sale, con o sin tabla:\n• `party.stats.fatigue: 1` — suma 1\n• `party.resources.food: -1` — quita 1\n• `party.stats.fatigue: '=0'` — lo fija\nEs como un sistema escribe sus reglas como datos, p. ej. un día sin comida suficiente: **Cuándo** `day-end`, **Solo si** `below: food`, **Cambios** `party.stats.fatigue: 1`.",
    pause: 'Pausar después',
    pauseHelp:
      'El viaje **se detiene** cuando sale esta comprobación (tras tirarla, si algo la resuelve) y espera a que pulses **Continuar**: tiempo para describir el lugar, escribir lore o decidir algo.\n• un santuario encontrado por el camino\n• un hito que describir\nUna entrada de tabla también puede pausar, solo cuando sale (`pause: true` en la entrada).',
    context: 'Contexto extra',
    contextHelp:
      'Valores que la tabla ve **solo en esta comprobación**, escritos como pares `clave: valor`:\n• `timeOfDay: night` — un encuentro nocturno tirado en la tabla de día\n• `danger: 3` — como si el hex fuera más peligroso',
    none: 'Sin comprobaciones: los viajes solo gastan tiempo y provisiones.',
    add: 'Añadir una comprobación',
    orphans: 'Tablas asociadas a comprobaciones que estas reglas no tienen: {events}.',
    removeOrphans: 'Quitarlas',
    stats: 'Características del grupo',
    statsHelp:
      'Números del grupo que pueden usar las tablas, editados durante el viaje:\n• `survival` — en una tirada: `1d6 + {{survival}}`\n• `morale` — en una condición: `party.stats.morale: { lte: 1 }`\n• `fatigue` — lo cambian los efectos: `party.stats.fatigue: 1`',
    statName: 'Nombre',
    statDescription: 'Descripción',
    statDefault: 'Empieza en',
    noStats: 'Sin características del grupo.',
    addStat: 'Añadir una característica',
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
      'Las reglas Genéricas vienen integradas y no se pueden editar. Crea un sistema nuevo (debajo de la lista de la izquierda) para hacer el tuyo a partir de ellas.',
    playInTravel: 'Jugarlo en Travel →',
  },
  yaml: { line: 'línea {line}' },
  terrains: vocabulary.es.terrains,
  edgeKinds: vocabulary.es.pathKinds,
  storage: {
    full: 'El almacenamiento del navegador está lleno: exporta tus packs para no perderlos.',
  },
}

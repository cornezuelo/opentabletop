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
    import: 'Importar un sistema (.zip)…',
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
  tabs: {
    overview: 'Resumen',
    rules: 'Reglas',
    checks: 'Comprobaciones',
    sheet: 'Hoja',
    factions: 'Facciones',
    calendar: 'Calendario',
    weather: 'Clima',
    modes: 'Modos de tirada',
    try: 'Pruébalo',
    yaml: 'YAML',
  },
  parts: {
    factions: {
      title: 'Sus facciones',
      intro:
        'Los poderes de su mundo (`kind: factions`): cada uno, un personaje de una hoja (sus valores, estados y relaciones) que tiene tierras en un mapa. En cada turno del mundo cada uno tira una tabla, y lo que sale lo cambia a él, a otra facción, su territorio o los relojes de progreso del reloj del mundo. En el Hexmapper se traen a un mapa desde el panel Mundo.',
      help: 'Una definición de facciones por sistema, nombrada en su **Resumen** (`factions:`). Las tablas y condiciones las leen en todas partes:\n• `factions.the-crown.values.strength: { gte: 3 }`\n• `hex.faction: the-crown` — quién tiene el hex\nSus tablas de turno las cambian con efectos:\n• `faction.values.strength: 1` — la facción a la que le toca\n• `factions.the-rebels.values.strength: -1` — otra\n• `faction.territory: 1` — un hex más, desde su frontera\n• `world.clocks.the-siege: 1` — un reloj de progreso del reloj del mundo',
      none: 'Este sistema no tiene facciones.',
      create: 'Nuevas facciones',
    },
    sheet: {
      title: 'La hoja de sus personajes',
      intro:
        'Lo que tiene cada personaje del grupo: valores con sus límites, estados y las relaciones que mantiene. Con una hoja, el grupo de un viaje puede estar hecho de personajes, y la pestaña **Comprobaciones** dice qué características del grupo salen de ellos y qué provisiones llevan.',
      help: 'Una hoja por sistema (`kind: sheet`), nombrada en su **Resumen** (`sheet:`). Las condiciones y las tablas leen cada personaje:\n• `characters.kael.values.health: { lte: 1 }` — uno por su id\n• `acting.values.wits: { gte: 3 }` — el que actúa ahora\n• `party.members: kael` — si Kael viaja con el grupo\nLos efectos los cambian:\n• `party.members.values.health: -1` — a todos los miembros\n• `acting.conditions.wounded: true` — al que actúa\nSin hoja, el grupo se juega como un todo.',
      none: 'Este sistema no tiene hoja: su grupo se juega como un todo.',
      create: 'Nueva hoja',
    },
    calendar: {
      title: 'El calendario del sistema',
      intro:
        'El calendario con el que sus viajes y el reloj del mundo nombran el tiempo: meses y sus estaciones, días de la semana, lunas y fiestas.',
      help: 'Un calendario por sistema (`kind: calendar`), nombrado en su **Resumen**. Las tablas y comprobaciones leen lo que dice de cada momento:\n• `month: seedtime`, `weekday: fairday`, `year: { gte: 1022 }`\n• `moons.silver: full`\n• `holidays: lantern-night`\nSin él, el calendario por defecto cuenta días y cuatro estaciones de 90 días.',
      none: 'Este sistema no tiene calendario: usa el de por defecto (días y cuatro estaciones).',
      create: 'Nuevo calendario',
    },
    weather: {
      title: 'Sus modelos de clima',
      intro:
        'Clima con inercia: hoy sigue a ayer, con probabilidades por estación. Una comprobación cuyo binding nombra un modelo lo tira (`weather: highland-skies`).',
      help: 'Modelos de clima (`kind: weather`) que pueden nombrar los bindings del sistema, enumerados en su **Resumen**. Cada tipo de clima puede fijar valores del día (`set: { snowed-in: true }`) que leen las condiciones; el clima del día es `weather` en tablas y condiciones:\n• `weather: storm`\n• `weather: [rain, storm]`',
      none: 'Este sistema no nombra modelos de clima.',
      create: 'Nuevo modelo de clima',
    },
    modes: {
      title: 'Los modos de tirada de sus packs',
      intro:
        'Formas de tirar sus tablas: ventaja, desventaja o las tuyas (tres tiradas quedándose con la del medio…). Las tablas las ofrecen con `modes:` y las usan solas con `modeWhen:`.',
      help: 'Modos de tirada (`kind: roll-modes`) de los packs que trae el sistema, primero el suyo; los de un pack incluido son de solo lectura (**Editar una copia**). Una tabla los usa:\n• `modes: [advantage, disadvantage]` — se ofrecen al tirar a mano\n• `modeWhen: { advantage: { explorer: { gte: 1 } } }` — solo cuando se cumple',
      none: 'Los packs de este sistema no declaran modos de tirada.',
      create: 'Nuevos modos de tirada',
    },
  },
  factionsForm: {
    name: 'Nombre',
    nameHelp: 'Cómo se llaman estas facciones en conjunto.\n• **Los poderes del reino**',
    sheet: 'Su hoja',
    sheetHelp:
      'La hoja con la que se hace cada facción (`kind: sheet`): sus valores (fuerza, riqueza…), estados (en guerra…) y tipos de relación (aliado, rival). Puede ser la de los personajes o una propia.',
    turn: 'Su turno',
    turnHelp:
      'Lo que tira cada facción en un turno del mundo (una tabla, oráculo, generador o mazo), con sus propios valores como `faction.*`:\n• `faction-turn` — una tabla de este pack\n• `core/faction-turn` — la de Core, para cualquier juego: crece, aguanta o pierde terreno',
    every: 'Cada (días)',
    everyHelp:
      'Días del reloj del mundo entre turnos. Vacío o 0: solo a mano (el **Turno del mundo** del Hexmapper).\n• `7` — un turno a la semana',
    byHand: 'a mano',
    factions: 'Facciones',
    factionsHelp:
      'Cada facción, con un id con el que la leen las tablas (`factions.<id>.*`): su nombre, su color en el mapa, sus valores iniciales, dónde empieza y, si la tiene, una tabla de turno propia.',
    factionName: 'Nombre',
    color: 'Color',
    colorHelp: 'Su color en el mapa, como `#rrggbb`.\n• `#8b1e1e`',
    values: 'Empieza con',
    valuesHelp:
      'Valores iniciales de su hoja, como pares `clave: valor`; el resto, los de por defecto de la hoja.\n• `strength: 4, reputation: -1`',
    regions: 'Regiones',
    regionsHelp:
      'Empieza teniendo todos los hexes de estas regiones del mapa (por su nombre), separadas por comas.\n• `The Hollow Hills`',
    hexes: 'Hexes',
    hexesHelp: 'Y estos hexes (columna,fila), separados por comas.\n• `15,9`',
    ownTurn: 'Turno propio',
    ownTurnHelp: 'Una tabla de turno propia, en vez de la de las facciones.\n• `clan-turn`',
  },
  sheet: {
    name: 'Nombre',
    nameHelp: 'El nombre de la hoja, que se ve donde se crean personajes.\n• **Compañero**',
    values: 'Valores',
    valuesHelp:
      "Números que tiene cada personaje, con los límites que les da el sistema (ninguno: sin límite, puede bajar de cero). Las tablas y condiciones los leen como `characters.<id>.values.<valor>` y `acting.values.<valor>`:\n• `wits` — empieza en `2`, mín. `0`, máx. `5`\n• `health` — máx. `'{{maxHealth}}'`: otro valor es su límite\n• `stress` — un **contador** de 9 casillas",
    valueName: 'Nombre',
    default: 'Empieza en',
    defaultHelp: 'Lo que tiene un personaje nuevo (vacío: 0).\n• `2`',
    min: 'Mín.',
    max: 'Máx.',
    boundHelp:
      "Los efectos nunca lo llevan más allá. Un número, u otro valor de la hoja entre llaves:\n• `0`\n• `'{{maxHealth}}'` — tan alto como el maxHealth del personaje\nVacío: sin límite.",
    track: 'Contador',
    trackHelp:
      'Se muestra como casillas, tantas como su máximo (estrés, experiencia, un juramento). Necesita un número como máximo.',
    group: 'Grupo',
    groupHelp: 'Un encabezado bajo el que se muestra, nada más.\n• `attributes`\n• `meters`',
    groups: 'Grupos',
    groupsHelp:
      'Los encabezados bajo los que se muestran los valores, en este orden, con un nombre en cada idioma. Un valor dice su grupo en su columna **Grupo**.\n• `skills` — **Habilidades**\n• `body` — **Cuerpo**',
    groupName: 'Nombre',
    conditions: 'Estados',
    conditionsHelp:
      'Estados que un personaje tiene o no (herido, hambriento, un trauma). Cada uno puede bloquear cosas a todo el grupo mientras alguien lo tenga. Los efectos los ponen y los quitan, las condiciones los leen:\n• `acting.conditions.wounded: true` — el personaje que actúa queda herido\n• `characters.mara.conditions: wounded` — si Mara lo está\n• `unless: { conditions: wounded }` en una característica del grupo — cuenta solo a los que no están heridos',
    conditionName: 'Nombre',
    blocks: 'Bloquea',
    blocksHelp:
      'Lo que el grupo no puede hacer mientras algún miembro lo tenga, separado por comas:\n• `travel` — no se marcha\n• `forced-march` — una acción del sistema\n• `mode.horse` — una forma de viajar\nEl viaje dice quién lo tiene.',
    relations: 'Tipos de relación',
    relationsHelp:
      'Relaciones que un personaje puede tener con cualquier cosa que tenga referencia (otro personaje, un lugar, una facción, una nota), como los vínculos de Ironsworn. Un tipo con límites lleva un número:\n• `bond` — mín. `0`, máx. `10`\n• `home` — sin número',
    relationName: 'Nombre',
    relationMin: 'Número desde',
    relationMax: 'hasta',
    relationValueHelp:
      'Los límites del número que lleva una relación de este tipo; los dos vacíos: ninguno.',
  },
  calendar: {
    name: 'Nombre',
    nameHelp: 'El nombre del calendario, que se muestra junto a sus fechas.\n• **El cómputo real**',
    startYear: 'Año del día 1',
    startYearHelp: 'El año en el que cae el primer día de juego (por defecto 1).\n• `1021`',
    startMonth: 'El día 1 cae en',
    startHelp:
      'El mes y el día del primer día de juego (por defecto el primer día del primer mes). Un viaje que empieza en una estación empieza el primer día de esa estación.',
    firstMonth: 'el primer mes',
    startDay: 'el día',
    hoursPerDay: 'Horas del día',
    hoursPerDayHelp: 'Lo que dura un día (por defecto 24).\n• `30` — un mundo de días más largos',
    watchHours: 'Horas por guardia',
    watchHoursHelp:
      'Divide el día en guardias, que las tablas leen como `watch` (1, 2…).\n• `4` — seis guardias al día\nVacío: sin guardias.',
    dawn: 'Alba',
    dawnHelp:
      'Cuándo empieza el día y cae la noche, para «hasta el alba» y «hasta el anochecer» del reloj del mundo (las reglas de viaje tienen los suyos).\n• `06:00` y `20:00`',
    dusk: 'Anochecer',
    months: 'Meses',
    monthsHelp:
      'Los meses de un año, en orden, cada uno con sus días y su estación (la estación que leen las tablas mientras dura):\n• `seedtime` — **Siembra**, 30 días, `spring`\nLas estaciones son cualquier nombre: las cuatro de siempre, o las de tu mundo (`wet`, `dry`).',
    itemName: 'Nombre',
    days: 'Días',
    season: 'Estación',
    seasonHelp: 'La estación durante este mes: `spring`, `summer`, `autumn`, `winter`, o la tuya.',
    yearDays: 'Un año de {days} días.',
    weekdays: 'Días de la semana',
    weekdaysHelp:
      'Los días de la semana, en orden; las tablas leen `weekday: fairday`. Vacío: sin semana.',
    moons: 'Lunas',
    moonsHelp:
      'Las lunas y sus fases (nueva, creciente, llena, menguante), que se leen como `moons.<id>: full`.\n• `moon` — 28 días\n• `red` — 45 días, desfase 20',
    cycle: 'Ciclo (días)',
    cycleHelp: 'Días de una luna nueva a la siguiente.',
    offset: 'Desfase',
    offsetHelp: 'El día de su ciclo en el día 1 (por defecto 0: nueva el día 1).',
    holidays: 'Fiestas',
    holidaysHelp:
      'Días fijos del año, que se leen como `holidays: lantern-night` (una lista, porque pueden caer varias el mismo día).',
    month: 'Mes',
    day: 'Día',
  },
  weather: {
    name: 'Nombre',
    nameHelp: 'El nombre del modelo.\n• **Cielo de montaña**',
    states: 'Tipos de clima',
    statesHelp:
      'Cada tipo de clima que puede dar el modelo, por su id (lo que las tablas leen como `weather`), con su nombre para el diario y lo que fija para el día:\n• `storm` — **Tormenta**, fija `stormy: true`\n• `snow` — fija `snowed-in: true`, con lo que las reglas de viaje pueden bloquear una forma de viajar',
    stateName: 'Nombre',
    set: 'Fija para el día',
    setHelp:
      'Valores del día que fija este clima, como pares `clave: valor`:\n• `climbModifier: -1`\n• `snowed-in: true`',
    setNothing: 'nada',
    season: 'Estación: {season}',
    start: 'Empieza como',
    startHelp:
      'El clima del primer día de un viaje en esta estación, y siempre que el de ayer no tenga fila.',
    startWeights: 'pesos (en YAML)',
    fromTo: 'Ayer ↓ / hoy →',
    matrixHelp:
      'Para cada clima de ayer (filas), cuán probable es cada clima hoy (columnas): pesos, no porcentajes; vacío es 0.\n• Fila **Lluvia**: `rain 3`, `grey 2`, `storm 1` — la lluvia se asienta y a veces se vuelve tormenta\nUna fila vacía vuelve a empezar como empieza la estación.',
    shares: 'En muchos días',
    sharesHelp:
      'Con qué frecuencia sale cada clima en esta estación a lo largo de muchos días, según los pesos de arriba: para comprobar que la estación se siente bien.',
    flowerStart: 'Empieza en',
    flowerStartHelp:
      'El clima en el que empieza el primer día: la casilla con él más cercana al centro. Vacío: la casilla del centro.',
    flowerMiddle: 'el centro',
    edge: 'En el borde',
    edgeHelp:
      'Cuando un día saldría de la flor: **vuelve por el lado opuesto** (por la misma línea), o **se queda** donde está.',
    edgeWrap: 'vuelve por el lado opuesto',
    edgeStay: 'se queda',
    flowerHelp:
      'Una flor hexagonal: 19 casillas, cinco filas de 3, 4, 5, 4 y 3. Cada día 2d6 mueve el clima una casilla: 2–3 al noreste, 4–5 al este, 6–7 al sureste, 8–9 al suroeste, 10–11 al oeste, 12 al noroeste (un pack puede cambiarlo con `moves` en el YAML). Pon los climas duros arriba y los buenos abajo: las tiradas del medio derivan al sureste, hacia el buen tiempo.',
    toFlower: 'Convertir en flor hexagonal',
    toFlowerConfirm: '¿Cambiar los pesos de esta estación por una flor hexagonal?',
    toWeights: 'Usar pesos',
    toWeightsConfirm: '¿Cambiar la flor hexagonal de esta estación por pesos?',
    newSeason: 'Estación',
    addSeason: 'Añadir una estación',
  },
  modes: {
    title: 'Modos de tirada',
    help: 'Cada modo hace la tirada entera varias veces y se queda con una:\n• `advantage` — 2 tiradas, la más alta, anula `disadvantage`\n• `careful` — 3 tiradas, la del medio',
    name: 'Nombre',
    description: 'Descripción',
    repeat: 'Tiradas',
    repeatHelp: 'Cuántas veces se hace la tirada entera.',
    keep: 'Quedarse con',
    keepHelp:
      'Qué total se queda: `highest` (el más alto), `lowest` (el más bajo) o `middle` (el del medio; con un número par, el menor de los dos del medio).',
    cancels: 'Anula',
    cancelsHelp:
      'Modos con los que se anula: si se aplican los dos, no se aplica ninguno (una tirada normal).\n• `disadvantage`',
  },
  overview: {
    generic:
      'Las reglas Genéricas: viaje sencillo sin comprobaciones, integrado en las aplicaciones. No tienen definición que editar; crea un sistema nuevo para hacer el tuyo a partir de ellas.',
    implicit:
      'Este sistema viene de un pack antiguo: sus reglas de viaje forman un sistema con el nombre del pack, con sus bindings y su calendario. Declararlo escribe un system.yaml que nombra lo que usa, para que puedas elegir aquí sus partes y los packs que trae; se juega igual.',
    declare: 'Declararlo',
    name: 'Nombre',
    nameHelp:
      'El nombre del sistema, como lo muestran todas las aplicaciones (vacío: el nombre del pack).\n• **Caminos del desierto**\nSe escribe en el idioma actual: el del pack, o su fichero de traducción.',
    description: 'Descripción',
    descriptionHelp:
      'Para qué es el sistema, en pocas líneas; se muestra donde se elige. Markdown básico: `**negrita**`, `_cursiva_`, `` `código` ``, listas con `- `.\n• _Un desierto que se cruza en caravana, con el agua escasa y tormentas de arena._',
    parts: 'Sus partes',
    partsHelp:
      'Las definiciones con las que se juega el sistema, cada una por su id: de este pack (`default`) o de una dependencia (`core/default`).\n• **Reglas de viaje** — cómo va un viaje (`kind: travel-rules`); ninguna: las reglas Genéricas\n• **Bindings** — qué tabla responde a cada comprobación, y las características del grupo (`kind: bindings`)\n• **Calendario** — cómo se nombran los días, en los viajes y en el reloj del mundo (`kind: calendar`); ninguno: el de por defecto',
    travel: 'Reglas de viaje',
    travelHelp:
      'Cómo va un viaje: el día, las velocidades, las provisiones, las acciones, las comprobaciones (`travel: default`). **Abrir** las edita en la pestaña Reglas; **Crear** empieza unas nuevas a partir de las Genéricas.\n• ninguna — las reglas Genéricas',
    bindings: 'Bindings',
    bindingsHelp:
      'Qué tabla responde a cada comprobación, y las características del grupo (`bindings: default`). **Abrir** los edita en la pestaña Comprobaciones; **Crear** añade unos vacíos.\n• ninguno — cada comprobación espera al jugador',
    calendar: 'Calendario',
    calendarHelp:
      'Cómo nombran los días sus viajes y el reloj del mundo: meses, días de la semana, estaciones, lunas, fiestas (`calendar: royal-reckoning`, un `kind: calendar`).\n• ninguno — el calendario por defecto: días y cuatro estaciones',
    no: {
      travel: '(ninguna: las reglas Genéricas)',
      bindings: '(ninguno)',
      calendar: '(ninguno: el de por defecto)',
    },
    open: 'Abrir',
    create: 'Crear',
    weather: 'Modelos de clima',
    weatherHelp:
      'Los modelos de clima (`kind: weather`) que sus bindings pueden nombrar en una comprobación (`weather: highland-skies`), para que el clima del día tenga inercia: los de este pack y los de sus dependencias.\n• `weather: [highland-skies]`',
    noWeather: 'No hay modelos de clima en este pack ni en sus dependencias.',
    packs: 'Packs que trae',
    packsHelp:
      'Los packs cuyas tablas, oráculos, generadores y mazos vienen con el sistema: el suyo siempre, y las dependencias que marques (`packs: [core]`). Un mapa que se juega con el sistema los muestra en su panel del Oracle. Para traer otro pack, añádelo a las dependencias del pack (`pack.yaml`).',
    ownPack: 'el suyo · {count} para tirar',
    rollables: '{count} para tirar',
    noDependencies:
      'Este pack no tiene dependencias: añade una a su pack.yaml para traer las tablas de otro pack.',
    maps: 'Mapas de ejemplo',
    mapsHelp:
      'Mapas para jugar el sistema, guardados en su pack como ficheros de mapa (`.otd.json`, escritos por **Guardar** en el Hexmapper) y listados en `maps:`. El Hexmapper los ofrece en **Mapas → Mapas de ejemplo**, listos con este sistema elegido.\n• `maps: [maps/frontier.otd.json]`\n**Añadir un fichero de mapa…** copia un mapa guardado en la carpeta `maps/` del pack; **Quitar** lo saca del pack.',
    noMaps: 'Sin mapas de ejemplo.',
    addMap: 'Añadir un fichero de mapa…',
    export: 'Llevarlo a otra parte',
    exportHelp:
      'Guarda el sistema en un solo .zip con todos los packs que necesita: el suyo, los que trae, los que tienen sus partes y sus dependencias. Otro navegador (u otra persona) lo recibe entero importando ese fichero.\n• **Importar un sistema (.zip)…**, bajo la lista de sistemas, lo vuelve a leer\n• el **Importar .zip** de la Oracle también lo lee\nLos packs que ya están sin cambios se dejan como están; una versión distinta de uno solo se sustituye si lo dices (↶ lo deshace).',
    exportIncludes: 'El fichero lleva: {packs}',
    exportButton: 'Exportar como .zip',
    exportPersonal: 'Incluye packs de uso personal: guárdate el fichero, no lo compartas.',
    openInHexmapper: 'Abrir en el Hexmapper →',
    confirmRemoveMap: '¿Quitar el mapa «{name}» del pack? Su fichero se va también.',
    mapError: {
      missing: 'El pack no tiene ese fichero',
      notJson: 'Ese fichero no es un mapa guardado (no es JSON).',
      notBundle: 'Ese fichero no es un mapa guardado de OpenTabletop.',
      noMap: 'Ese fichero no tiene ningún mapa.',
    },
  },
  forms: {
    confirmRemove:
      '¿Quitar «{name}»? Los formularios no lo pueden deshacer (edita el YAML para recuperarlo).',
    id: 'Id',
    add: 'Añadir',
    remove: 'Quitar',
    moveUp: 'Subir',
    moveDown: 'Bajar',
    idExists: 'Ya hay uno que se llama «{id}».',
    badFlow: 'Escríbelo como pares clave: valor, p. ej. tags: landmark o terrain: [forest, hills].',
    problems: 'Este fichero tiene {count} problemas: abre el YAML para verlos.',
  },
  rules: {
    water: 'Hexes de agua',
    waterHelp:
      'Hexes cuyo terreno el mapa marca como **agua** (Hexmapper: Editar paleta → Agua) y que no tienen regla propia en Terrenos.\nA menudo **no se cruzan**; una forma de viajar cuyo **Solo por** se cumple en el agua sí puede navegarlos:\n• una barca: `water: true`\n• una barca que además bordea la costa: `any: [{ water: true }, { terrain: coast }]`\nUn terreno listado en Terrenos (un `lake` helado con **Abierto cuando** `season: winter`) usa su propia regla.',
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
    hexKm: 'km por hex',
    hexKmHelp:
      'La escala a la que se juega el sistema: cuántos km mide un hex. Con las velocidades de sus formas de viajar, dice cuánto se tarda en un hex.\n• `30` — hexes grandes: más o menos uno al día para una forma de viajar que hace 30 km\n• `10` — hexes pequeños: varios al día\nLos viajes sin mapa (Travel, **Pruébalo**) se juegan a ella; un mapa con este sistema la toma, salvo que el mapa fije la suya (Hexmapper: Ajustes del mapa → Mapa). Vacío: la del mapa o la del camino, 10 por defecto.',
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
      'Lo rápido que se cruza este terreno, comparado con el terreno fácil:\n• `1` — velocidad normal\n• `0.5` — a la mitad\n• `0.25` — a un cuarto\n• `2` — el doble de rápido\nPor ejemplo, con una forma de viajar de 24 km al día y hexes de 12 km, un hex a `0.5` lleva un día entero de marcha.',
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
      'Velocidad por esta línea, en lugar de la del terreno:\n• `1.5` — la mitad más rápido que a campo abierto\n• `1` — velocidad de campo abierto, sea cual sea el terreno\nUn camino a `1.5` por un terreno a `0.5` es el triple de rápido que ese terreno.',
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
      'Lo que puede hacer el grupo además de marchar: **acampar**, **descansar** y las propias del sistema (buscar comida, rezar, hablar con los porteadores…), cada una un botón en el panel del viaje, o hecha por el propio sistema (**Automática en**).\nCada una dice cuándo se puede hacer (**Solo si** / **Salvo si**, **Una vez al día**) y qué hace, **paso a paso**:\n• descansar: `time: 120`, luego `effects: { party.stats.fatigue: -1 }`\n• buscar comida: `time: 180`, `speed: 0.5`, su comprobación en `forage`\n• comer, automática en `day-end`: `effects: { party.resources.food: -1 }`',
    oncePerDay: 'Una vez al día',
    modeWhenHelp:
      'Cuándo se puede elegir (**Solo si**) o no (**Salvo si**), como condición sobre dónde está el grupo y el momento.\n• una barca solo a la orilla: `any: [{ water: true }, { tags: ferry }]`\n• sin caballos con nieve: **Salvo si** `weather: snow`\n• un carro solo en verano: **Solo si** `season: summer`\nVacío: siempre. Un valor del día también puede bloquearla (**Bloquea** `mode.<id>`).',
    values: 'Valores del día',
    valuesHelp:
      'Valores que las tablas y acciones de este sistema pueden poner **para el resto del día**, con lo que bloquean mientras se cumplen. Las tablas los leen al día siguiente como `yesterday.<id>`.\n• `lost` — lo pone `set: { lost: true }`, bloquea `travel`\n• `snowed-in` — bloquea `mode.horse`\n• `mutinous` — bloquea `travel` hasta que una acción lo quita (`set: { mutinous: false }`)\nSin ninguno, sigue funcionando el antiguo `lost` integrado (bloquea el viaje).',
    blocks: 'Bloquea',
    blocksHelp:
      'Lo que no se puede hacer mientras se cumple el valor:\n• `travel` — no se marcha más hoy\n• el id de una acción, p. ej. `camp` o `forage` — su botón se desactiva\n• `mode.<id>`, p. ej. `mode.horse` — esa forma de viajar: no se puede elegir, y un grupo que ya viaja así se detiene hasta que cambie\nLa caja sugiere lo que declara este sistema. Los botones bloqueados siguen visibles, desactivados, diciendo por qué (salvo que la acción esté **Oculta si no se puede hacer**).',
    blocksNothing: 'nada',
  },
  actions: {
    when: 'Solo si',
    unless: 'Salvo si',
    whenHelp:
      "Cuándo se puede hacer la acción (**Solo si**) o no (**Salvo si**), con condiciones como las de las tablas:\n• `weather: storm` — el clima de hoy\n• `terrain: [forest, hills]` — el hex donde está el grupo\n• `tags: shrine` — una etiqueta de ese hex\n• `party.stats.fatigue: { lt: 2 }` — el grupo\n• `party.resources.food: { gte: 1 }` — queda comida\n• `mutinous: true` — un valor del día\n• `moons.silver: full` — el calendario\n• `daylight: true` — solo de día (entre el alba y el anochecer del sistema); `hour: { gte: 18 }` — desde las 18:00\n• `visits: 1` — la primera vez aquí; `around.terrain: lake` — junto a un lago\n• `doneToday: forage` — si hoy se buscó comida; `marched: { gte: 6 }` — tras 6 horas de marcha\n• `trip.km: { gte: 100 }`, `trip.taken.camp: { gte: 7 }`, `trip.spent.food: { gte: 10 }` — lo que lleva hecho el viaje\n• `party.stats.fatigue: { lt: '{{party.stats.endurance}}' }` — una variable: comparado con otro valor (entre comillas)\n• `party.stats.wits: { gte: '{{1d20}}' }` — una tirada: la misma durante todo el momento\n• `hex.terrain: forest`, `trip.weather: storm`, `time.daylight: true` — por **nombre completo** (`hex.*`, `time.*`, `trip.*`, `system.*`, `world.*`): los mismos valores, sin que los tape una característica con el mismo nombre\nSi no, su botón sale desactivado y dice por qué (o se oculta, con **Oculta si no se puede hacer**); la acción de la noche del sistema que no se puede hacer deja pasar la noche sin ella.",
    marchNote:
      'Marchar son los botones de Viajar, no un botón propio: Solo si / Salvo si dicen cuándo puede marchar el grupo, comprobado mientras marcha (se para en cuanto dejan de cumplirse). Su nombre y su descripción son los del primer botón de Viajar. No tiene pasos.',
    marchDefault: 'de día, durante las horas de marcha del día',
    hide: 'Oculta si no se puede hacer',
    hideHelp:
      '**Sin marcar**: su botón siempre está, desactivado (diciendo por qué) mientras no se puede hacer, así los botones no cambian de sitio.\n**Marcada**: su botón solo aparece mientras se puede hacer. Para acciones que solo tienen sentido de vez en cuando:\n• un rito solo en un santuario con luna llena\n• convencer a los porteadores solo mientras se niegan a marchar',
    nothing: 'Cuando no se aplica nada',
    nothingHelp:
      'Lo que dice el diario cuando **no se aplica ninguna de sus comprobaciones** donde está el grupo; `{terrain}` es el terreno del hex.\n• `no hay nada que buscar en {terrain}` → «no hay nada que buscar en Colinas»\nVacío: una frase genérica. Una acción sin comprobaciones no dice nada más.',
    nothingPlaceholder: 'no hay nada que encontrar en {terrain}',
    steps: 'Qué hace',
    stepsHelp:
      "Lo que hace la acción, **un paso por caja, en orden**, cada uno escrito como en el YAML:\n• `time: 180` — pasan tres horas (o `time: dawn`, `time: nightfall`, `time: '14:00'`)\n• `speed: 0.5` — lo que queda de marcha hoy va a media velocidad\n• `effects: { party.stats.fatigue: -1 }` — cambia el grupo (un número suma o resta; `'=0'` lo fija; `'-{{party.stats.mouths}}'`: tantos como otro valor, `'+{{1d3}}'`: una tirada; `party.members.values.health: 1`, `acting.conditions.wounded: false`: sus personajes)\n• `set: { lost: true }` — da un valor del día\n• `do: forage` — hace otra acción (si se cumplen sus condiciones)\n• `roll: ENCOUNTER_CHECK_REQUIRED` — tira una comprobación ya\n• `advance: 1` — avanza un hex (un tramo de un camino) por la ruta de golpe, sin que pase el tiempo: progreso por movimientos en vez de marchando (`advance: '{{party.stats.rank}}'`: tantos como un valor)\nUn cambio más allá del **Mín** o **Máx** de un valor se queda ahí, y los pasos siguientes ven `below: [id]` o `above: [id]`.\nLa caja junto a cada paso es **su condición**: el paso solo ocurre cuando se cumple.\n• `below: food` — solo si la comida llegó hoy a su mínimo\n• `party.stats.morale: { lte: 1 }` — solo con la moral baja\n• `moment: hex-enter` — solo cuando la acción llegó en ese momento\nLas acciones que siguen a esta, y sus comprobaciones (Comprobaciones → **Cuándo**: esta acción), van primero.",
    on: 'Automática en',
    onHelp:
      '**Vacío**: la hace el jugador, con un botón.\nSi no, los **momentos en que la hace el propio sistema**, si se cumplen sus condiciones; entonces no es un botón, y va antes de las comprobaciones de ese momento:\n• `day-start` — al alba\n• `hex-enter` — al entrar en cada hex\n• `day-end` — al acabar cada día, se acampe o no\n• el id de una acción, p. ej. `camp` — justo al empezar esa acción\nVarios, separados por comas: `day-start, hex-enter`. Sus condiciones ven cuál es como `moment` (`when: { moment: hex-enter }`).\nEjemplos:\n• comer al acabar cada día: `day-end`\n• los porteadores refunfuñan al alba tras un día de hambre: `day-start` con **Solo si** `yesterday.hungry: true`',
    onButton: 'nada: un botón para el jugador',
    onAfter: 'Tras: {action}',
    step: 'Paso',
    badStep:
      'Un paso hace una cosa: time: 60, speed: 0.5, effects: { … }, set: { … }, do: <acción>, roll: <comprobación> o advance: 1.',
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
    help: 'Qué se tira por el camino, cuándo y en qué tabla. Una comprobación sin tabla solo se apunta en el diario (con sus **Cambios**); solo **Pausar después** detiene el viaje.',
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
      "Cuándo se tira la comprobación (**Solo si**) o se salta (**Salvo si**), en pares `clave: valor`, como en las tablas:\n• `terrain: forest` — el hex\n• `tags: landmark` — una etiqueta del hex\n• `edges: [road, river]` — el camino o río del paso\n• `danger: { gte: 2 }` — un valor del hex o de su región\n• `season: winter`, `weather: storm` — el momento\n• `daylight: false` — solo de noche (pasado el anochecer del sistema, antes de su alba); `watch: 3` — la tercera guardia\n• `from.terrain: forest` — saliendo de un bosque; `visits: { gte: 2 }` — de vuelta\n• `clocks.the-flood: { gte: 4 }` — un reloj del reloj del mundo; `events: market-day` — el evento de hoy\n• `danger: { gt: '{{party.stats.stealth}}' }` — una variable: comparado con otro valor\n• `party.stats.wits: { gte: '{{1d20}}' }` — una tirada bajo una característica\n• `hex.terrain: forest`, `trip.weather: storm`, `time.daylight: true` — por **nombre completo** (`hex.*`, `time.*`, `trip.*`, `system.*`, `world.*`): los mismos valores, sin que los tape una característica con el mismo nombre\n• `party.resources.food: { lt: 1 }` — el grupo\n• `acting.values.survival: { gte: 2 }`, `characters.kael.conditions: wounded`, `party.members: kael` — sus personajes, cuando el sistema tiene hoja\n• `below: food` — la comida llegó hoy a su mínimo (en `day-end`)\n• `moment: rest` — cuál de sus momentos es (si tiene varios)\n• `any: [{ terrain: forest }, { danger: { gte: 3 } }]` — cualquiera de los dos",
    always: 'siempre',
    never: 'nunca',
    resolve: 'Se tira en',
    resolveHelp:
      'La tabla, oráculo, generador o mazo que la resuelve. Su resultado va al diario, y sus valores `set` y `effects` llegan al viaje.\n• `my-pack/getting-lost` — pone `lost: true` con una mala tirada\n• un modelo de clima — el clima del día con inercia\n• **sin tabla** — solo se apunta en el diario, con sus **Cambios**; marca **Pausar después** para resolverla a mano',
    weatherModels: 'Clima con inercia',
    weatherModel: 'Modelo de clima: {model}',
    waits: '— sin tabla —',
    olderFormat:
      'Este pack está escrito para un formato de pack antiguo. Se juega igual; actualizarlo escribe el formato de esta versión en su pack.yaml.',
    olderFormatPausing:
      'Este pack está escrito para un formato de pack antiguo, en el que una comprobación sin tabla ni cambios detenía el viaje por sí sola: {checks}. Se sigue jugando así; actualizarlo les escribe «Pausar después» y el formato nuevo en su pack.yaml.',
    olderFormatUpdate: 'Actualizar',
    effects: 'Cambios',
    effectsHelp:
      "Lo que cambia la propia comprobación cuando sale, con o sin tabla:\n• `party.stats.fatigue: 1` — suma 1\n• `party.resources.food: -1` — quita 1\n• `party.stats.fatigue: '=0'` — lo fija\n• `party.resources.food: '-{{party.stats.mouths}}'` — tantos como dice otro valor (una variable)\n• `party.members.values.health: -1`, `acting.conditions.wounded: true` — sus personajes (todos, el que actúa)\nEs como un sistema escribe sus reglas como datos, p. ej. un día sin comida suficiente: **Cuándo** `day-end`, **Solo si** `below: food`, **Cambios** `party.stats.fatigue: 1`.",
    pause: 'Pausar después',
    pauseHelp:
      'El viaje **se detiene** cuando sale esta comprobación (tras tirarla, si algo la resuelve) y espera a que pulses **Continuar**: tiempo para describir el lugar, escribir lore o decidir algo. Es lo único que hace que una comprobación detenga el viaje: sin ello, una sin tabla solo se apunta en el diario.\n• un santuario encontrado por el camino, tirado en su tabla\n• un hito que describir, sin tabla\nUna entrada de tabla también puede pausar, solo cuando sale (`pause: true` en la entrada).',
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
    statFrom: 'De los miembros',
    statFromHelp:
      'Con personajes en el grupo, la característica sale de las suyas (y los efectos sobre ella se sobrescriben); sin ellos, se guarda como cualquier otra. Una de:\n• `max: survival` — la mejor Supervivencia entre ellos\n• `min: stealth` — la peor\n• `sum: strength` — la de todos juntos\n• `count: true` — cuántos son\nAñade `when` / `unless` para contar solo a algunos, y `none` para cuando no cuenta nadie:\n• `count: true, unless: { conditions: wounded }` — los que no están heridos\n• `max: wits, when: { values.health: { gt: 0 } }, none: 0` — la mejor de los que siguen en pie\nNecesita una hoja (la pestaña **Hoja**).',
    statFromNone: 'la guarda el grupo',
    roles: 'Roles de viaje',
    rolesHelp:
      'Tareas que asumen los personajes del grupo durante el viaje (guiar, montar guardia, buscar comida…), al estilo de Forbidden Lands: en un viaje, cada rol se le da a un personaje, y las comprobaciones, tablas y acciones del sistema leen a quien lo tiene y le cambian cosas:\n• `roles.guide.values.pathfinding: { gte: 2 }` — el guía es lo bastante bueno\n• `modeWhen: { advantage: { roles.lookout.values.stealth: { gte: 2 } } }` — una tabla tirada con ventaja\n• `roles.lookout.values.health: -1` — un efecto sobre el vigía\nNecesita una hoja.',
    roleName: 'Nombre',
    roleDescription: 'Descripción',
    carried: 'Provisiones que llevan los miembros',
    carriedHelp:
      'Con personajes en el grupo, una provisión aquí es lo que llevan entre todos: el viaje muestra su suma, sus límites son la suma de los suyos, y lo que el viaje gasta o gana se reparte entre ellos. Sin personajes, el grupo la guarda como un todo.\n• **food**, llevada en `rations`, repartida por igual',
    noSheet: 'Este sistema aún no tiene hoja (la pestaña Hoja): el grupo se juega como un todo.',
    carriedSupply: 'Provisión',
    carriedIn: 'Llevada en',
    carriedInHelp:
      'El valor de la hoja de los miembros que guarda la parte de cada uno.\n• `rations`',
    share: 'Reparto',
    shareHelp:
      '**even** (por igual, lo normal): se quita a quien más tiene y se da a quien menos, de una en una.\n**order** (en orden): el primer miembro da (o recibe) todo lo que puede, luego el siguiente.',
    shareEven: 'even (por defecto)',
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
      'Las reglas Genéricas vienen integradas y no se pueden editar. Crea un sistema nuevo (debajo de la lista de la izquierda) para hacer el tuyo a partir de ellas; su pestaña YAML las enseña.',
    genericYaml:
      'Las reglas Genéricas, escritas como las escribiría un pack: sus reglas de viaje y la hoja de sus personajes. Solo lectura (vienen integradas); un sistema nuevo empieza con estas mismas reglas.',
    staleCopy:
      'Este sistema usa tu copia de «{pack}», y el «{pack}» incluido ha cambiado desde que la hiciste. Tu copia sustituye entero al pack incluido, así que lo que trae el nuevo (una tabla que este sistema nombra…) falta hasta que lo cojas:',
    staleTip:
      'Un pack que usa este sistema es tu copia de un pack incluido que ha cambiado desde entonces: ábrelo para coger o conservar cada cambio.',
    playInTravel: 'Jugarlo en Travel →',
  },
  try: {
    intro:
      'Un viaje sin mapa para probar el sistema mientras lo haces: describe un camino hex a hex y recórrelo. Juega las reglas tal como están ahora, así que un cambio en otra pestaña cuenta desde el siguiente paso; **Nuevo viaje** empieza de nuevo con los cambios también en el primer día. Estos viajes de prueba se guardan aparte de los de la aplicación Travel.',
  },
  yaml: { line: 'línea {line}' },
  terrains: vocabulary.es.terrains,
  edgeKinds: vocabulary.es.pathKinds,
  storage: {
    full: 'El almacenamiento del navegador está lleno: exporta tus packs para no perderlos.',
  },
}

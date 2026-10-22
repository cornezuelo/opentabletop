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
    help: 'Ayuda y manual',
    undo: 'Deshacer el último cambio en tus packs (Ctrl+Z)',
    redo: 'Rehacer (Ctrl+Shift+Z)',
    newSystem: 'Nuevo sistema',
    import: 'Importar un sistema (.zip)…',
    problems: '{count} problemas',
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
    clocks: 'Relojes',
    calendar: 'Calendario',
    weather: 'Clima',
    modes: 'Modos de tirada',
    try: 'Pruébalo',
    yaml: 'YAML',
  },
  parts: {
    clocks: {
      title: 'Sus relojes de progreso',
      intro:
        'Relojes de su mundo (`kind: clocks`): segmentos que se llenan según algo avanza (una amenaza, un plan, una temporada de saqueos), cada uno con lo que pasa cuando se llena. En el Hexmapper llegan con el reloj del mundo al ponerlo en marcha; los viajes, las tablas y los turnos de las facciones los llenan con efectos, y las condiciones los leen.',
      help: "Una definición de relojes por sistema, nombrada en su **Resumen** (`clocks:`). Las condiciones y las tablas leen cada uno por su id:\n• `world.clocks.the-wyrm-wakes: { gte: 6 }` — una vez lleno\nLos efectos lo llenan, desde un viaje, una tabla o el turno de una facción:\n• `world.clocks.the-wyrm-wakes: 1` — un segmento más\n• `world.clocks.the-wyrm-wakes: -2` — dos menos\n• `world.clocks.the-wyrm-wakes: '=0'` — vacío",
      none: 'Este sistema no declara relojes de progreso: se pueden seguir creando a mano en un mapa.',
      create: 'Nuevos relojes',
    },
    factions: {
      title: 'Sus facciones',
      intro:
        'Los poderes de su mundo (`kind: factions`): cada uno, un personaje de una hoja (sus valores, estados y relaciones) que tiene tierras en un mapa. En cada turno del mundo cada uno tira una tabla, y lo que sale lo cambia a él, a otra facción, su territorio o los relojes de progreso del reloj del mundo. Su tierra son los hexes que tienen en un mapa: cada uno empieza con las regiones escritas aquí (en cualquier mapa que las tenga) y los hexes (solo en el mapa en el que están) cuando un mapa las trae (el panel Mundo del Hexmapper); desde entonces es del mapa, se pinta a mano allí y se gana o se pierde hex a hex en los turnos del mundo.',
      help: 'Una definición de facciones por sistema, nombrada en su **Resumen** (`factions:`). Las tablas y condiciones las leen en todas partes:\n• `factions.the-crown.values.strength: { gte: 3 }`\n• `hex.faction: the-crown` — quién tiene el hex\nSus tablas de turno las cambian con efectos:\n• `faction.values.strength: 1` — la facción a la que le toca\n• `factions.the-rebels.values.strength: -1` — otra\n• `faction.territory: 1` — un hex más, desde su frontera\n• `world.clocks.the-siege: 1` — un reloj de progreso del reloj del mundo',
      none: 'Este sistema no tiene facciones.',
      create: 'Nuevas facciones',
    },
    sheet: {
      title: 'Sus hojas: el grupo y sus personajes',
      intro:
        'Dos hojas, las dos opcionales. **La del propio grupo** (`partySheet`): lo que es de todo el grupo (moral, fatiga, mercenarios…), en cada viaje, viaje quien viaje. **La de sus personajes** (`sheet`): lo que tiene cada personaje, para que el grupo pueda estar hecho de personajes que se unen y se van; la pestaña **Comprobaciones** dice qué características del grupo salen de ellos y qué provisiones llevan. Cada una tiene valores con sus límites, contadores, estados y relaciones. Si el sistema tiene facciones, **su hoja** (elegida en la pestaña **Facciones**) se edita aquí también.',
      help: 'Nombradas en su **Resumen** (`partySheet:`, `sheet:`). Las condiciones y las tablas leen la hoja del grupo y cada personaje:\n• `party.values.morale: { gte: 3 }` — el grupo\n• `characters.kael.values.health: { lte: 1 }` — uno por su id\n• `acting.values.wits: { gte: 3 }` — el que actúa ahora\nLos efectos los cambian:\n• `party.values.morale: -1`\n• `party.members.values.health: -1` — a todos los personajes\nUna característica del grupo puede ser un valor de la hoja de grupo: `from: { party: morale }` (en **Comprobaciones**).',
      none: 'Este sistema no tiene hoja: su grupo se juega como un todo, con sus características.',
      create: 'Nueva hoja de personajes',
      createParty: 'Nueva hoja de grupo',
      partyTab: 'el grupo',
      charactersTab: 'sus personajes',
      factionsTab: 'las facciones',
      onlyParty:
        'Esta es la hoja del propio grupo; el sistema aún no tiene una para sus personajes.',
    },
    calendar: {
      title: 'El calendario del sistema',
      intro:
        'El calendario con el que sus viajes y el reloj del mundo nombran el tiempo: las divisiones del día (comidas, guardias…), meses y sus estaciones, días de la semana, lunas y fiestas.',
      help: 'Un calendario por sistema (`kind: calendar`), nombrado en su **Resumen**. Las tablas y comprobaciones leen lo que dice de cada momento:\n• `time.month: seedtime`, `time.weekday: fairday`, `time.year: { gte: 1022 }`\n• `time.moons.silver: full`\n• `time.holidays: lantern-night`\nSin él, el calendario por defecto cuenta días y cuatro estaciones de 90 días.',
      none: 'Este sistema no tiene calendario: usa el de por defecto (días y cuatro estaciones).',
      create: 'Nuevo calendario',
    },
    weather: {
      title: 'Sus modelos de clima',
      intro:
        'Clima con inercia: hoy sigue a ayer, con probabilidades por estación. Una comprobación cuyo binding nombra un modelo lo tira (`weather: weather.highland-skies`).',
      help: 'Modelos de clima (`kind: weather`) que pueden nombrar los bindings del sistema, enumerados en su **Resumen**. Cada tipo de clima puede fijar valores del día (`set: { snowed-in: true }`) que leen las condiciones; el clima del día es `weather` en tablas y condiciones:\n• `trip.weather: storm`\n• `trip.weather: [rain, storm]`',
      none: 'Este sistema no nombra modelos de clima.',
      create: 'Nuevo modelo de clima',
    },
    modes: {
      title: 'Los modos de tirada de sus packs',
      intro:
        'Formas de tirar sus tablas: ventaja, desventaja o las tuyas (tres tiradas quedándose con la del medio…). Las tablas las ofrecen con `modes:` y las usan solas con `modeWhen:`.',
      help: 'Modos de tirada (`kind: roll-modes`) de los packs que trae el sistema, primero el suyo; los de otro pack (los de Core) son de solo lectura aquí, porque los comparten todos los sistemas que lo traen: para cambiarlos, haz los tuyos en el pack del sistema. Una tabla los usa:\n• `modes: [advantage, disadvantage]` — se ofrecen al tirar a mano\n• `modeWhen: { advantage: { explorer: { gte: 1 } } }` — solo cuando se cumple',
      none: 'Los packs de este sistema no declaran modos de tirada.',
      create: 'Nuevos modos de tirada',
    },
  },
  clocksForm: {
    name: 'Nombre',
    nameHelp: 'Cómo se llaman estos relojes en conjunto.\n• **Amenazas del reino**',
    clocks: 'Relojes',
    clocksHelp:
      'Cada reloj, por un id con el que lo leen las tablas y las condiciones (`world.clocks.<id>`): su nombre, sus segmentos, por dónde empieza y qué pasa cuando se llena. Deja vacíos **Al llenarse**, **Tira** y **Cambia** para un reloj que solo se llena.',
    clockName: 'Nombre',
    segments: 'Segmentos',
    segmentsHelp:
      'Cuántos segmentos tiene: cualquier número desde 1.\n• `4` — una amenaza corta\n• `12` — una campaña larga',
    filled: 'Empieza en',
    filledHelp:
      'Segmentos ya llenos cuando se pone en marcha el reloj del mundo (vacío: ninguno).\n• `2` — ya en marcha',
    description: 'Al llenarse',
    descriptionHelp:
      'Qué pasa cuando se llena, en palabras: una línea en la cronología y un aviso.\n• **La Sierpe despierta y deja su guarida.**',
    resolve: 'Tira',
    resolveHelp:
      'Una tabla, oráculo, generador o mazo que se tira cuando se llena, con lo que dicen el reloj del mundo y las facciones (como el turno de una facción). Lo que sale va a la cronología, y se aplican sus efectos.\n• `table.the-raid` — una tabla de este pack\n• `core/table.twists` — los giros de Core',
    effects: 'Cambia',
    effectsHelp:
      'Lo que cambia cuando se llena, una fila cada cosa (qué cambia · valor): otros relojes y las facciones (el grupo de un viaje no es del mundo).\n• `world.clocks.the-siege` · `2` — llena dos segmentos de otro\n• `factions.the-crown.values.strength` · `-1`\n• `factions.the-rebels.territory` · `1` — un hex más',
    then: 'Después',
    thenHelp:
      'Qué es de él una vez lleno:\n• `keep` — se queda lleno (por defecto): las condiciones lo leen lleno\n• `reset` — vuelve a empezar, vacío, y puede volver a llenarse\n• `remove` — desaparece',
    keepByDefault: 'keep',
  },
  factionsForm: {
    name: 'Nombre',
    nameHelp: 'Cómo se llaman estas facciones en conjunto.\n• **Los poderes del reino**',
    sheet: 'Su hoja',
    sheetHelp:
      'La hoja con la que se hace cada facción (`kind: sheet`): sus valores (fuerza, riqueza…), estados (en guerra…) y tipos de relación (aliado, rival). Puede ser la de los personajes o una propia, que se edita en la pestaña **Hoja**.',
    turn: 'Su turno',
    turnHelp:
      'Lo que tira cada facción en un turno del mundo (una tabla, oráculo, generador o mazo), con sus propios valores como `faction.*`:\n• `table.faction-turn` — una tabla de este pack\n• `generator.schemes` — un generador de este pack\n• `core/table.faction-turn` — la de Core, para cualquier juego: crece, aguanta o pierde terreno',
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
      'Valores iniciales de su hoja, una fila cada uno (valor · con cuánto empieza); el resto, los de por defecto de la hoja.\n• `strength` · `4`\n• `reputation` · `-1`',
    regions: 'Regiones',
    regionsHelp:
      'Empieza teniendo todos los hexes de estas regiones del mapa (por su nombre), cada una una pastilla (Intro o una coma la añade): la tierra que recibe cuando un mapa trae las facciones. Desde entonces su tierra es del mapa (se pinta a mano y se gana y se pierde en los turnos del mundo): cambiar esto no la mueve.\n• `The Hollow Hills`',
    map: 'En el mapa',
    mapHelp:
      'El mapa de ejemplo de este pack (`maps:` en su sistema) en el que están sus **Hexes**: solo se dan ahí, porque las mismas coordenadas son otro sitio en otro mapa. Sus regiones se dan en cualquier mapa que las tenga.\n• `maps/frontier.otd.json`',
    hexes: 'Hexes',
    hexesHelp:
      'Y estos hexes (columna,fila) del mapa elegido en **En el mapa**, cada uno una pastilla (Intro o un espacio lo añade); lo necesitan.\n• `15,9`',
    ownTurn: 'Turno propio',
    ownTurnHelp: 'Una tabla de turno propia, en vez de la de las facciones.\n• `clan-turn`',
  },
  sheet: {
    name: 'Nombre',
    nameHelp: 'El nombre de la hoja, que se ve donde se crean personajes.\n• **Compañero**',
    descriptionHelp:
      'Para qué es la hoja, se ve donde se crean los personajes. Markdown básico.\n• _Uno de la Compañía: sus habilidades, sus heridas y las raciones que lleva._',
    values: 'Valores',
    valuesHelp:
      "Números que tiene cada personaje, con los límites que les da el sistema (ninguno: sin límite, puede bajar de cero). Las tablas y condiciones los leen como `characters.<id>.values.<valor>` y `acting.values.<valor>`:\n• `wits` — empieza en `2`, mín. `0`, máx. `5`\n• `health` — máx. `'{{self.values.maxHealth}}'`: otro valor es su límite\n• `stress` — máx. `9`, mostrado como **casillas**",
    valueName: 'Nombre',
    default: 'Empieza en',
    defaultHelp: 'Lo que tiene un personaje nuevo (vacío: 0).\n• `2`',
    min: 'Mín.',
    max: 'Máx.',
    boundHelp:
      "Los efectos nunca lo llevan más allá. Un número, u otro valor de la hoja entre llaves:\n• `0`\n• `'{{self.values.maxHealth}}'` — tan alto como el maxHealth del personaje\nVacío: sin límite.",
    display: 'Se muestra como',
    displayHelp:
      'Cómo se dibuja el valor allí donde se muestra un personaje (vacío: una casilla con el número). Todos menos **number** y **levels** necesitan un máximo:\n• `number` — una casilla con el número\n• `of` — el número y su máximo: **3 / 5**\n• `bar` — una barra llena hasta su máximo\n• `boxes` — casillas que marcar, tantas como su máximo (estrés, experiencia, un juramento)\n• `pips` — puntos redondos, tantos como su máximo (una puntuación de 1 a 5)\n• `dial` — un reloj redondo con tantos segmentos como su máximo\n• `levels` — el nombre de uno de sus **Niveles**: el primero es su mínimo (o 0), el siguiente uno más…',
    levels: 'Niveles',
    levelsHelp:
      'Con **Se muestra como** `levels`, los nombres que elige el valor, cada uno una pastilla (Intro o una coma lo añade), desde su mínimo (o 0) hacia arriba; más allá se muestra el número. Sus nombres se traducen en el archivo de traducción, por id:\n• `unhurt, bruised, wounded, dying` — 0 es **unhurt**, 3 es **dying**\n• `d4, d6, d8, d10, d12` — un tamaño de dado que crece con el valor\n• con mín. `-3`: `hated, wary, neutral, …` — −3 es **hated**',
    tones: 'Tonos',
    tonesHelp:
      'El color que toma desde un valor hacia arriba, `valor: tono`, entre los del tema: `good`, `warning`, `danger` y `accent`:\n• `0: danger, 2: warning, 4: good` — rojo en 0 y 1, ámbar en 2 y 3, verde desde 4\n• `5: danger` — rojo solo desde 5\n• `0: danger, 50%: warning, 75%: good` — partes de su máximo, que lo siguen cuando cambia: con máx. 3, rojo en 0 y 1, ámbar en 2, verde en 3\nVacío: el color de acento del tema.',
    relationDisplayHelp:
      'Cómo se dibuja el número de una relación, como el **Se muestra como** de un valor (necesita un máximo, salvo **number**):\n• `pips` — un vínculo de 0 a 3 como puntos\n• `bar`',
    preview: 'Vista previa',
    previewHelp:
      'Un personaje hecho con esta hoja tal como está ahora, dibujado como en todos los sitios donde se muestran personajes. Pruébalo: lo que cambies aquí no se guarda en ningún sitio.',
    previewName: 'Ejemplo',
    group: 'Grupo',
    groupHelp:
      'La tarjeta en la que se muestra, bajo el nombre del grupo.\n• `attributes`\n• `meters`',
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
      'Lo que el grupo no puede hacer mientras algún miembro lo tenga, cada cosa una pastilla (Intro o una coma la añade):\n• `travel.move` — no se sigue avanzando\n• `actions.forced-march` — una acción del sistema\n• `modes.horse` — una forma de viajar\nEl viaje dice quién lo tiene.',
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
    divisions: 'Divisiones del día',
    divisionsHelp:
      'Las maneras en que tu mundo divide el día, tantas como quieras: comidas, guardias, campanadas, rezos… Cada una tiene sus partes, y cada parte dura hasta que empieza la siguiente (la última hasta la primera, pasada la medianoche). Las condiciones y las tablas leen lo que es ahora como `time.<id>`, y las etiquetas de las partes en que está como `time.tags`; el panel Mundo espera hasta cualquier parte.\n• `meal` con **elevenses** desde las `11:00` — `time.meal: elevenses` se cumple desde las 11:00 hasta la siguiente comida\n• `watch` dividida en partes de `4` horas (**Dividir en partes iguales…**) — `time.watch: 2` de 04:00 a 08:00\n• una parte con **Hasta** `07:00` — ninguna de su división desde las 07:00 hasta la siguiente parte\n• **Etiquetas** `dark` en la noche — `time.tags: dark`',
    divisionIdHelp:
      'Cómo la leen las condiciones y las tablas: `time.<id>` (`time.meal: elevenses`). No puede ser un nombre que el momento ya tiene (`day`, `hour`, `season`, `tags`…).',
    divisionReserved: '«{id}» ya es un nombre del momento (time.{id}); elige otro.',
    split: 'Dividir en partes iguales…',
    splitTitle: 'Dividir el día en partes iguales',
    splitMessage:
      '¿Partes de cuántas horas cada una, numeradas desde la medianoche? Sustituyen a las partes que tenga esta división; después renómbralas o ajústalas a tu gusto.',
    splitHours: '{hours} h',
    splitHelp:
      'Escribe el día como partes numeradas de la misma duración desde la medianoche, una fila cada una, para verlas, renombrarlas o ajustarlas: los turnos de una guardia, campanadas, rezos a horas fijas. Las partes que se llaman 1, 2, 3… se leen como números.\n• `4` horas — **1** desde las `00:00`, **2** desde las `04:00` … **6** desde las `20:00`: `time.watch: 2` de 04:00 a 08:00\nPara tramos propios (la mañana, la noche, las comidas), escribe las filas, cada una desde su hora.',
    everyNote:
      'Partes numeradas cada {hours} horas desde la medianoche (escritas con every en el YAML), como enseña la franja: se leen como números, como time.watch: 2.',
    writeRows: 'Escribirlas como filas',
    partFrom: 'Desde',
    partFromHelp:
      'Cuándo empieza; dura hasta que empieza la siguiente parte, en el orden del día, se escriban en el orden que se escriban.\n• `11:00`',
    partUntil: 'Hasta',
    partUntilHelp:
      'Cuándo acaba, si es antes de que empiece la siguiente parte: hasta entonces, ninguna parte de esta división.\n• guardias solo de noche: la última **Hasta** `06:00`\nVacío: hasta la siguiente parte.',
    partTags: 'Etiquetas',
    partTagsHelp:
      'Palabras que un sistema puede leer mientras dura (`time.tags`), cada una una pastilla (Intro o una coma la añade); solo significan lo que tus reglas hagan con ellas.\n• `dark` — `when: { time.tags: dark }`\n• `meal, rest`',
    addDivision: 'Añadir una división',
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
      'Los días de la semana, en orden; las tablas leen `time.weekday: fairday`. Vacío: sin semana.',
    moons: 'Lunas',
    moonsHelp:
      'Las lunas y sus fases (nueva, creciente, llena, menguante), que se leen como `moons.<id>: full`.\n• `moon` — 28 días\n• `red` — 45 días, desfase 20',
    cycle: 'Ciclo (días)',
    cycleHelp: 'Días de una luna nueva a la siguiente.',
    offset: 'Desfase',
    offsetHelp: 'El día de su ciclo en el día 1 (por defecto 0: nueva el día 1).',
    holidays: 'Fiestas',
    holidaysHelp:
      'Días fijos del año, que se leen como `time.holidays: lantern-night` (una lista, porque pueden caer varias el mismo día).',
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
      'Valores del día que fija este clima, una fila cada uno (valor · cuál es):\n• `climbModifier` · `-1`\n• `snowed-in` · `true`',
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
      'Una flor hexagonal: 19 casillas (filas de 3, 4, 5, 4 y 3), cada una un tipo de clima; el clima del día es el de la casilla en que está. Cada día 2d6 lo mueve a una casilla vecina (la brújula de al lado dice hacia dónde va cada tirada), así que el clima de mañana se parece al de hoy: deriva en vez de saltar.\n• el día está en **Lluvia**, en el centro; 2d6 saca 7, sureste: mañana es la casilla de abajo a la derecha, por ejemplo **Gris**\n• pon los climas duros arriba y los buenos abajo: las tiradas del medio (6–7, las más comunes) van al sureste, así que el tiempo tiende a despejar\n• más casillas de un tipo lo hacen más común: tres de **Despejado** abajo, una de **Tormenta** arriba\n**En el borde** dice qué pasa cuando una tirada saldría de la flor.',
    flower: 'La flor',
    paint: 'Pintar con',
    paintHelp:
      'Elige aquí un tipo de clima y haz clic en casillas de la flor para dárselo (también Intro sobre una casilla). Cada color es un tipo, como en esta lista.',
    moves: 'Adónde va cada 2d6',
    movesHelp:
      'Desde la casilla en que está el día (el centro), los totales de 2d6 que lo mueven en cada dirección: 2–3 al noreste, 4–5 al este, 6–7 al sureste… Un pack puede cambiarlos (`moves` en el YAML).',
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
      'Las definiciones con las que se juega el sistema, cada una por su kind y su id: de este pack (`travel-rules.default`) o de una dependencia (`core/travel-rules.default`).\n• **Reglas de viaje** — cómo va un viaje (`kind: travel-rules`); ninguna: las reglas Genéricas\n• **Bindings** — qué tabla responde a cada comprobación, y las características del grupo (`kind: bindings`)\n• **Calendario** — cómo se nombran los días, en los viajes y en el reloj del mundo (`kind: calendar`); ninguno: el de por defecto',
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
      'Los modelos de clima (`kind: weather`) que sus bindings pueden nombrar en una comprobación (`weather: weather.highland-skies`), para que el clima del día tenga inercia: los de este pack y los de sus dependencias.\n• `weather: [weather.highland-skies]`\n• `weather: [weather.coast, core/weather.plains]`',
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
    yes: 'sí',
    no: 'no',
    search: 'Buscar…',
    shown: '{shown} de {total}',
    noMatch: 'Nada coincide con «{query}».',
    openAll: 'Desplegar todo',
    closeAll: 'Plegar todo',
    unfold: 'Mostrar sus campos',
    fold: 'Plegarla',
    whatItDoes: 'Qué hace',
    description: 'Descripción (su ayuda)',
    descriptionHelp:
      'Qué es y para qué sirve, en una o dos frases: los jugadores la leen como su ayuda donde se lo encuentran (el panel del viaje, la ficha de un personaje o de una facción, el panel Mundo), antes de lo que añaden las aplicaciones (cómo lo leen las tablas, sus límites…). Markdown básico. Escrita en el idioma actual: el del pack o su fichero de traducción.\n• _Se pierde en vados, emboscadas y con el frío; una noche bien comidos en el campamento devuelve una._',
    confirmRemove:
      '¿Quitar «{name}»? Los formularios no lo pueden deshacer (edita el YAML para recuperarlo).',
    id: 'Id',
    add: 'Añadir',
    remove: 'Quitar',
    removeItem: 'Quitar {name}',
    moveUp: 'Subir',
    moveDown: 'Bajar',
    idExists: 'Ya hay uno que se llama «{id}».',
    badFlow: 'Escríbelo como pares clave: valor, p. ej. tags: landmark o terrain: [forest, hills].',
    problems: 'Este fichero tiene {count} problemas: abre el YAML para verlos.',
  },
  rules: {
    water: 'Hexes de agua',
    waterHelp:
      'Hexes cuyo terreno el mapa marca como **agua** (Hexmapper: Editar paleta → Agua) y que no tienen regla propia en Terrenos.\nA menudo **no se cruzan**; una forma de viajar cuyo **Solo por** se cumple en el agua sí puede navegarlos:\n• una barca: `hex.water: true`\n• una barca que además bordea la costa: `any: [{ hex.water: true }, { hex.terrain: coast }]`\nUn terreno listado en Terrenos (un `lake` helado con **Abierto cuando** `time.season: winter`) usa su propia regla.',
    day: 'El día',
    dayHelp:
      'Cuándo empiezan los viajes, la escala de sus velocidades y qué hace el grupo cuando no puede marchar. Cuándo y hasta dónde marcha el grupo lo dicen sus acciones (Acciones, abajo: una acción con un paso `travel.move`, como **Marchar**), y cómo sigue el viaje por sí solo es una de ellas (**Sigue por sí solo con**).\n• **Los viajes empiezan** `06:00` o `time.part.morning` — el primer momento de un viaje nuevo\n• **Parada** `time.part.night` → `camp` — desde entonces, un grupo que no puede marchar acampa por sí solo',
    tripStart: 'Los viajes empiezan',
    tripStartHelp:
      'Cuándo empieza un viaje nuevo en su primer día: una hora o una parte del día del calendario (cuando empieza). Vacío: a medianoche.\n• `06:00`\n• `time.part.morning` — si el calendario divide su día en `part` con una `morning`',
    halt: 'Parada',
    haltAt: 'Parada desde',
    haltDo: 'Acción de la parada',
    haltHelp:
      'Lo que hace el grupo cuando **no puede marchar y el tiempo avanza solo**: el reloj del mundo avanzando con un viaje en marcha, una orden de viajar sin nada más que marchar, **Esperar para seguir**. Desde este momento (una hora o una parte del día) hasta que acaba el día, un grupo que no está marchando hace la acción, una vez al día.\n• **desde** `20:00`, **acción** `camp`\n• **desde** `time.part.night`, **acción** `watch`\nSi la acción **no se puede hacer** (su **Solo si** / **Salvo si**, o un valor que la bloquea), el diario dice por qué y el tiempo pasa sin ella hasta que el grupo pueda marchar.\n• camp con **Solo si** `party.resources.food: { gte: 1 }` — un grupo sin comida duerme a la intemperie\nSin acción: el grupo simplemente espera.',
    haltNone: 'nada: el grupo espera',
    onwardDo: 'Sigue por sí solo con',
    onwardHelp:
      'La acción que hace el viaje **cuando sigue por sí solo**: el reloj del mundo avanzando con un viaje en marcha, o una orden de viajar. La hace siempre que puede (su **Solo si** / **Salvo si**) y espera si no (con la **Parada**). Suele ser la acción que mueve al grupo, con hasta dónde:\n• **acción** `march`, **con** `until: destination` — sigue marchando hasta el destino, día tras día\n• **acción** `sail`, **con** `until: hex` — de hex en hex\nNada: el viaje solo espera; el jugador lo mueve con los botones de las acciones.',
    onwardNone: 'nada: el viaje solo espera',
    onwardWith: 'Con',
    onwardWithHelp:
      'Los valores de los **Parámetros** de esa acción, como pares `parámetro: opción`; los que no se ponen toman el suyo por defecto.\n• `until: destination`\n• `until: 3` — tres hexes\nVacío: cada parámetro con su valor por defecto.',
    hoursPerDay: 'Horas de marcha al día',
    hoursPerDayHelp:
      "Las horas en que una forma de viajar hace sus **km al día**: la escala de su velocidad (km por hora). Cuánto puede marchar el grupo cada día lo dice la acción **Marchar** (`trip.marched: { lt: '{{system.hoursPerDay}}' }` lee este número).\n• `8` — 24 km al día son 3 km por hora\n• `10` — los mismos 24 km a 2,4 km por hora",
    hexKm: 'km por hex',
    hexKmHelp:
      'La escala a la que se juega el sistema: cuántos km mide un hex. Con las velocidades de sus formas de viajar, dice cuánto se tarda en un hex.\n• `30` — hexes grandes: más o menos uno al día para una forma de viajar que hace 30 km\n• `10` — hexes pequeños: varios al día\nLos viajes sin mapa (Travel, **Pruébalo**) se juegan a ella; un mapa con este sistema la toma, salvo que el mapa fije la suya (Hexmapper: Ajustes del mapa → Mapa). Vacío: la del mapa o la del camino, 10 por defecto.',
    modes: 'Formas de viajar',
    modesHelp:
      'Formas de viajar: a pie, a caballo, en barca… Cada una tiene una velocidad en **km por día de marcha** en terreno fácil (los terrenos y caminos la cambian) y puede limitarse a algunos sitios y momentos.\n• `foot` — 24 km al día\n• `horse` — 40 km al día, **Salvo si** `trip.weather: snow`\n• `boat` — 50 km al día, **Solo por** `hex.water: true`\nEl panel del viaje deja al jugador cambiar de una a otra.',
    kmPerDay: 'km por día',
    name: 'Nombre',
    nameHelp:
      'Lo que leen los jugadores en el panel del viaje y el diario en lugar del id:\n• `horse` → _A caballo_\n• `food` → _Raciones_\nSe escribe en el idioma actual: el del pack, o su fichero de traducción (`locales/<idioma>/`) si la interfaz está en otro. Vacío: el id (o el nombre de la aplicación para los habituales: foot, horse, food…).',
    allowedTerrains: 'Solo por',
    allowedTerrainsHelp:
      'Por dónde puede ir esta forma de viajar: una condición sobre **cada hex en el que entra** (su terreno, agua, etiquetas, región, campos, los caminos o ríos del paso).\n• una barca: `hex.water: true`\n• una barca que además sigue la costa: `any: [{ hex.water: true }, { hex.terrain: coast }]`\n• un carro solo por camino: `trip.edges: road`\n• una montura que evita los bosques: `not: { hex.terrain: [forest, dense-forest] }`\nDonde se cumple, ni los terrenos cerrados la paran; donde no, no puede ir, diga lo que diga el terreno (mira **Transitable** en Terrenos). Vacío: por donde dejen los terrenos.',
    anyTerrain: 'por donde dejen los terrenos',
    terrains: vocabulary.es.terms.terrains,
    terrainsHelp:
      'Cómo cambia la velocidad cada terreno, y si se puede entrar. Los ids son los que usa el mapa:\n• `forest` × `0.5` — a la mitad\n• `plains` × `1` — velocidad normal\n• `peaks` × `0.25`, **Abierto cuando** `time.season: summer`\nLos terrenos no listados usan **Velocidad × de los terrenos no listados**.',
    terrain: vocabulary.es.terms.terrain,
    multiplier: 'Velocidad ×',
    multiplierHelp:
      'Lo rápido que se cruza este terreno, comparado con el terreno fácil:\n• `1` — velocidad normal\n• `0.5` — a la mitad\n• `0.25` — a un cuarto\n• `2` — el doble de rápido\nPor ejemplo, con una forma de viajar de 24 km al día y hexes de 12 km, un hex a `0.5` lleva un día entero de marcha.',
    passable: 'Transitable',
    passableHelp:
      'Si se puede entrar en un hex de este terreno. Cómo encaja con lo demás:\n• Una forma de viajar con **Solo por** (Formas de viajar) va solo por eso: donde se cumple su condición entra, abierto o cerrado (una barca en un lago); donde no, no entra\n• Cualquier otra: **Sin marcar**, nadie entra (las rutas lo rodean); **Marcado**, entra mientras se cumpla **Abierto cuando** (vacío: siempre) y no **Cerrado cuando** (vacío: nunca)\nPor ejemplo:\n• **Abierto cuando** `time.season: winter` — un lago que se cruza sobre el hielo\n• **Cerrado cuando** `trip.weather: [snow, storm]` — un paso cerrado por el clima',
    openWhen: 'Abierto cuando',
    closedWhen: 'Cerrado cuando',
    passableWhenHelp:
      'Cuándo se puede entrar en el terreno, como condición sobre **el hex al que se entra y el momento**: su terreno, etiquetas, región, campos, los caminos o ríos del paso, la forma de viajar, el clima, la estación y el calendario, los valores del día.\n• **Abierto cuando** `time.season: winter` — solo mientras se cumple: un lago que se cruza sobre el hielo\n• **Abierto cuando** `time.month: [1, 12]` — los dos meses más fríos del calendario\n• **Cerrado cuando** `any: [{ time.season: winter }, { trip.weather: snow }]` — un paso de montaña\n• **Cerrado cuando** `trip.mode: horse` — no para jinetes\nVacío: siempre abierto / nunca cerrado.',
    defaultTerrain: 'Velocidad × de los terrenos no listados',
    defaultTerrainHelp:
      'La velocidad de cualquier terreno que no esté arriba:\n• `1` — normal (lo que vale si está vacío)\n• `0.75` — el terreno desconocido es algo más lento\nUn mapa con un terreno que el sistema no conoce (`badlands`) usa esto.',
    edges: 'Caminos y ríos',
    edgesHelp:
      'Seguir un camino, sendero o río **de un hex al siguiente**: su velocidad sustituye a la del terreno.\n• `road` × `1.5` — la mitad más rápido que a campo abierto\n• `trail` × `1` — como a campo abierto, aunque cruce un bosque\n• `river` × `2` — río abajo en barca\nLas líneas no listadas no hacen nada. Las comprobaciones también las distinguen: `trip.edges: road` en una condición.',
    edge: 'Línea',
    edgeMultiplierHelp:
      'Velocidad por esta línea, en lugar de la del terreno:\n• `1.5` — la mitad más rápido que a campo abierto\n• `1` — velocidad de campo abierto, sea cual sea el terreno\nUn camino a `1.5` por un terreno a `0.5` es el triple de rápido que ese terreno.',
    resources: vocabulary.es.terms.supplies,
    resourcesHelp:
      'Lo que lleva el grupo: comida, forraje, agua, antorchas… Qué lo gasta lo decide **el sistema**, nunca la aplicación:\n• una acción al final de cada día come: `effects: { party.resources.food: -1 }`\n• una entrada de tabla encuentra: `effects: { party.resources.food: 2 }`\n• una comprobación sin comida cansa: **Solo si** `trip.below: food`\nEl panel del viaje muestra cada una y deja al jugador cambiarla a mano.',
    min: 'Mín',
    minHelp:
      'Los efectos nunca lo bajan de aquí: un cambio más allá se queda ahí, el diario lo dice («La comida no puede bajar de 0»), y los pasos siguientes y las comprobaciones de ese día ven `trip.below: [su id]`.\n• comida con Mín `0` — comer sin nada se queda en 0, y una comprobación day-end con **Solo si** `trip.below: food` cansa al grupo\n• oro sin Mín — puede ser negativo, como una deuda',
    max: 'Máx',
    maxHelp:
      'Los efectos nunca lo suben de aquí; los pasos y comprobaciones siguientes ven `trip.above: [su id]`.\n• agua con Máx `4` — un odre lleno no admite más\n• moral con Máx `5` — un festín no la sube de 5\nUn viaje nuevo empieza con 6 de cada provisión, o con su Máx si es menor (su Mín si es mayor).\nVacío: sin máximo.',
    weather: vocabulary.es.terms.weather,
    weatherHelp:
      'Cómo frena cada clima al grupo. Las tablas lo fijan con `set: { weather: … }` (normalmente al alba), o un modelo de clima con inercia.\n• `storm` × `0` — ese día no se viaja\n• `heavy-rain` × `0.5` — a media velocidad\n• `fog` × `0.75`\nLos climas no listados no cambian la velocidad; las condiciones aún pueden leerlos (`trip.weather: storm`).',
    weatherState: vocabulary.es.terms.weather,
    speed: 'Velocidad ×',
    speedHelp:
      'A qué velocidad marcha el grupo con este clima:\n• `0` — ese día no se viaja (es un día perdido)\n• `0.5` — a media velocidad\n• `1` — como siempre',
    actions: 'Acciones',
    actionsHelp:
      "Lo que puede hacer el grupo: **marchar**, **acampar**, **descansar** y las propias del sistema (buscar comida, rezar, hablar con los porteadores…), cada una un botón en el panel del viaje, o hecha por el propio sistema (**Automática en**). Nada viene de serie: marchar es una acción como las demás.\nCada una dice cuándo se puede hacer (**Solo si** / **Salvo si**, **Una vez al día**) y qué hace, **paso a paso**:\n• marchar: `travel.move: '{{params.until}}'`, con un parámetro `until` (hasta el destino o un hex)\n• descansar: `time: 120`, luego `effects: { party.stats.fatigue: -1 }`\n• buscar comida: `time: 180`, `travel.speed: 0.5`, su comprobación en `forage`\n• comer, automática en `time.day-end`: `effects: { party.resources.food: -1 }`",
    oncePerDay: 'Una vez al día',
    modeWhenHelp:
      'Cuándo se puede elegir (**Solo si**) o no (**Salvo si**), como condición sobre dónde está el grupo y el momento.\n• una barca solo a la orilla: `any: [{ hex.water: true }, { hex.tags: ferry }]`\n• sin caballos con nieve: **Salvo si** `trip.weather: snow`\n• un carro solo en verano: **Solo si** `time.season: summer`\nVacío: siempre. Un valor del día también puede bloquearla (**Bloquea** `modes.<id>`).',
    values: 'Valores del día',
    valuesHelp:
      'Valores que las tablas y acciones de este sistema pueden poner **para el resto del día**, con lo que bloquean mientras se cumplen. Las tablas los leen al día siguiente como `yesterday.<id>`.\n• `lost` — lo pone `set: { lost: true }`, bloquea `travel.move`\n• `snowed-in` — bloquea `modes.horse`\n• `mutinous` — bloquea `travel.move` hasta que una acción lo quita (`set: { mutinous: false }`)\nSin ninguno, nada bloquea el viaje.',
    blocks: 'Bloquea',
    blocksHelp:
      'Lo que no se puede hacer mientras se cumple el valor:\n• `travel.move` — no se sigue avanzando hoy\n• una acción, p. ej. `actions.camp` o `actions.forage` — su botón se desactiva\n• una forma de viajar, p. ej. `modes.horse` — esa forma de viajar: no se puede elegir, y un grupo que ya viaja así se detiene hasta que cambie\nLa caja sugiere lo que declara este sistema. Los botones bloqueados siguen visibles, desactivados, diciendo por qué (salvo que la acción esté **Oculta si no se puede hacer**).',
    blocksNothing: 'nada',
  },
  actions: {
    search: 'Buscar en las acciones (nombre, id, momento, paso…)',
    stepCount: 'Pasos: {count}',
    when: 'Solo si',
    unless: 'Salvo si',
    whenHelp:
      "Cuándo se puede hacer la acción (**Solo si**) o no (**Salvo si**), con condiciones como las de las tablas:\n• `trip.weather: storm` — el clima de hoy\n• `hex.terrain: [forest, hills]` — el hex donde está el grupo\n• `hex.tags: shrine` — una etiqueta de ese hex\n• `party.stats.fatigue: { lt: 2 }` — el grupo\n• `party.resources.food: { gte: 1 }` — queda comida\n• `mutinous: true` — un valor del día\n• `time.moons.silver: full` — el calendario\n• `time.hour: { gte: 6, lt: 20 }` — solo de día, de 06:00 a 20:00; `time.part: night`, `time.tags: dark` — una parte del día del calendario, o sus etiquetas\n• `trip.visits: 1` — la primera vez aquí; `around.terrain: lake` — junto a un lago\n• `trip.doneToday: forage` — si hoy se buscó comida; `trip.marched: { gte: 6 }` — tras 6 horas de marcha\n• `trip.km: { gte: 100 }`, `trip.taken.camp: { gte: 7 }`, `trip.spent.food: { gte: 10 }` — lo que lleva hecho el viaje\n• `party.stats.fatigue: { lt: '{{party.stats.endurance}}' }` — una variable: comparado con otro valor (entre comillas)\n• `party.stats.wits: { gte: '{{1d20}}' }` — una tirada: la misma durante todo el momento\nCada valor por su **nombre completo**, que dice de dónde sale (`hex.*`, `time.*`, `trip.*`, `system.*`, `world.*`, `party.*`): nunca lo tapa una característica con el mismo nombre\nSi no, su botón sale desactivado y dice por qué (o se oculta, con **Oculta si no se puede hacer**); la acción de la parada que no se puede hacer deja pasar el tiempo sin ella.",
    params: 'Parámetros',
    paramsHelp:
      "Lo que elige el jugador al hacerla (junto a su botón, una elección por cada uno), y lo que le da un paso `do:` o **Sigue por sí solo con**. Cada parámetro tiene sus **opciones** (la primera es la de por defecto, salvo que `default` diga otra); sus pasos y condiciones leen la elegida como `{{params.<id>}}`.\n• `until: { choices: [destination, hex, 3] }` — hasta dónde va una marcha: con el paso `travel.move: '{{params.until}}'`\n• `pace: { choices: [steady, quick], default: steady }` — con **Solo si** `params.pace: quick` en un paso\nUna opción puede llevar un nombre que mostrar: `{ id: 3, name: Three hexes }` (traducido en los locales del pack). Vacío: sin elecciones, solo el botón.",
    noParams: 'ninguno: solo el botón',
    hide: 'Oculta si no se puede hacer',
    hideHelp:
      '**Sin marcar**: su botón siempre está, desactivado (diciendo por qué) mientras no se puede hacer, así los botones no cambian de sitio.\n**Marcada**: su botón solo aparece mientras se puede hacer. Para acciones que solo tienen sentido de vez en cuando:\n• un rito solo en un santuario con luna llena\n• convencer a los porteadores solo mientras se niegan a marchar',
    nothing: 'Cuando no se aplica nada',
    nothingHelp:
      'Lo que dice el diario cuando **no se aplica ninguna de sus comprobaciones** donde está el grupo; `{terrain}` es el terreno del hex.\n• `no hay nada que buscar en {terrain}` → «no hay nada que buscar en Colinas»\nVacío: una frase genérica. Una acción sin comprobaciones no dice nada más.',
    nothingPlaceholder: 'no hay nada que encontrar en {terrain}',
    steps: 'Qué hace',
    stepsHelp:
      'Lo que hace la acción, **un paso por tarjeta, en orden**: elige qué hace cada uno en su primera caja y rellena sus campos (cada uno se explica solo). Pulsa el título de una tarjeta para plegarla o abrirla; plegada, se lee en palabras (_Pasan 3 h_, _Hacer Marchar (until: hex)_). Arrastra una por su asa (⠿) sobre otra para llevarla ahí, o usa ↑ y ↓.\n**Solo si** / **Salvo si** en un paso: solo ocurre cuando se cumplen, construidas en filas (qué lee · comparación · valor). Además de lo que ven las condiciones de la propia acción, ven:\n• `params.how` — los parámetros de la acción\n• `trip.below` es `food` — la comida llegó a su mínimo durante la acción (`trip.above`: a un máximo)\n• `trip.moment` es `trip.hex-enter` — cuándo la hizo el sistema\n• `trip.doing` — la acción en curso\n**Editar como YAML** en una tarjeta muestra el paso como lo escribe el pack (`time: 180`, `do: actions.march, with: { until: hex }`), para lo que el formulario no cubre; nada de lo escrito ahí se pierde por el formulario. Ahí un paso puede tener un `id` (`id: song`), que nombran sus traducciones.\nLas acciones que siguen a esta, y sus comprobaciones (Comprobaciones → **Cuándo**: esta acción), van primero.',
    on: 'Automática en',
    onHelp:
      '**Vacío**: la hace el jugador, con un botón.\nSi no, los **momentos en que la hace el propio sistema**, si se cumplen sus condiciones; entonces no es un botón, y va antes de las comprobaciones de ese momento:\n• una hora, p. ej. `06:00` — al dar esa hora\n• una parte del día del calendario, p. ej. `time.part.morning` — al empezar\n• `trip.hex-enter` — al entrar en cada hex\n• `time.day-end` — al acabar cada día, se acampe o no\n• una acción, p. ej. `actions.camp` — justo al empezar esa acción\n• un reloj de progreso al llenarse, p. ej. `world.clocks.the-threat.full` — en cuanto acaba el paso que lo llenó, o al momento si se llena a mano o en otra aplicación (allí, en el siguiente paso del viaje); uno hecho a mano se nombra por su nombre en minúsculas con guiones\nVarios, cada uno una pastilla (Intro o una coma lo añade): `06:00` y `trip.hex-enter`. Sus condiciones ven cuál es como `moment` (`when: { trip.moment: trip.hex-enter }`).\nEjemplos:\n• comer al acabar cada día: `time.day-end`\n• los porteadores refunfuñan por la mañana tras un día de hambre: `time.part.morning` (o `06:00`) con **Solo si** `yesterday.hungry: true`',
    onButton: 'nada: un botón para el jugador',
    onAfter: 'Tras: {action}',
    step: 'Paso',
    badStep:
      "Un paso hace una cosa: time: 60, travel.move: destination, travel.speed: 0.5, travel.advance: 1, travel.mode: modes.<forma>, effects: { … }, set: { … }, do: <acción> (y su with: { … }), roll: checks.<comprobación>, say: <texto>, pause: true, ask: <parámetro> o wait: { … } con limit: '18:00'.",
    up: 'Subir',
    down: 'Bajar',
    reading: {
      button: 'Con su botón',
      byItself: 'Por sí sola ({moments})',
      oncePerDay: 'una vez al día',
      choosing: 'eligiendo {params}',
      grouped: 'una condición con grupos (mira su campo, abajo)',
      more: '…y {count} más',
    },
    noSteps: 'Sin pasos: no hace nada salvo tirar sus comprobaciones.',
    addStep: 'Añadir un paso',
    add: 'Añadir una acción',
  },
  steps: {
    kind: 'Qué hace',
    kindHelp:
      'Lo que hace este paso: una cosa, elegida aquí; sus campos cambian con ella.\n• **Pasar el tiempo** — minutos, o hasta una hora o una parte del día\n• **Moverse** — por la ruta mientras pasa el tiempo\n• **Cambiar la velocidad**, **Avanzar hexes**, **Cambiar la forma de viajar** — el resto del movimiento del viaje\n• **Cambiar valores** — el grupo, sus personajes, facciones, relojes\n• **Dar un valor del día** — uno que declara el sistema\n• **Hacer otra acción**, **Tirar una comprobación o una tabla** — las del propio sistema, o las del Oráculo\n• **Decir**, **Pausar**, **Preguntar al jugador** — hablarle al jugador\n• **Esperar algo** — pasa el tiempo hasta que se cumple una condición\nCambiarlo conserva las condiciones del paso.',
    kinds: {
      time: 'Pasar el tiempo',
      'travel-move': 'Moverse',
      'travel-speed': 'Cambiar la velocidad',
      'travel-advance': 'Avanzar hexes',
      'travel-mode': 'Cambiar la forma de viajar',
      effects: 'Cambiar valores',
      set: 'Dar un valor del día',
      do: 'Hacer otra acción',
      roll: 'Tirar una comprobación o una tabla',
      say: 'Decir',
      pause: 'Pausar',
      ask: 'Preguntar al jugador',
      wait: 'Esperar algo',
    },
    fields: {
      time: 'Cuánto, o hasta cuándo',
      'travel-move': 'Hasta dónde',
      'travel-speed': 'Velocidad',
      'travel-advance': 'Cuántos',
      'travel-mode': 'Forma de viajar',
      effects: 'Cambios',
      set: 'Valores del día',
      do: 'Acción',
      with: 'Con',
      roll: 'Qué tira',
      say: 'Texto',
      pause: 'Por qué (opcional)',
      ask: 'Parámetro',
      wait: 'Hasta que',
      limit: 'Como mucho hasta',
    },
    help: {
      time: "Minutos que pasan, o hasta cuándo pasa el tiempo, viviendo todo lo que hay por el camino (las comprobaciones y acciones de cada momento, el final del día):\n• `180` — tres horas\n• `'14:00'` — hasta que el reloj vuelva a dar las 14:00\n• `time.part.morning` — hasta que vuelva a empezar esa parte del día del calendario",
      'travel-move':
        "Hasta dónde se mueve el grupo por su ruta, minuto a minuto, mientras se cumplen el **Solo si** / **Salvo si** de la acción (una marcha de día se para al caer la noche):\n• `destination` — hasta el final de la ruta\n• `hex` — el siguiente hex\n• `3` — tres hexes\n• `'{{params.until}}'` — lo que diga el parámetro de la acción\nUna comprobación que necesita al jugador la para por el camino; **Seguir** sigue con ella.",
      'travel-speed':
        'A qué velocidad va el resto del movimiento de hoy, multiplicada por la del clima:\n• `0.5` — a mitad de velocidad\n• `1.5` — más rápido\n• `0` — hoy ya no se mueve más',
      'travel-advance':
        "Hexes (o tramos de un camino) que avanza el grupo por su ruta de golpe, sin que pase el tiempo: progreso por movimientos en vez de marchas.\n• `1` — un hex\n• `'{{party.stats.rank}}'` — tantos como diga un valor",
      'travel-mode':
        "La forma de viajar desde ahora, si se puede elegir en ese momento (se cumplen sus propias condiciones y nada la bloquea); si no, no cambia nada. Con destino, la ruta se vuelve a planear para ella.\n• `modes.boat` — una de las formas del sistema\n• `'{{params.by}}'` — lo que diga el parámetro de la acción",
      effects:
        'Lo que cambia, una fila por cosa: un número suma o resta.\n• `party.stats.fatigue` · `1` — suma 1\n• `party.resources.food` · `-1` — resta 1\n• `party.stats.fatigue` · `=0` — lo fija\n• `party.resources.food` · `-{{party.stats.mouths}}` — tanto como otro valor\n• `party.members.values.health` · `1`, `acting.conditions.wounded` · `false` — sus personajes\nUn cambio que pasa del **Mín** o el **Máx** de un valor se queda ahí, y los pasos siguientes ven `trip.below` / `trip.above`.',
      set: 'Valores del día que declara el sistema (**Reglas → Valores del día**), una fila por valor; duran hasta que acaba el día.\n• `lost` · `true`\n• `ferry` · `true` — lo que puede esperar un paso **Esperar algo**',
      do: 'Otra acción del sistema, que se hace ahora si se cumplen sus condiciones (si no, no pasa nada). **Con** le da sus parámetros; vacío, cada uno toma el suyo por defecto.\n• **Marchar**, con **until** `hex` — un hex de marcha\n• una marcha forzada: **Cambiar la velocidad** `1.5`, y luego **Hacer otra acción** Marchar',
      roll: 'Lo que se tira ahora, con su resultado al acabar la acción (así que los pasos siguientes aún no lo ven):\n• una comprobación del sistema (**Comprobaciones**), sea cual sea su **Cuándo**\n• una tabla, oráculo, generador o mazo de los packs del sistema, p. ej. `table.ruins`: sin comprobación alrededor, su resultado en el diario con su nombre, sus valores y cambios llegan al viaje, y una entrada con pausa lo detiene',
      say: 'Una línea propia del sistema en el diario. Los valores que lleve se leen en ese momento:\n• `Los porteadores cantan mientras caminan.`\n• `Al otro lado, con {{party.resources.food}} de comida.`',
      pause:
        'El viaje espera aquí hasta que el jugador pulse **Continuar**, y luego sigue con el resto. Vacío: solo espera; con un texto, la caja de espera y el diario lo dicen (`La barca está en la otra orilla.`).',
      ask: 'El viaje espera a que el jugador elija uno de los **Parámetros** de esta acción, con un botón por opción; los pasos siguientes leen la respuesta, p. ej. **Solo si** `params.how` es `swim`.',
      wait: 'Pasa el tiempo hasta que se cumple esta condición, minuto a minuto, viviendo los momentos del camino. Si ya se cumple, no pasa el tiempo.\n• `today.ferry` es `true` — lo da una acción a mediodía\n• `time.part` es uno de `afternoon, evening`',
      limit:
        "Lo máximo que espera, escrito como en **Pasar el tiempo**:\n• `60` — minutos desde ahora\n• `'18:00'`\n• `time.part.night`",
    },
    with: {
      default: 'el de por defecto',
      none: 'Esta acción no tiene parámetros.',
    },
    pairs: {
      key: 'Qué cambia',
    },
    noChoice: '— elige —',
    noParams: 'Esta acción no tiene parámetros que preguntar: declara uno antes en **Parámetros**.',
    open: 'Mostrar este paso',
    close: 'Plegar este paso',
    drag: 'Arrastra para mover este paso',
    yaml: 'Editar como YAML',
    form: 'Editar como formulario',
    unknown: 'Este paso no hace una sola cosa que el viaje conozca: arréglalo como YAML.',
    partBegins: 'que empiece {part}',
    onlyWhen: 'solo si {condition}',
    notWhen: 'salvo si {condition}',
    say: {
      time: 'Pasan {time}',
      timeUntil: 'Pasa el tiempo hasta {time}',
      moveDestination: 'Moverse hasta el destino',
      moveHex: 'Moverse un hex',
      moveHexes: 'Moverse {count} hexes',
      move: 'Moverse: {value}',
      speed: 'Velocidad ×{value} el resto del día',
      advance: 'Avanzar {value} por la ruta',
      mode: 'Viajar: {mode}',
      effects: 'Cambia: {changes}',
      cleared: '{name} (ya no)',
      set: 'Da: {values}',
      do: 'Hacer {action}',
      doWith: 'Hacer {action} ({with})',
      roll: 'Tirar {check}',
      say: 'Decir «{text}»',
      pause: 'Pausar hasta Continuar',
      pauseText: 'Pausar: «{text}»',
      ask: 'Preguntar: {param}',
      wait: 'Esperar a que {condition} (como mucho {limit})',
      unknown: 'Paso desconocido: {step}',
    },
  },
  kinds: vocabulary.es.kinds,
  checks: {
    search: 'Buscar en las comprobaciones (nombre, evento, momento, tabla…)',
    paused: 'pausa',
    title: 'Comprobaciones',
    help: 'Qué se tira por el camino, cuándo y en qué tabla. Una comprobación sin tabla solo se apunta en el diario (con sus **Cambios**); solo **Pausar después** detiene el viaje.',
    event: 'Comprobación',
    name: 'Nombre',
    nameHelp:
      'Lo que leen los jugadores en el panel del viaje y el diario en lugar del id del evento:\n• `NAVIGATION_CHECK_REQUIRED` → _Perderse_\n• `HUNGER_CHECK_REQUIRED` → _Hambre_\nEsta caja lo edita en el idioma actual: el del pack, o su fichero de traducción si la interfaz está en otro.',
    at: 'Cuándo',
    atOptions: {
      'hex-enter': 'Al entrar en un hex',
      camp: 'Al acampar',
      'day-end': 'Al final del día',
    },
    atNone: 'solo cuando un paso la tira',
    atPart: 'Al empezar {part}',
    atClock: 'A las {clock}',
    atFull: 'Al llenarse {clock}',
    atHelp:
      'Cuándo se tira:\n• una hora, p. ej. `06:00` — al dar esa hora, marchando, esperando o durmiendo\n• una parte del día del calendario, p. ej. `time.part.morning` — al empezar\n• `trip.hex-enter` — al entrar en cada hex\n• `time.day-end` — al acabar cada día (tras las acciones day-end del sistema)\n• una acción, p. ej. `actions.camp` o `actions.forage` — cuando el grupo la hace\n• un reloj de progreso al llenarse, p. ej. `world.clocks.the-threat.full` — lo llene lo que lo llene: el viaje, el turno de una facción o una mano en el panel Mundo; uno hecho a mano se nombra por su nombre en minúsculas con guiones\nVarios, cada uno una pastilla (Intro o una coma lo añade): `trip.hex-enter` y `actions.rest`. Sus condiciones y su tabla ven cuál es como `moment` (`when: { trip.moment: actions.rest }`).\nVacío: solo cuando la tira un paso de una acción (`roll: checks.<su evento>`).',
    atAction: 'Acción: {action}',
    when: 'Solo si',
    unless: 'Salvo si',
    conditionHelp:
      "Cuándo se tira la comprobación (**Solo si**) o se salta (**Salvo si**), con condiciones como las de las tablas, una fila cada una (qué lee · comparación · valor), o como YAML:\n• `hex.terrain: forest` — el hex\n• `hex.tags: landmark` — una etiqueta del hex\n• `trip.edges: [road, river]` — el camino o río del paso\n• `hex.danger: { gte: 2 }` — un valor del hex o de su región\n• `time.season: winter`, `trip.weather: storm` — el momento\n• `time.hour: { gte: 20 }` — desde las 20:00; `time.watch: 3` — la tercera guardia\n• `time.meal: elevenses`, `time.tags: dark` — una parte del día del calendario, o sus etiquetas\n• `from.terrain: forest` — saliendo de un bosque; `trip.visits: { gte: 2 }` — de vuelta\n• `world.clocks.the-flood: { gte: 4 }` — un reloj del reloj del mundo; `world.events: market-day` — el evento de hoy\n• `danger: { gt: '{{party.stats.stealth}}' }` — una variable: comparado con otro valor\n• `party.stats.wits: { gte: '{{1d20}}' }` — una tirada bajo una característica\nCada valor por su **nombre completo**, que dice de dónde sale (`hex.*`, `time.*`, `trip.*`, `system.*`, `world.*`, `party.*`): nunca lo tapa una característica con el mismo nombre\n• `party.resources.food: { lt: 1 }` — el grupo\n• `acting.values.survival: { gte: 2 }`, `characters.kael.conditions: wounded`, `party.members: kael` — sus personajes, cuando el sistema tiene hoja\n• `trip.below: food` — la comida llegó hoy a su mínimo (en `time.day-end`)\n• `trip.moment: actions.rest` — cuál de sus momentos es (si tiene varios)\n• `any: [{ hex.terrain: forest }, { danger: { gte: 3 } }]` — cualquiera de los dos\nSe leen justo antes de tirar la comprobación: las de un mismo momento llegan una a una, en el orden de la lista, y cada una ve lo que fijaron las anteriores (al alba, después de la del clima, `trip.weather: storm` es el de hoy)",
    always: 'siempre',
    never: 'nunca',
    resolve: 'Se tira en',
    resolveHelp:
      'La tabla, oráculo, generador o mazo que la resuelve. Su resultado va al diario, y sus valores `set` y `effects` llegan al viaje.\n• `table.getting-lost` — pone `lost: true` con una mala tirada\n• `oracle.ford` — un oráculo, con su entrada desde el contexto de la comprobación\n• un modelo de clima — el clima del día con inercia\n• **sin tabla** — solo se apunta en el diario, con sus **Cambios**; marca **Pausar después** para resolverla a mano',
    weatherModels: 'Clima con inercia',
    weatherModel: 'Modelo de clima: {model}',
    waits: '— sin tabla —',
    effects: 'Cambios',
    effectsHelp:
      'Lo que cambia la propia comprobación cuando sale, con o sin tabla, una fila cada cosa (qué cambia · valor): un número suma o resta.\n• `party.stats.fatigue` · `1` — suma 1\n• `party.resources.food` · `-1` — quita 1\n• `party.stats.fatigue` · `=0` — lo fija\n• `party.resources.food` · `-{{party.stats.mouths}}` — tantos como dice otro valor (una variable)\n• `party.members.values.health` · `-1`, `acting.conditions.wounded` · `true` — sus personajes (todos, el que actúa)\nEs como un sistema escribe sus reglas como datos, p. ej. un día sin comida suficiente: **Cuándo** `time.day-end`, **Solo si** `trip.below: food`, **Cambios** `party.stats.fatigue: 1`.',
    pause: 'Pausar después',
    pauseHelp:
      'El viaje **se detiene** cuando sale esta comprobación (tras tirarla, si algo la resuelve) y espera a que pulses **Continuar**: tiempo para describir el lugar, escribir lore o decidir algo. Es lo único que hace que una comprobación detenga el viaje: sin ello, una sin tabla solo se apunta en el diario.\n• un santuario encontrado por el camino, tirado en su tabla\n• un hito que describir, sin tabla\nUna entrada de tabla también puede pausar, solo cuando sale (`pause: true` en la entrada).',
    context: 'Contexto extra',
    contextKey: 'Qué ve la tabla',
    contextHelp:
      'Valores que la tabla ve **solo en esta comprobación**, una fila cada uno (qué ve la tabla · valor):\n• `timeOfDay` · `night` — un encuentro nocturno tirado en la tabla de día\n• `danger` · `3` — como si el hex fuera más peligroso',
    none: 'Sin comprobaciones: los viajes solo gastan tiempo y provisiones.',
    add: 'Añadir una comprobación',
    orphans: 'Tablas asociadas a comprobaciones que estas reglas no tienen: {events}.',
    removeOrphans: 'Quitarlas',
    stats: 'Características del grupo',
    statsHelp:
      'Números del grupo que pueden usar las tablas, editados durante el viaje:\n• `survival` — en una tirada: `1d6 + {{party.stats.survival}}`\n• `morale` — en una condición: `party.stats.morale: { lte: 1 }`\n• `fatigue` — lo cambian los efectos: `party.stats.fatigue: 1`',
    statName: 'Nombre',
    statDescription: 'Descripción',
    statDefault: 'Empieza en',
    noStats: 'Sin características del grupo.',
    addStat: 'Añadir una característica',
    statFrom: 'De las hojas',
    statFromHelp:
      'Con personajes en el grupo, la característica sale de las suyas (y los efectos sobre ella se sobrescriben); sin ellos, se guarda como cualquier otra. Una de:\n• `max: survival` — la mejor Supervivencia entre ellos\n• `min: stealth` — la peor\n• `sum: strength` — la de todos juntos\n• `count: true` — cuántos son\n• `pick: charisma` — el que elija el jugador para tirar en el viaje (el mejor por defecto)\nAñade `when` / `unless` para contar solo a algunos, y `none` para cuando no cuenta nadie:\n• `count: true, unless: { conditions: wounded }` — los que no están heridos\n• `max: wits, when: { values.health: { gt: 0 } }, none: 0` — la mejor de los que siguen en pie\nNecesita una hoja (la pestaña **Hoja**).\nO un valor de la hoja del propio grupo, siempre: la característica es ese valor, y los efectos sobre ella cambian la hoja:\n• `party: morale` — la Moral de la hoja de grupo',
    statFromNone: 'la guarda el grupo',
    roles: 'Roles de viaje',
    rolesHelp:
      'Tareas que asumen los personajes del grupo durante el viaje (guiar, montar guardia, buscar comida…), al estilo de Forbidden Lands: en un viaje, cada rol se le da a un personaje, y las comprobaciones, tablas y acciones del sistema leen a quien lo tiene y le cambian cosas:\n• `roles.guide.values.pathfinding: { gte: 2 }` — el guía es lo bastante bueno\n• `modeWhen: { advantage: { roles.lookout.values.stealth: { gte: 2 } } }` — una tabla tirada con ventaja\n• `roles.lookout.values.health: -1` — un efecto sobre el vigía\nNecesita una hoja.',
    roleName: 'Nombre',
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
    dependency:
      'De {pack}, un pack que trae este sistema: aquí es de solo lectura, porque lo comparten todos los sistemas que lo traen. Para cambiarlo en este sistema, haz el tuyo en el pack del sistema.',
    builtIn:
      'Las reglas genéricas son el sistema de Core, el que juega un mapa que no elige ninguno: aquí son de solo lectura, porque cualquier sistema puede traer Core. Para cambiarlas, crea un sistema nuevo (debajo de la lista de la izquierda): empieza con una copia de sus reglas.',
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
  uses: {
    title: 'Usado en',
    help: 'Dónde se usa esto en los packs del sistema: las acciones y comprobaciones de las reglas de viaje, los bindings, las hojas, los relojes y facciones, y las tablas, oráculos, generadores y mazos. Cada sitio dice si lo **lee** (una condición, un `{{…}}`), lo **cambia** (efectos), lo **fija** (`set`), **sale de** él (el `from` de una característica) o lo **nombra** (`do: actions.march`, `blocks: [modes.horse]`, `roll: table.ruins`, la tabla siguiente de una entrada).\n• El número es en cuántos sitios se usa; púlsalo para verlos debajo de la fila, cada uno con un enlace a donde se edita (las tablas se abren en el Oráculo).\n• **–** quiere decir que nada lo usa aún: a menudo está bien (un valor que lee el jugador), a veces es un error (una característica que no lee ninguna tabla, un nombre escrito de otra manera).\nNo se listan lo que da el mapa (los valores propios de un hex) ni lo que los motores leen por su cuenta.',
    count: 'Se usa en {n} sitios',
    find: 'Buscar un nombre',
    findHelp:
      'Todos los sitios de los packs del sistema que leen, cambian o fijan un nombre, tal como está escrito o por su nombre completo: también las tablas, que ninguna otra pestaña enseña.\n• `pathfinding` — un valor de la hoja de los personajes\n• `party.stats.morale` — una característica del grupo por su nombre completo; también la encuentra donde está escrito en corto (`morale`)\n• `roles.guide` — todo lo que se lee de quien tiene un rol\n• `today.lost` — un valor del día\nUn nombre que nada del sistema declara suele ser una errata: lo dice, con los nombres a los que se parece.',
    findPlaceholder: 'pathfinding, party.stats.morale…',
    nothing: 'Nada de este sistema lo usa.',
    undeclared: 'Nada de este sistema lo declara, y los motores no lo dan: ¿una errata?',
    close: 'Nombres parecidos: {names}',
  },
  yaml: { line: 'línea {line}' },
  terrains: vocabulary.es.terrains,
  edgeKinds: vocabulary.es.pathKinds,
  storage: {
    full: 'El almacenamiento del navegador está lleno: exporta tus packs para no perderlos.',
  },
}

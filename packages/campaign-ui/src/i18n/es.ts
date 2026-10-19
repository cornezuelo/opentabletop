import { vocabulary } from '@open-tabletop/ui-kit'
import type { Messages } from './types'

export const es: Messages = {
  whatItDoes: 'Qué hace',
  world: {
    clockIdTip:
      'Cómo leen este reloj las tablas y las condiciones: world.clocks.{id} (su nombre en minúsculas con guiones)',
    weatherLine: 'Clima: {weather}',
    weatherHelp:
      'El clima de hoy. Con un viaje en marcha, el del viaje (su tirada de clima); sin él, el del propio reloj del mundo: cada día que pasa se tira con el modelo de clima del sistema de la campaña, siguiendo al del día anterior. Las tiradas a mano lo leen como `weather`.',
    intro:
      'El reloj del mundo lleva la fecha de la campaña, compartida por sus mapas y viajes: haz avanzar el tiempo, programa eventos que llegan en su día y lleva relojes de progreso («Cae el cometa: 3/6»).',
    start: 'Poner en marcha el reloj del mundo',
    stop: 'Parar el reloj del mundo',
    confirmStop: '¿Parar el reloj del mundo? Se olvidan su fecha, eventos, relojes y cronología.',
    dayLine: 'Día {day} · {clock} · {season}',
    day: 'Día {day}',
    date: '{weekday}, {day} de {month}, año {year}',
    seasons: vocabulary.es.seasons,
    moon: vocabulary.es.moonPhases,
    moonLine: '{moon} está {phase}',
    advance: 'Avanzar el tiempo',
    advanceHelp:
      'Hace avanzar el tiempo del mundo. Los eventos que llegan por el camino se anotan en la cronología (y, durante un viaje, en su diario), junto a las fiestas y las lunas llenas y nuevas.\n• **Siguiente: Guardias** — hasta que empieza la siguiente parte de una división del día (las del calendario: comidas, guardias… cada sistema las suyas)\n• **Hasta…** — hasta que empieza la parte elegida\n• **Día siguiente** — hasta que empieza el día siguiente, a medianoche\n• **Próximo evento** — directamente al siguiente evento programado',
    tripHelp:
      'Hay un viaje en marcha sin ruta, así que estos botones hacen que el grupo espere en {hex} (planea una ruta y seguirá viajando por ella). Se vive cada momento (las comprobaciones de cada momento que nombra el sistema, su parada cuando el grupo no puede marchar, el final de cada día, comer), y la espera se detiene antes si algo te necesita.',
    tripAdvance: 'Esperar aquí',
    tripAdvanceTravel: 'Seguir viajando',
    tripNotice: 'Hay un viaje en marcha sin ruta: el grupo espera en {hex}.',
    tripNoticeTravel: 'Hay un viaje en marcha: el grupo sigue viajando hacia {hex}.',
    tripHelpTravel:
      'Hay un viaje en marcha con una ruta, así que estos botones hacen que el grupo siga viajando hacia {hex}: marcha por su ruta cuando el sistema lo deja, hace la parada del sistema cuando no puede (acampar, o el tiempo pasa sin ello) y espera donde acaba la ruta. Se vive cada momento (las comprobaciones de cada momento que nombra el sistema, el final de cada día, comer), y se detiene antes si algo te necesita.',
    hour: '+1 hora',
    watches: vocabulary.es.terms.watches,
    nextPart: 'Siguiente: {division}',
    untilPart: 'Hasta…',
    untilPartGo: 'Ir',
    nextDay: 'Día siguiente',
    nextEvent: 'Próximo evento',
    events: 'Eventos',
    eventsHelp:
      'Cosas que pasan en una fecha: una fiesta, un ataque, la llegada de un barco. Llegan cuando el tiempo las alcanza, en la cronología y el diario del viaje; las que se repiten vuelven.\n• _Atacan los Señores de la Sal_ en 3 días\n• _Día de mercado_ cada 7 días',
    noEvents: 'Nada programado.',
    eventName: 'Qué pasa',
    inDays: 'Dentro de (días)',
    at: 'a las',
    repeat: 'Repetir',
    once: 'Una vez',
    everyN: 'Cada N días',
    everyDays: 'cada {days} días',
    yearly: 'cada año',
    schedule: 'Programar',
    cancel: 'Cancelar este evento',
    confirmCancel: '¿Cancelar «{name}»?',
    clocks: 'Relojes de progreso',
    clocksHelp:
      'Segmentos que se llenan según algo avanza (una amenaza, un proyecto, el plan de una facción):\n• _Cae el cometa_ 2/6\n• _Se reconstruye el puente_ 1/4\nHaz clic en un segmento para llenar hasta él; en el último lleno para vaciarlo. Con los segmentos que quieras: cámbialos junto a la cuenta.\nEl sistema de la campaña puede declarar los suyos (`kind: clocks`): llegan con el reloj del mundo y hacen lo que dice el sistema al llenarse (una línea aquí, una tabla tirada, otros relojes y facciones cambiados, volver a empezar).',
    clockName: 'Nombre del reloj',
    segments: 'Segmentos',
    addClock: 'Añadir',
    removeClock: 'Quitar este reloj',
    confirmRemoveClock: '¿Quitar el reloj «{name}»?',
    clockFilled: vocabulary.es.world.clockFilled,
    systemClocks: 'Añadir los relojes del sistema ({count})',
    systemClocksHelp:
      'Los relojes de progreso que declara el sistema de la campaña (`kind: clocks` en su pack), cada uno con sus segmentos, por dónde empieza y qué pasa cuando se llena. Llegan con el reloj del mundo al ponerlo en marcha; esto añade los que aún no tiene (quitados, o declarados después).',
    declaredClock:
      'Declarado por el sistema: las tablas y las condiciones también lo leen como world.clocks.{id}, se llame como se llame aquí.',
    whenFull: 'Cuando se llena: {what}',
    fullRolls: 'tira {table}',
    fullEffects: 'cambia {effects}',
    fullThen: {
      keep: 'se queda lleno',
      reset: 'vuelve a empezar',
      remove: 'desaparece',
    },
    timeline: 'Cronología',
    timelineHelp:
      'Lo que ha pasado en el mundo, lo más reciente primero: eventos que llegaron, fiestas, lunas. Añade tus propias notas («Derrocaron al barón»).',
    noTimeline: 'Aún nada.',
    note: 'Una nota para la cronología',
    addNote: 'Añadir',
    startAt: 'Empieza el',
    startAtHelp:
      'La fecha en la que empieza el reloj del mundo, en el calendario del sistema de la campaña: día, mes, año y hora (con el calendario por defecto, el número de día y la hora).\n• **15 de Mesclaro de 412, 06:00** — empezar a mitad del verano\nCon un viaje en marcha, el reloj empieza a la hora del viaje (comparten el tiempo).',
    startAtTrip: 'Hay un viaje en marcha: el reloj empieza a su hora.',
    setDate: 'Fijar la fecha',
    setDateHelp:
      'Lleva el reloj del mundo a una fecha.\n• **Más tarde**: como avanzar el tiempo (con un viaje en marcha el grupo viaja o espera hasta entonces, y se pregunta antes de que pasen días); llegan los eventos, fiestas y lunas del camino.\n• **Antes**: se pregunta primero, y solo sin un viaje en marcha. No se deshace nada de lo que pasó: la cronología lo conserva y dice que el reloj volvió atrás.',
    setDateGo: 'Ir a esta fecha',
    setDateCancel: 'Cancelar',
    confirmRewind:
      '¿Volver el reloj a esta fecha? Lo que pasó sigue en la cronología; los eventos que se repiten no vuelven.',
    noRewindTrip:
      'El reloj no puede volver atrás con un viaje en marcha: el tiempo de un viaje nunca retrocede.',
    rewound: 'El reloj volvió atrás (desde {from})',
    dateDay: 'Día del mes',
    dateMonth: 'Mes',
    dateYear: 'Año',
    dateDayNumber: 'Día',
    dateMissing: 'El calendario no tiene esa fecha (o es anterior al primer día).',
    eventId: 'Id',
    eventIdHelp:
      'Cómo nombran al evento las condiciones y las tablas en su día: `world.events: <id>`. Palabras en minúscula unidas por guiones, una por evento.\n• `market-day` — `when: { world.events: market-day }`\n• `clan-raid`\nVacío: su nombre escrito así (**Market day** → `market-day`; si está ocupado se le añade un número). Su nombre también vale, como id.',
    eventIdBad: 'Un id son palabras en minúscula unidas por guiones: market-day.',
    eventIdTaken: 'Ocupado: se le añadirá un número.',
    eventDescription: 'Descripción (opcional)',
    when: 'Cuándo',
    onDate: 'En una fecha',
    onDatePast: 'Esa fecha ya pasó.',
  },
}

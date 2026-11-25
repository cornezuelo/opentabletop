import type { Messages } from './types'

export const es: Messages = {
  log: {
    startSession: 'Empezar una sesión',
    endSession: 'Terminar la sesión',
    sessionHelp:
      'Una sesión es una partida, marcada con la fecha real. Todo lo jugado desde el momento del juego en que empieza hasta la sesión siguiente queda bajo ella.\n• Empezar una sesión termina la que está en curso\n• Sin sesiones, el diario es una sola lista',
    session: 'Sesión {n}',
    going: 'en curso',
    outside: 'Antes de la primera sesión',
    from: 'Jugado en',
    fromHelp:
      'Solo lo jugado en uno de los mapas, viajes o escenas de la campaña (se dejan fuera las líneas del mundo, las tiradas a mano y las notas).',
    everywhere: 'En todas partes',
    export: 'Exportar',
    exportTip:
      'El diario tal como se ve (su nivel, sus filtros), como fichero Markdown: escrito tal cual, o en la notación de Lonelog para juego en solitario',
    asMarkdown: 'Markdown',
    asLonelog: 'Lonelog',
    lonelogDate: 'Fecha',
    world: 'El mundo',
    oracle: 'Tirada a mano',
    note: 'Nota',
    open: 'Abrir {name}',
    noteHere: 'Una nota aquí',
    writeNote: 'Escribir una nota',
    notePlaceholder: 'Qué pasó, qué significa, qué recordar… (Markdown)',
    save: 'Guardar',
    cancel: 'Cancelar',
    edit: 'Editar la nota',
    remove: 'Borrar la nota',
    removeTitle: 'Borrar la nota',
    removeAsk: '¿Borrar esta nota del diario? No se puede deshacer.',
    empty:
      'Aún no se ha jugado nada. Los momentos de los viajes y escenas de esta campaña llegan aquí según se juegan, con las líneas del mundo, las tiradas a mano del Oráculo y tus notas.',
    untitled: 'Sin título',
  },
}

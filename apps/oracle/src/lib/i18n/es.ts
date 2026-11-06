import { vocabulary, type Messages } from '@open-tabletop/ui-kit'
import type { en } from './en'

export const es: Messages<typeof en> = {
  app: {
    title: vocabulary.es.apps.oracle,
    tagline: 'Tira y crea tablas aleatorias, generadores, oráculos y mazos.',
  },
  nav: {
    favorites: 'Favoritos',
    favorite: 'Favorito: fijado arriba de la lista (también en Mapa)',
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
  campaign: {
    title: vocabulary.es.terms.campaign,
    open: vocabulary.es.campaign.open,
    none: 'Sin campaña',
    help: 'Dónde guardan las tiradas a mano sus mazos, sus resultados de una sola vez y su historial: la campaña en la que juegas, elegida en **Jugando** arriba (la misma en todas las aplicaciones).\n• **Sin campaña** — los propios del Oráculo, en este navegador\n• una campaña — compartidos con sus mapas y viajes: una carta robada aquí ya no sale en los viajes de ese mapa, y las tiradas aparecen en su panel del Oráculo\nTu semilla (Preferencias) sigue siendo la de este navegador en ambos casos.',
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
    title: vocabulary.es.apps.oracle,
    body: 'Elige una tabla, generador, oráculo o mazo a la izquierda para tirarlo. Los packs son carpetas de ficheros YAML: los incluidos son de solo lectura (edita una copia) y los tuyos se guardan en este navegador. Expórtalos como .zip para tener copia o compartirlos.',
    packs: '{packs} packs, {definitions} definiciones',
  },
  tabs: { roll: 'Tirar', edit: 'Editar' },
  pack: {
    definitions: 'Definiciones',
    newDefinition: 'Nueva definición',
    other: 'Otras definiciones',
    otherHelp:
      'Reglas para otros motores: reglas de viaje, bindings, calendarios, modelos de clima. Edítalas en sus ficheros (YAML), o las reglas de viaje en la aplicación **Viajes**.',
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
  storage: {
    full: 'El almacenamiento del navegador está lleno: exporta tus packs para no perderlos.',
  },
  common: { cancel: 'Cancelar', ok: 'Aceptar', close: 'Cerrar' },
}

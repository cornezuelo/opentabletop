import type { Messages } from '@open-tabletop/ui-kit'
import type { en } from './en'

export const es: Messages<typeof en> = {
  updates: {
    title: 'La versión incluida de este pack ha cambiado desde que hiciste tu copia.',
    versions: 'Incluida: {bundled} · tu copia: {mine}.',
    untracked:
      'Tu copia se hizo antes de que OpenTabletop siguiera las actualizaciones: estos ficheros son distintos de la versión incluida (por tus cambios o por actualizaciones; no se puede saber). Elige en cada uno; a partir de ahora se te avisará de lo que cambie.',
    added: 'nuevo en el pack incluido',
    changed: 'ha cambiado en el pack incluido; tú no lo has tocado',
    removed: 'quitado del pack incluido',
    both: 'ha cambiado en el pack incluido y en tu copia',
    differs: 'es distinto de la versión incluida',
    take: 'Coger el incluido',
    keep: 'Quedarme el mío',
    takeHelp:
      'Sustituye tu versión de este fichero por la incluida (un fichero que el pack incluido ha quitado se quita). ↶ lo deshace.',
    keepHelp: 'Conserva tu versión de este fichero y deja de avisar de esta actualización.',
    takeUntouched: 'Coger las actualizaciones que no has tocado ({count})',
    takeUntouchedHelp:
      'Trae todos los ficheros que el pack incluido ha cambiado y que tu copia dejó como estaban: no se pierde nada tuyo. ↶ lo deshace.',
    keepAll: 'Dejar mi copia como está',
    keepAllHelp:
      'Ignora estas actualizaciones: tu copia se queda como está y dejan de mostrarse. Volver a la versión incluida sigue trayendo todo el pack incluido.',
    show: 'Ver la versión incluida',
    hide: 'Ocultar',
  },
  older: {
    title: 'Sin leer: escritos para un formato de pack anterior',
    help: 'Estos packs tuyos se escribieron para un formato de pack anterior, cuya sintaxis ahora significa otra cosa, así que las aplicaciones no los leen (por ahora, los formatos anteriores no se convierten). Siguen aquí: descarga uno para guardarlo, y llévalo al formato {format} (Formatos de fichero, en el manual, dice qué cambió) para volver a usarlo. Si es una copia de un pack incluido, mientras tanto se usa el incluido.',
    item: '{name} (formato {format})',
    copy: 'tu copia de un pack incluido',
    download: 'Descargar .zip',
    delete: 'Borrar',
    confirmDelete:
      '¿Borrar {name} de este navegador? (↶ lo deshace; descárgalo antes para guardar una copia.)',
  },
  import: {
    done: 'Importado: {packs}.',
    already: 'Ya estaban, sin cambios: {packs}.',
    noManifest: 'No hay ningún pack.yaml en ese fichero.',
    failed: 'No se pudo importar: {message}',
    replace:
      'El fichero trae su propia versión de packs que ya tienes: {packs}. ¿Los sustituyes por los del fichero? (↶ lo deshace; un pack incluido se puede devolver a su versión incluida.)',
  },
  condition: {
    ops: {
      is: 'es',
      in: 'es uno de',
      not: 'no es',
      notIn: 'no es ninguno de',
      gt: 'es más de',
      gte: 'es al menos',
      lt: 'es menos de',
      lte: 'es como mucho',
      exists: 'existe',
      missing: 'falta',
    },
    and: 'y',
    or: 'o',
    all: 'Todas estas',
    any: 'Alguna de estas',
    fact: 'Qué lee',
    op: 'Comparación',
    value: 'Valor',
    values: 'Valores, separados por comas',
    add: '+ Condición',
    addFirst: '+ Añadir una condición',
    remove: 'Quitar esta condición',
    none: '—',
    rowsShort: 'Filas',
    yaml: 'Editar como YAML',
    rows: 'Editar como filas',
    intricate:
      'Está escrita de una forma que las filas no pueden mostrar (grupos dentro de grupos, o una condición entera dada la vuelta con not:): edítala como YAML.',
    badYaml:
      'Escríbelo como pares clave: valor, p. ej. hex.tags: landmark o hex.terrain: [forest, hills].',
  },
}

import { vocabulary, type Messages } from '@open-tabletop/ui-kit'
import type { en } from './en'

export const es: Messages<typeof en> = {
  app: {
    title: vocabulary.es.apps.notes,
    tagline: 'Tus notas y tu trasfondo, por campaña, enlazados con tus partidas.',
  },
  nav: {
    showSidebar: 'Mostrar las páginas',
    hideSidebar: 'Ocultar las páginas (más espacio)',
    showHelp: 'Mostrar la ayuda',
    hideHelp: 'Ocultar la ayuda (más espacio)',
    help: 'Ayuda y manual',
    search: 'Buscar en las páginas…',
    searchLabel: 'Buscar',
    newPage: 'Nueva página',
    noMatch: 'Ninguna página tiene esas palabras.',
    inTitle: 'en su título',
    more: 'Importar y exportar',
    export: 'Exportar como ficheros .md',
    exportTip:
      'Todas las páginas como un .zip de ficheros Markdown, una carpeta por campaña y General: Obsidian y SilverBullet lo abren tal cual.',
    import: 'Importar ficheros .md…',
    importTip:
      'Un .zip (o varios ficheros .md) de páginas Markdown: las que están en una carpeta con el nombre de una campaña (o General) van allí, el resto a la campaña que se está jugando.',
    examples: 'Añadir las páginas de ejemplo de…',
  },
  welcome: {
    title: vocabulary.es.apps.notes,
    body: 'Tu propia aplicación de notas: páginas en Markdown, guardadas en este navegador, por campaña (y **General**, para lo que no es de ninguna). Enlaza páginas con `[[Su título]]`, y el juego con `[[character:kael]]`, `[[map:<id>#0608]]` o `[[faction:<campaña>/<id>]]`: escribe `[[` y elige. Las demás aplicaciones abren estas páginas desde la nota de un personaje, una casilla o una facción (**✎** escribe una nueva).',
    start: 'Escribir una página',
  },
  page: {
    title: 'Ruta y título',
    titleHelp:
      'El título de la página, tras las carpetas en las que está, con `/` entre ellas: `pnj/Viejo Tobin` es **Viejo Tobin** en la carpeta **pnj**. Cambiarlo mueve la página, y los enlaces que llegaban a ella se cambian para llegar allí.',
    untitled: 'Sin título',
    taken: 'Ya hay otra página de la misma campaña en «{path}».',
    renamed: 'Movida; {n} enlaces cambiados para llegar a ella.',
    campaign: 'Campaña',
    campaignHelp:
      'Dónde está la página: una campaña, o **General** para lo que no es de ninguna. Una página de una campaña llega primero a las páginas de esa campaña y luego a las de General; una página de General solo llega a las de General.',
    edit: 'Editar',
    read: 'Leer',
    editTip: 'Escribir la página (Ctrl+E)',
    readTip: 'Leer la página con sus enlaces (Ctrl+E)',
    placeholder: 'Escribe en Markdown. [[ enlaza con una página o con el juego.',
    editorLabel: 'El texto de la página',
    empty: 'Aún no hay nada escrito. **Editar** (Ctrl+E) para escribirla.',
    more: 'Más',
    delete: 'Borrar la página',
    deleteAsk: '¿Borrar la página «{title}»? Los enlaces a ella se quedan, y la volverían a crear.',
    deleted: 'Página borrada.',
    missing: 'Esta página ya no está en este navegador.',
    linked: '{n} menciones enlazadas.',
    keys: 'Notas',
    keyToggle: 'Leer o editar la página',
    keyNew: 'Nueva página',
    keySearch: 'Buscar en las páginas',
  },
  imported: '{n} páginas importadas ({replaced} reemplazadas).',
  importNone: 'No hay ningún fichero .md en lo que has elegido.',
  importAsk:
    '¿Importar {n} páginas? {replaced} de ellas ocupan el lugar de una página en la misma ruta.',
  cancel: 'Cancelar',
  importButton: 'Importar',
  examplesAdded: '{n} páginas de ejemplo añadidas.',
}

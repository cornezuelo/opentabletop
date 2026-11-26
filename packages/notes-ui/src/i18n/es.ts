import type { Messages } from './types'

export const es: Messages = {
  kinds: {
    character: 'Personaje',
    map: 'Mapa',
    campaign: 'Campaña',
    faction: 'Facción',
    heading: 'Título',
  },
  general: 'General',
  links: {
    backlinks: 'Enlazan aquí',
    backlinksHelp:
      'Las páginas que enlazan con esta, cada una con las líneas que lo hacen, y las notas del Diario de la campaña que la enlazan.\n• Un enlace es `[[Su título]]`, o `[[carpeta/Su título]]` cuando dos páginas comparten título',
    journal: 'El Diario de la campaña',
    game: 'En el juego',
    gameHelp:
      'Lo del juego que nombra esta página (`[[character:kael]]`, `[[map:<id>#0608]]`…) y lo que la enlaza desde el juego: un personaje, una casilla, un lugar, una facción o una campaña cuya nota es esta página.\n• Cada uno se abre en su aplicación',
    namesIt: 'Enlaza aquí',
    unlinked: 'Sin enlazar',
    unlinkedHelp:
      'Páginas que escriben el título de esta sin enlazarla. **Enlazar** convierte cada una de esas menciones en un enlace.',
    link: 'Enlazar',
    linkTip: 'Convertir sus menciones en esa página en enlaces a esta',
    none: 'Nada aún.',
    missing: 'No está en este navegador',
  },
  tree: {
    pages: '{n} páginas',
    onePage: '1 página',
    newHere: 'Nueva página aquí',
  },
}

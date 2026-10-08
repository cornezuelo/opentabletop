const TEXT = {
  en: {
    help: 'Help',
    search: 'Search the manual…',
    noResults: 'Nothing found.',
    contents: 'Contents',
    openFull: 'Open the full manual',
    back: 'Back',
    title: 'Manual',
    apps: {
      hexmapper: 'Hexmapper',
      oracle: 'Oracle',
      travel: 'Travel',
      packs: 'Packs',
      technical: 'Technical',
    } as Record<string, string>,
    language: 'Language',
    contextHint:
      'Labels underlined with dots have help: click one to read it here. While this column is open, moving to a field shows its help too.',
    contextClose: 'Close this explanation',
    backToManual: 'The manual',
    findInManual: 'Find it in the manual',
    showContents: 'Show the contents',
    hideContents: 'Hide the contents (more room)',
  },
  es: {
    help: 'Ayuda',
    search: 'Buscar en el manual…',
    noResults: 'No se ha encontrado nada.',
    contents: 'Contenido',
    openFull: 'Abrir el manual completo',
    back: 'Volver',
    title: 'Manual',
    apps: {
      hexmapper: 'Hexmapper',
      oracle: 'Oracle',
      travel: 'Travel',
      packs: 'Packs',
      technical: 'Técnico',
    } as Record<string, string>,
    language: 'Idioma',
    contextHint:
      'Las etiquetas subrayadas con puntos tienen ayuda: pulsa una para leerla aquí. Mientras esta columna está abierta, pasar a un campo también muestra su ayuda.',
    contextClose: 'Cerrar esta explicación',
    backToManual: 'El manual',
    findInManual: 'Buscarlo en el manual',
    showContents: 'Mostrar el índice',
    hideContents: 'Ocultar el índice (más espacio)',
  },
}

export type ManualText = (typeof TEXT)['en']

/** The package's own texts in the host's language (English otherwise). */
export const textFor = (locale: string): ManualText => TEXT[locale as keyof typeof TEXT] ?? TEXT.en

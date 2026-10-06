const TEXT = {
  en: {
    help: 'Help',
    search: 'Search the manual…',
    noResults: 'Nothing found.',
    contents: 'Contents',
    openFull: 'Open the full manual',
    back: 'Back',
    title: 'Manual',
    apps: { hexmapper: 'Hexmapper', oracle: 'Oracle', travel: 'Travel' } as Record<string, string>,
    language: 'Language',
  },
  es: {
    help: 'Ayuda',
    search: 'Buscar en el manual…',
    noResults: 'No se ha encontrado nada.',
    contents: 'Contenido',
    openFull: 'Abrir el manual completo',
    back: 'Volver',
    title: 'Manual',
    apps: { hexmapper: 'Hexmapper', oracle: 'Oracle', travel: 'Travel' } as Record<string, string>,
    language: 'Idioma',
  },
}

export type ManualText = (typeof TEXT)['en']

/** The package's own texts in the host's language (English otherwise). */
export const textFor = (locale: string): ManualText => TEXT[locale as keyof typeof TEXT] ?? TEXT.en

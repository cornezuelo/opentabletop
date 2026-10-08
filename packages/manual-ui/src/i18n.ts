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
    contextHint:
      'Labels underlined with dots have help: click one to read it here. While this column is open, moving to a field shows its help too.',
    contextClose: 'Close the help',
    backToManual: 'The manual',
    inTheManual: 'In the manual',
    syntax: 'Syntax',
    syntaxTip: 'Everything a pack can write, with examples',
    insertHint: 'Click an example in code to insert it into “{field}”.',
    inserted: 'Inserted into “{field}”.',
    theField: 'the field',
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
    contextHint:
      'Las etiquetas subrayadas con puntos tienen ayuda: pulsa una para leerla aquí. Mientras esta columna está abierta, pasar a un campo también muestra su ayuda.',
    contextClose: 'Cerrar la ayuda',
    backToManual: 'El manual',
    inTheManual: 'En el manual',
    syntax: 'Sintaxis',
    syntaxTip: 'Todo lo que puede escribir un pack, con ejemplos',
    insertHint: 'Pulsa un ejemplo en código para insertarlo en «{field}».',
    inserted: 'Insertado en «{field}».',
    theField: 'el campo',
    showContents: 'Mostrar el índice',
    hideContents: 'Ocultar el índice (más espacio)',
  },
}

export type ManualText = (typeof TEXT)['en']

/** The package's own texts in the host's language (English otherwise). */
export const textFor = (locale: string): ManualText => TEXT[locale as keyof typeof TEXT] ?? TEXT.en

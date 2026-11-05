import { mapStyles } from '@open-tabletop/map'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PackLibrary } from './library.svelte'
import { copyStyle, MY_STYLES, styleSource } from './styles'
import { readDefinition } from './yaml'

const bundled = {
  root: 'packs/look',
  origin: 'bundled' as const,
  files: [
    { path: 'pack.yaml', content: 'id: look\nversion: 1.0.0\nlocale: en\n' },
    {
      path: 'styles.yaml',
      content: [
        'kind: style',
        'id: ink',
        'name: Ink',
        'description: Lines in ink.',
        "paper: '#efe3c4'",
        'art:',
        '  mode: ink',
        '  terrains: { forest: conifers }',
        '---',
        'kind: style',
        'id: plain',
        "paper: '#ffffff'",
        '',
      ].join('\n'),
    },
  ],
}

describe('map styles in the library', () => {
  beforeEach(() => {
    const data = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('finds where a style is written', () => {
    const library = new PackLibrary([bundled])
    expect(styleSource(library, 'look/plain')).toEqual({
      root: 'packs/look',
      path: 'styles.yaml',
      kind: 'style',
      id: 'plain',
    })
    expect(styleSource(library, 'look/none')).toBeNull()
    expect(styleSource(library, 'nothing')).toBeNull()
  })

  it('copies a style into the user’s styles pack, made with the first copy, as one undo step', () => {
    const library = new PackLibrary([bundled])
    expect(copyStyle(library, 'look/ink', 'en')).toBe(`${MY_STYLES}/ink-copy`)
    const { styles, problems } = mapStyles(library.registry)
    expect(problems).toEqual([])
    const copy = styles.find((s) => s.ref === 'my-styles/ink-copy')!.style
    expect(copy.name).toBe('Ink (copy)')
    expect(copy.description).toBeUndefined()
    expect(copy.paper).toBe('#efe3c4')
    expect(copy.art.terrains.forest.painter).toBe('conifers')
    expect(library.isEditable(library.rootOf(MY_STYLES)!)).toBe(true)

    // A second copy of the same style takes another id, in the same file.
    expect(copyStyle(library, 'look/ink', 'en')).toBe('my-styles/ink-copy-2')
    const file = library.readFile('my-styles', 'styles.yaml')!
    expect(readDefinition(file, '@style/ink-copy')?.paper).toBe('#efe3c4')
    expect(readDefinition(file, '@style/ink-copy-2')?.name).toBe('Ink (copy)')

    library.undo()
    expect(styleSource(library, 'my-styles/ink-copy-2')).toBeNull()
    library.undo()
    expect(library.rootOf(MY_STYLES)).toBeUndefined()
  })

  it('names a copy made in another language in a translation of the pack', () => {
    const library = new PackLibrary([bundled])
    copyStyle(library, 'look/plain', 'en')
    expect(library.readFile('my-styles', 'pack.yaml')).toContain('name: My map styles')
    copyStyle(library, 'look/ink', 'es')
    expect(library.readFile('my-styles', 'locales/es/styles.yaml')).toContain('Ink (copia)')
    const copy = mapStyles(library.registry).styles.find((s) => s.ref === 'my-styles/ink-copy')
    expect(copy?.style.name).toMatchObject({ es: 'Ink (copia)' })
  })
})

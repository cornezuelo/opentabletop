<script lang="ts">
  import {
    autocompletion,
    startCompletion,
    type CompletionContext,
    type CompletionResult,
  } from '@codemirror/autocomplete'
  import { indentWithTab } from '@codemirror/commands'
  import { markdown } from '@codemirror/lang-markdown'
  import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
  import { EditorState, Prec, type TransactionSpec } from '@codemirror/state'
  import { EditorView, keymap, placeholder as placeholderText } from '@codemirror/view'
  import { tags } from '@lezer/highlight'
  import { basicSetup } from 'codemirror'
  import { onDestroy, onMount, untrack } from 'svelte'
  import { pictureMarkdown, picturesIn, type NotePage } from '@open-tabletop/notes'
  import {
    askHelp,
    Icon,
    ImageFileError,
    ImagePicker,
    Kbd,
    MoreMenu,
    keepPictureFile,
    Picture,
    pictureIn,
    registerInserter,
    showToast,
    tooltip,
  } from '@open-tabletop/ui-kit'
  import type { GameIndex } from './game'
  import type { Translate } from './i18n'
  import { linkOptions, type SuggestTexts } from './suggest'
  import {
    headingLevel,
    insertBlock,
    insertTable,
    insertWebLink,
    setHeading,
    startPageLink,
    toggleLines,
    toggleMarks,
  } from './format'
  import { markdownSummary } from './summary'
  import { WRITING_KEYS } from './writingKeys'

  /**
   * A page's Markdown being written (CodeMirror), suggesting links as `[[` is typed: pages,
   * their headings after `#`, and the games' things. Pictures of the image library are chosen
   * (**Picture**) or dropped and pasted on the text (kept in the library at once), each written
   * as a line `![caption](picture:<id>)` and shown small under the text. Changes are handed on
   * a moment after typing stops, and on leaving the editor.
   */
  let {
    value,
    pages,
    index,
    campaign,
    texts,
    t,
    locale,
    placeholder = '',
    label,
    onchange,
    onsubmit,
    oncancel,
  }: {
    value: string
    pages: readonly NotePage[]
    index: GameIndex
    /** The page's campaign: which pages its links reach. */
    campaign: string | undefined
    texts: SuggestTexts
    t: Translate
    /** The UI's language (the image library's texts). */
    locale: string
    placeholder?: string
    label: string
    onchange: (value: string) => void
    /** Ctrl+Enter (⌘+Enter): the text handed on first, then this (a form's Save). */
    onsubmit?: () => void
    /** Escape, with no suggestions open (a form's Cancel). */
    oncancel?: () => void
  } = $props()

  function complete(context: CompletionContext): CompletionResult | null {
    const line = context.state.doc.lineAt(context.pos)
    const before = line.text.slice(0, context.pos - line.from)
    const found = linkOptions(before, pages, index, campaign, texts)
    if (!found) return null
    const from = context.pos - found.typed.length
    const prefixed = /^[a-z]+:/.test(found.typed)
    const options = prefixed
      ? found.options.filter((o) => o.insert.startsWith(found.typed))
      : found.options
    return {
      from,
      filter: !prefixed,
      options: options.map((o) => ({
        label: o.label,
        detail: o.detail,
        type: o.kind === 'page' || o.kind === 'heading' ? 'text' : 'variable',
        apply: (view, _c, start, end) => {
          // A link closed already (`]]`), maybe with its own text (`|the ferryman]]`, as
          // **Link** writes it from a selection): kept, the cursor after it.
          const closing = /^(\|[^[\]\n]*)?\]\]/.exec(view.state.sliceDoc(end, end + 200))
          view.dispatch({
            changes: { from: start, to: end, insert: closing ? o.insert : `${o.insert}]]` },
            selection: {
              anchor: start + o.insert.length + (closing ? closing[0].length : 2),
            },
          })
        },
      })),
    }
  }

  let host: HTMLDivElement
  let view: EditorView | undefined
  /** The text as it's being written, for the pictures shown under it. */
  let text = $state(untrack(() => value))
  const shown = $derived(picturesIn(text))
  let choosing = $state(false)
  let caption = $state('')

  /** A picture's line put at `at` (the cursor: absent), on a paragraph of its own. */
  function insertPicture(id: string, title = '', at?: number) {
    if (!view) return
    const line = pictureMarkdown(id, title)
    view.dispatch(insertBlock(view.state, line, line.length, at))
    view.focus()
  }

  /** A change of the writing bar made to the text, the editor focused again. */
  function run(change: (state: EditorState) => TransactionSpec): boolean {
    if (!view) return false
    view.dispatch(change(view.state))
    view.focus()
    return true
  }

  /** The cursor's line's heading level, for the headings' menu. */
  let level = $state(0)

  /** A link to a page or the games: begun, the suggestions open to choose it. */
  function pageLink(): boolean {
    run(startPageLink)
    if (view) startCompletion(view)
    return true
  }

  /** The summary of Markdown in the help column. */
  function markdownHelp() {
    askHelp({ title: t('bar.markdownTitle'), markdown: markdownSummary(locale) })
  }

  /** The bar's keys, ahead of the editor's own. */
  const barKeys = Prec.high(
    keymap.of([
      { key: 'Mod-b', run: () => run((s) => toggleMarks(s, 'bold')) },
      { key: 'Mod-i', run: () => run((s) => toggleMarks(s, 'italic')) },
      { key: 'Mod-1', run: () => run((s) => setHeading(s, 1)) },
      { key: 'Mod-2', run: () => run((s) => setHeading(s, 2)) },
      { key: 'Mod-3', run: () => run((s) => setHeading(s, 3)) },
      { key: 'Mod-0', run: () => run((s) => setHeading(s, 0)) },
      { key: 'Mod-k', run: pageLink },
      { key: 'Mod-Shift-k', run: () => run((s) => insertWebLink(s, t('bar.webText'))) },
      {
        key: 'F1',
        run: () => {
          markdownHelp()
          return true
        },
      },
    ]),
  )

  const KEYS = WRITING_KEYS

  /** A picture dropped or pasted: kept in the library, its line put where it fell. */
  function keepDropped(file: File, at?: number) {
    keepPictureFile(file, 'note').then(
      (image) => insertPicture(image.id, '', at),
      (e) =>
        showToast(
          t('pictures.notKept', { error: e instanceof ImageFileError ? e.code : String(e) }),
          'error',
        ),
    )
  }

  /** The cursor put on a picture's line in the text. */
  function goToPicture(id: string) {
    if (!view) return
    const at = view.state.doc.toString().indexOf(`(picture:${id})`)
    if (at < 0) return
    const line = view.state.doc.lineAt(at)
    view.dispatch({ selection: { anchor: line.from, head: line.to }, scrollIntoView: true })
    view.focus()
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  let emitted: string | undefined

  const highlight = HighlightStyle.define([
    { tag: tags.heading, color: 'var(--accent)', fontWeight: '600' },
    { tag: tags.strong, fontWeight: '700' },
    { tag: tags.emphasis, fontStyle: 'italic' },
    { tag: [tags.link, tags.url], color: '#9cb8d6' },
    { tag: tags.monospace, color: '#b5cea8' },
    { tag: [tags.processingInstruction, tags.meta], color: '#9c9480' },
    { tag: tags.quote, color: 'var(--text-muted)', fontStyle: 'italic' },
  ])

  const theme = EditorView.theme(
    {
      '&': { height: '100%', color: 'var(--text)', backgroundColor: 'var(--bg)' },
      '.cm-scroller': { fontFamily: 'inherit', fontSize: '15px', lineHeight: '1.6' },
      '.cm-content': { padding: '12px 4px', maxWidth: '72ch' },
      '.cm-gutters': { display: 'none' },
      '.cm-activeLine': { backgroundColor: 'rgb(200 162 74 / 0.06)' },
      '.cm-cursor': { borderLeftColor: 'var(--accent)' },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
        backgroundColor: 'rgb(200 162 74 / 0.25)',
      },
      '.cm-placeholder': { color: 'var(--text-muted)' },
      '.cm-tooltip': { backgroundColor: 'var(--panel)', border: '1px solid var(--accent)' },
      '.cm-tooltip-autocomplete ul li[aria-selected]': {
        color: 'var(--text)',
        backgroundColor: 'rgb(200 162 74 / 0.3)',
      },
      '.cm-completionDetail': { color: 'var(--text-muted)', marginLeft: '1em' },
    },
    { dark: true },
  )

  /** Ctrl+Enter hands the text on and submits, ahead of the editor's own new line. */
  const submitKey = Prec.highest(
    keymap.of([
      {
        key: 'Mod-Enter',
        run: () => {
          if (!onsubmit || !view) return false
          clearTimeout(timer)
          timer = undefined
          emitted = view.state.doc.toString()
          onchange(emitted)
          onsubmit()
          return true
        },
      },
    ]),
  )

  /** Escape cancels, after the suggestions have had it (closing them while open). */
  const cancelKey = keymap.of([
    {
      key: 'Escape',
      run: () => {
        if (!oncancel) return false
        oncancel()
        return true
      },
    },
  ])

  function flush() {
    if (timer === undefined || !view) return
    clearTimeout(timer)
    timer = undefined
    emitted = view.state.doc.toString()
    onchange(emitted)
  }

  let unregister: (() => void) | undefined

  onMount(() => {
    view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: value,
        extensions: [
          submitKey,
          barKeys,
          basicSetup,
          cancelKey,
          keymap.of([indentWithTab]),
          markdown(),
          autocompletion({ override: [complete], activateOnTyping: true }),
          syntaxHighlighting(highlight),
          EditorView.lineWrapping,
          placeholderText(placeholder),
          theme,
          EditorView.contentAttributes.of({ 'aria-label': label }),
          EditorView.updateListener.of((update) => {
            if (update.selectionSet || update.docChanged) level = headingLevel(update.state)
            if (!update.docChanged) return
            text = update.state.doc.toString()
            clearTimeout(timer)
            timer = setTimeout(flush, 400)
          }),
          EditorView.domEventHandlers({
            blur: () => flush(),
            drop: (event, editor) => {
              const file = pictureIn(event.dataTransfer)
              if (!file) return false
              event.preventDefault()
              const at = editor.posAtCoords({ x: event.clientX, y: event.clientY })
              keepDropped(file, at ?? undefined)
              return true
            },
            paste: (event) => {
              const file = pictureIn(event.clipboardData)
              if (!file) return false
              event.preventDefault()
              keepDropped(file)
              return true
            },
          }),
        ],
      }),
    })
    view.focus()
    unregister = registerInserter(host, (text) => {
      if (!view) return
      view.dispatch(view.state.replaceSelection(text), { scrollIntoView: true })
      view.focus()
    })
  })

  onDestroy(() => {
    unregister?.()
    flush()
    view?.destroy()
  })

  // A change from elsewhere (another tab, a rename) replaces the text unless ours is pending.
  $effect(() => {
    const next = value
    if (!view || next === emitted || next === view.state.doc.toString() || timer !== undefined)
      return
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } })
  })
</script>

<div class="note-editor">
  <div class="bar" role="toolbar" aria-label={t('bar.label')}>
    {#each [['bold', 'B'], ['italic', 'I'], ['strike', 'S']] as const as [format, sign] (format)}
      <button
        type="button"
        class="mark {format}"
        aria-label={t(`bar.${format}`)}
        use:tooltip={{ text: t(`bar.${format}`), keys: KEYS[format] }}
        onclick={() => run((s) => toggleMarks(s, format))}>{sign}</button
      >
    {/each}
    <span class="gap"></span>
    <MoreMenu label={t('bar.headings')} align="left">
      {#snippet button()}<span class="mark">H</span> ▾{/snippet}
      {#each [['title', 1], ['section', 2], ['subsection', 3], ['normal', 0]] as const as [name, n] (name)}
        <button
          type="button"
          class="heading h{n}"
          class:current={level === n}
          aria-current={level === n}
          onclick={() => run((s) => setHeading(s, n))}
          ><span>{t(`bar.${name}`)}</span><Kbd keys={KEYS[name]} {locale} /></button
        >
      {/each}
    </MoreMenu>
    {#each [['list', 'list'], ['numbered', 'numbered'], ['quote', 'quote']] as const as [format, icon] (format)}
      <button
        type="button"
        aria-label={t(`bar.${format}`)}
        use:tooltip={t(`bar.${format}`)}
        onclick={() => run((s) => toggleLines(s, format))}><Icon name={icon} /></button
      >
    {/each}
    <span class="gap"></span>
    <MoreMenu label={t('bar.link')} align="left">
      {#snippet button()}<Icon name="link" /> ▾{/snippet}
      <button type="button" onclick={pageLink}
        ><span>{t('bar.toPage')}</span><Kbd keys={KEYS.toPage} {locale} /></button
      >
      <button type="button" onclick={() => run((s) => insertWebLink(s, t('bar.webText')))}
        ><span>{t('bar.toWeb')} ↗</span><Kbd keys={KEYS.toWeb} {locale} /></button
      >
    </MoreMenu>
    <button
      type="button"
      aria-label={t('pictures.add')}
      use:tooltip={t('pictures.addTip')}
      onclick={() => ((caption = ''), (choosing = true))}><Icon name="picture" /></button
    >
    <button
      type="button"
      aria-label={t('bar.table')}
      use:tooltip={t('bar.table')}
      onclick={() => run((s) => insertTable(s, [t('bar.tableHead'), t('bar.tableHead')]))}
      ><Icon name="table" /></button
    >
    <button
      type="button"
      class="help"
      use:tooltip={{ text: t('bar.markdownTip'), keys: KEYS.markdown }}
      onclick={markdownHelp}>? {t('bar.markdown')}</button
    >
  </div>
  <div class="editor" bind:this={host}></div>
  {#if shown.length}
    <div class="pictures" aria-label={t('pictures.onPage')}>
      {#each shown as id (id)}
        <button
          type="button"
          class="thumb"
          onclick={() => goToPicture(id)}
          use:tooltip={t('pictures.goTo')}
          aria-label={t('pictures.goTo')}
        >
          <Picture {id}><span class="gone">?</span></Picture>
        </button>
      {/each}
    </div>
  {/if}
</div>

<ImagePicker
  bind:open={choosing}
  {locale}
  title={t('pictures.choose')}
  shape="note"
  onpick={(id) => id && insertPicture(id, caption)}
>
  {#snippet fields()}
    <label class="caption">
      <span>{t('pictures.caption')}</span>
      <input type="text" bind:value={caption} placeholder={t('pictures.captionHint')} />
    </label>
  {/snippet}
</ImagePicker>

<style>
  .note-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .bar {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
    padding: 4px;
    border-bottom: 1px solid var(--panel-border);
  }

  /* Quiet buttons, alike: a frame only under the pointer. */
  .bar > button,
  .bar :global(.more > .toggle) {
    min-width: 30px;
    padding: 2px 7px;
    color: var(--text);
    background: none;
    border: 1px solid transparent;
  }

  .bar > button:hover,
  .bar :global(.more > .toggle:hover),
  .bar :global(.more > .toggle[aria-expanded='true']) {
    background: var(--panel);
    border-color: var(--panel-border);
  }

  .gap {
    width: 1px;
    height: 18px;
    margin: 0 4px;
    background: var(--panel-border);
  }

  .mark {
    font-family: Georgia, serif;
    font-weight: 700;
  }

  .mark.italic {
    font-style: italic;
  }

  .mark.strike {
    text-decoration: line-through;
  }

  .bar .help {
    margin-left: auto;
    color: var(--text-muted);
  }

  /* The headings' menu: each drawn at its size, the cursor's line's marked. */
  .bar :global(.list button) {
    white-space: nowrap;
    display: flex;
    gap: 16px;
    justify-content: space-between;
    align-items: baseline;
    width: 100%;
  }

  .heading.h1 span:first-child {
    font-size: 1.4em;
    font-weight: 600;
  }

  .heading.h2 span:first-child {
    font-size: 1.2em;
    font-weight: 600;
  }

  .heading.h3 span:first-child {
    font-size: 1.05em;
    font-weight: 600;
  }

  .heading.current {
    color: var(--accent);
  }

  .editor {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .pictures {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 6px 4px;
    border-top: 1px solid var(--panel-border);
  }

  .thumb {
    width: 64px;
    height: 48px;
    padding: 0;
    overflow: hidden;
    border-radius: 4px;
  }

  .gone {
    color: var(--text-muted);
  }

  .caption {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
</style>

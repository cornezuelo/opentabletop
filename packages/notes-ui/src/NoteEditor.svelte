<script lang="ts">
  import {
    autocompletion,
    type CompletionContext,
    type CompletionResult,
  } from '@codemirror/autocomplete'
  import { indentWithTab } from '@codemirror/commands'
  import { markdown } from '@codemirror/lang-markdown'
  import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
  import { EditorState, Prec } from '@codemirror/state'
  import { EditorView, keymap, placeholder as placeholderText } from '@codemirror/view'
  import { tags } from '@lezer/highlight'
  import { basicSetup } from 'codemirror'
  import { onDestroy, onMount } from 'svelte'
  import type { NotePage } from '@open-tabletop/notes'
  import { registerInserter } from '@open-tabletop/ui-kit'
  import type { GameIndex } from './game'
  import { linkOptions, type SuggestTexts } from './suggest'

  /**
   * A page's Markdown being written (CodeMirror), suggesting links as `[[` is typed: pages,
   * their headings after `#`, and the games' things. Changes are handed on a moment after
   * typing stops, and on leaving the editor.
   */
  let {
    value,
    pages,
    index,
    campaign,
    texts,
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
    const closed = context.state.sliceDoc(context.pos, context.pos + 2) === ']]'
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
          const to = closed ? end + 2 : end
          view.dispatch({
            changes: { from: start, to, insert: `${o.insert}]]` },
            selection: { anchor: start + o.insert.length + 2 },
          })
        },
      })),
    }
  }

  let host: HTMLDivElement
  let view: EditorView | undefined
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
            if (!update.docChanged) return
            clearTimeout(timer)
            timer = setTimeout(flush, 400)
          }),
          EditorView.domEventHandlers({ blur: () => flush() }),
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

<div class="editor" bind:this={host}></div>

<style>
  .editor {
    min-height: 0;
    height: 100%;
    overflow: hidden;
  }
</style>

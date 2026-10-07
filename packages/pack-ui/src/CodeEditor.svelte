<script module lang="ts">
  export interface Problem {
    line: number
    message: string
    severity: 'error' | 'warning'
  }
</script>

<script lang="ts">
  import { indentWithTab } from '@codemirror/commands'
  import { yaml } from '@codemirror/lang-yaml'
  import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
  import { lintGutter, setDiagnostics, type Diagnostic } from '@codemirror/lint'
  import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete'
  import { EditorState } from '@codemirror/state'
  import { completeYaml, type YamlHints } from './completion'
  import { EditorView, keymap } from '@codemirror/view'
  import { tags } from '@lezer/highlight'
  import { basicSetup } from 'codemirror'
  import { onDestroy, onMount } from 'svelte'

  let {
    value,
    readonly = false,
    problems = [],
    line,
    hints,
    onchange,
  }: {
    value: string
    readonly?: boolean
    problems?: Problem[]
    /** Line to scroll to and select (1-based). */
    line?: number
    onchange?: (value: string) => void
    /** What to suggest while typing (references, condition names and values…). */
    hints?: YamlHints
  } = $props()

  /** Suggestions for the line being typed (Ctrl+Space shows them anywhere). */
  function complete(context: CompletionContext): CompletionResult | null {
    if (!hints) return null
    const line = context.state.doc.lineAt(context.pos)
    const found = completeYaml(line.text.slice(0, context.pos - line.from), hints)
    if (!found) return null
    // While typing, only once a word has started; Ctrl+Space shows them right away.
    if (!context.explicit && found.from === context.pos - line.from) return null
    return {
      from: line.from + found.from,
      options: found.options.map((label) => ({ label })),
      validFor: /^[\w./-]*$/,
    }
  }

  let host: HTMLDivElement
  let view: EditorView | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  /** Last text handed to onchange; the value prop lags behind while it's saved. */
  let emitted: string | undefined

  const highlight = HighlightStyle.define([
    { tag: [tags.propertyName, tags.definition(tags.propertyName)], color: '#c8a24a' },
    { tag: [tags.string, tags.special(tags.string)], color: '#b5cea8' },
    { tag: [tags.number, tags.bool, tags.null], color: '#d19a66' },
    { tag: tags.comment, color: '#7f7a6a', fontStyle: 'italic' },
    { tag: [tags.meta, tags.punctuation, tags.separator], color: '#9c9480' },
  ])

  const theme = EditorView.theme(
    {
      '&': { height: '100%', color: 'var(--text)', backgroundColor: 'var(--bg)' },
      '.cm-scroller': { fontFamily: 'ui-monospace, monospace', fontSize: '13px' },
      '.cm-gutters': {
        color: 'var(--text-muted)',
        backgroundColor: 'var(--panel)',
        borderRight: '1px solid var(--panel-border)',
      },
      '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'rgb(200 162 74 / 0.08)' },
      '.cm-cursor': { borderLeftColor: 'var(--accent)' },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
        backgroundColor: 'rgb(200 162 74 / 0.25)',
      },
      '.cm-tooltip': { backgroundColor: 'var(--panel)', border: '1px solid var(--accent)' },
      '.cm-tooltip-autocomplete ul li[aria-selected]': {
        color: 'var(--text)',
        backgroundColor: 'rgb(200 162 74 / 0.3)',
      },
    },
    { dark: true },
  )

  function flush() {
    if (timer === undefined || !view) return
    clearTimeout(timer)
    timer = undefined
    emitted = view.state.doc.toString()
    onchange?.(emitted)
  }

  function toDiagnostics(state: EditorState): Diagnostic[] {
    return problems
      .filter((p) => p.line >= 1 && p.line <= state.doc.lines)
      .map((p) => {
        const l = state.doc.line(p.line)
        return { from: l.from, to: l.to, severity: p.severity, message: p.message }
      })
  }

  onMount(() => {
    view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          keymap.of([indentWithTab]),
          yaml(),
          EditorState.languageData.of(() => [{ autocomplete: complete }]),
          syntaxHighlighting(highlight),
          lintGutter(),
          theme,
          EditorState.readOnly.of(readonly),
          EditorState.tabSize.of(2),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return
            clearTimeout(timer)
            timer = setTimeout(flush, 300)
          }),
          EditorView.domEventHandlers({ blur: () => flush() }),
        ],
      }),
    })
    view.dispatch(setDiagnostics(view.state, toDiagnostics(view.state)))
  })

  onDestroy(() => {
    flush()
    view?.destroy()
  })

  // Outside edits (forms, other tabs) replace the text unless they're our own pending save.
  $effect(() => {
    const next = value
    if (!view || next === emitted || next === view.state.doc.toString() || timer !== undefined)
      return
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } })
  })

  $effect(() => {
    void problems
    if (view) view.dispatch(setDiagnostics(view.state, toDiagnostics(view.state)))
  })

  $effect(() => {
    if (!view || !line || line > view.state.doc.lines) return
    const l = view.state.doc.line(line)
    view.dispatch({ selection: { anchor: l.from, head: l.to }, scrollIntoView: true })
    view.focus()
  })
</script>

<div class="editor" bind:this={host}></div>

<style>
  .editor {
    min-height: 0;
    height: 100%;
    overflow: hidden;
    border: 1px solid var(--panel-border);
    border-radius: 4px;
  }
</style>

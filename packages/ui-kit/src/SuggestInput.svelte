<script lang="ts">
  import { applyChoice, choicesFor, typingAt, typingInList, type Suggestions } from './suggest'

  /**
   * A one-line box for `key: value` pairs (conditions, values, context) that suggests the
   * key or value being typed. Arrows pick, Enter or Tab take it, Escape closes the list.
   * `onchange` fires when the text is committed (Enter without a list open, or leaving).
   */
  let {
    value = '',
    suggestions,
    placeholder = '',
    disabled = false,
    invalid = false,
    label,
    list,
    onchange,
  }: {
    value?: string
    /** `key: value` pairs and their values; or, with `list`, unused. */
    suggestions?: Suggestions
    /** A comma-separated list instead (lake, sea): these are its choices. */
    list?: readonly string[]
    placeholder?: string
    disabled?: boolean
    invalid?: boolean
    label?: string
    onchange: (text: string) => void
  } = $props()

  let input: HTMLInputElement
  let text = $state('')
  let choices = $state<string[]>([])
  let active = $state(0)
  let focused = $state(false)
  const listId = $props.id()

  // The box follows the value it is given while it isn't being edited.
  $effect(() => {
    if (!focused) text = value
  })

  const hints = $derived(list ? { '': list } : (suggestions ?? {}))
  const typing = () => (list ? typingInList : typingAt)(text, input.selectionStart ?? text.length)

  function refresh() {
    choices = choicesFor(typing(), hints)
    active = 0
  }

  function take(choice: string) {
    const next = applyChoice(text, typing(), choice)
    text = next.text
    input.value = next.text
    input.setSelectionRange(next.cursor, next.cursor)
    refresh()
  }

  function commit() {
    choices = []
    if (text !== value) onchange(text)
  }

  function onkeydown(e: KeyboardEvent) {
    const open = choices.length > 0
    if (open && e.key === 'ArrowDown') active = (active + 1) % choices.length
    else if (open && e.key === 'ArrowUp') active = (active - 1 + choices.length) % choices.length
    else if (open && (e.key === 'Enter' || e.key === 'Tab')) take(choices[active])
    else if (open && e.key === 'Escape') choices = []
    else if (e.key === 'Enter') return commit()
    else return
    e.preventDefault()
  }
</script>

<div class="suggest">
  <input
    bind:this={input}
    type="text"
    value={text}
    {placeholder}
    {disabled}
    aria-label={label}
    aria-invalid={invalid || undefined}
    aria-autocomplete="list"
    aria-controls={listId}
    aria-expanded={choices.length > 0}
    role="combobox"
    oninput={(e) => {
      text = e.currentTarget.value
      refresh()
    }}
    onfocus={() => {
      focused = true
      refresh()
    }}
    onclick={refresh}
    onblur={() => {
      focused = false
      commit()
    }}
    {onkeydown}
  />
  {#if choices.length && focused}
    <ul id={listId} role="listbox">
      {#each choices as choice, i (choice)}
        <li role="option" aria-selected={i === active}>
          <!-- mousedown, not click: the box keeps its focus. -->
          <button
            type="button"
            tabindex="-1"
            class:active={i === active}
            onmousedown={(e) => {
              e.preventDefault()
              take(choice)
            }}>{choice}</button
          >
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .suggest {
    position: relative;
  }

  input {
    width: 100%;
  }

  input[aria-invalid] {
    border-color: #c0605a;
  }

  ul {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 20;
    min-width: 100%;
    max-height: 220px;
    margin: 2px 0 0;
    padding: 3px;
    overflow-y: auto;
    list-style: none;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    box-shadow: 0 6px 18px rgb(0 0 0 / 0.4);
  }

  button {
    display: block;
    width: 100%;
    padding: 3px 8px;
    font: inherit;
    font-size: 13px;
    color: var(--text);
    text-align: left;
    white-space: nowrap;
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  button.active,
  button:hover {
    background: rgb(200 162 74 / 0.18);
  }
</style>

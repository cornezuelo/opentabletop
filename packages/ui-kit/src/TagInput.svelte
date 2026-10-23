<script lang="ts">
  import { addTags, tagChoices, type TagSeparator } from './tags'

  /**
   * A list of words as pills, each with its × to take it out. Typing adds one (Enter or the
   * separator, a comma or a space; leaving the box adds what was typed), Backspace in an empty box takes the last
   * one. Suggestions come grouped by the part of the name before its first dot; arrows
   * pick, Enter or Tab take one, Escape closes the list. Where order decides something
   * (`reorder`), a pill is dragged onto another to move it there.
   */
  let {
    value = [],
    choices = [],
    placeholder = '',
    disabled = false,
    label,
    removeLabel,
    separator = 'comma',
    reorder = false,
    onchange,
  }: {
    value?: readonly string[]
    /** Words to suggest (those already in the list aren't). */
    choices?: readonly string[]
    /** Shown while the list is empty. */
    placeholder?: string
    disabled?: boolean
    label: string
    /** The × button's name, with `{name}` for the word: "Remove {name}". */
    removeLabel: string
    /** What ends a word as it's typed: a comma, or a space for words with commas (`15,9`). */
    separator?: TagSeparator
    /** Pills dragged onto another move there (the first may be a default). */
    reorder?: boolean
    onchange: (items: string[]) => void
  } = $props()

  /** The pill being dragged, and the one it's over. */
  let dragged = $state<number | null>(null)
  let over = $state<number | null>(null)
  function drop(to: number) {
    const from = dragged
    dragged = over = null
    if (from === null || from === to) return
    const next = [...value]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onchange(next)
  }

  let input: HTMLInputElement
  let text = $state('')
  let focused = $state(false)
  let active = $state(0)
  const listId = $props.id()

  const groups = $derived(focused ? tagChoices(choices, text, value) : [])
  const flat = $derived(groups.flatMap((g) => g.items))

  function add(typed: string) {
    text = ''
    active = 0
    const next = addTags(value, typed, separator)
    if (next.length !== value.length) onchange(next)
  }

  function remove(i: number) {
    onchange(value.filter((_, j) => j !== i))
  }

  function onkeydown(e: KeyboardEvent) {
    const open = flat.length > 0
    if (open && e.key === 'ArrowDown') active = (active + 1) % flat.length
    else if (open && e.key === 'ArrowUp') active = (active - 1 + flat.length) % flat.length
    else if (open && e.key === 'Tab' && text) add(flat[active])
    else if (e.key === 'Enter') add(open ? flat[active] : text)
    else if (e.key === (separator === 'comma' ? ',' : ' ')) add(text)
    else if (e.key === 'Escape') input.blur()
    else if (e.key === 'Backspace' && text === '' && value.length) return remove(value.length - 1)
    else return
    e.preventDefault()
  }
</script>

<div class="tags" class:disabled>
  <!-- A click on the frame (not on a pill) types in the box. -->
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="frame" class:focused onclick={() => input?.focus()}>
    {#each value as item, i (item)}
      <span
        class="pill"
        class:grab={reorder && !disabled}
        class:over={over === i && dragged !== i}
        role="listitem"
        draggable={reorder && !disabled}
        ondragstart={(e) => {
          dragged = i
          if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
        }}
        ondragover={(e) => {
          if (dragged === null) return
          e.preventDefault()
          over = i
        }}
        ondragleave={() => (over = null)}
        ondrop={(e) => {
          e.preventDefault()
          drop(i)
        }}
        ondragend={() => (dragged = over = null)}
      >
        {item}
        {#if !disabled}
          <button
            type="button"
            tabindex="-1"
            aria-label={removeLabel.replace('{name}', item)}
            onclick={(e) => {
              e.stopPropagation()
              remove(i)
            }}>×</button
          >
        {/if}
      </span>
    {/each}
    <input
      bind:this={input}
      type="text"
      value={text}
      placeholder={value.length ? '' : placeholder}
      {disabled}
      aria-label={label}
      aria-autocomplete="list"
      aria-controls={listId}
      aria-expanded={flat.length > 0}
      role="combobox"
      oninput={(e) => {
        text = e.currentTarget.value
        active = 0
      }}
      onfocus={() => (focused = true)}
      onblur={() => {
        focused = false
        if (text.trim()) add(text)
      }}
      {onkeydown}
    />
  </div>
  {#if flat.length}
    <ul id={listId} role="listbox">
      {#each groups as g (g.group)}
        {#if groups.length > 1}<li class="group" role="presentation">{g.group || '…'}</li>{/if}
        {#each g.items as choice (choice)}
          <li role="option" aria-selected={flat[active] === choice}>
            <!-- mousedown, not click: the box keeps its focus. -->
            <button
              type="button"
              tabindex="-1"
              class:active={flat[active] === choice}
              onmousedown={(e) => {
                e.preventDefault()
                add(choice)
              }}>{choice}</button
            >
          </li>
        {/each}
      {/each}
    </ul>
  {/if}
</div>

<style>
  .tags {
    position: relative;
    min-width: 0;
  }

  .frame {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
    min-height: 30px;
    padding: 3px 4px;
    cursor: text;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
  }

  .frame.focused {
    border-color: var(--accent);
  }

  .disabled .frame {
    cursor: default;
    opacity: 0.7;
  }

  .pill.grab {
    cursor: grab;
  }

  .pill.over {
    box-shadow: -2px 0 0 var(--accent);
  }

  .pill {
    display: inline-flex;
    gap: 2px;
    align-items: center;
    max-width: 100%;
    padding: 1px 3px 1px 8px;
    overflow-wrap: anywhere;
    font-family: ui-monospace, monospace;
    font-size: 12px;
    line-height: 1.5;
    background: rgb(200 162 74 / 0.16);
    border: 1px solid rgb(200 162 74 / 0.35);
    border-radius: 999px;
  }

  .disabled .pill {
    padding-right: 8px;
  }

  .pill button {
    padding: 0 4px;
    font: inherit;
    color: var(--text-muted);
    background: none;
    border: none;
    border-radius: 999px;
    cursor: pointer;
  }

  .pill button:hover {
    color: var(--text);
    background: rgb(200 162 74 / 0.3);
  }

  input {
    flex: 1 1 6em;
    min-width: 6em;
    padding: 2px 4px;
    background: none;
    border: none;
    outline: none;
  }

  ul {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 20;
    min-width: 100%;
    max-height: 260px;
    margin: 2px 0 0;
    padding: 3px;
    overflow-y: auto;
    list-style: none;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    box-shadow: 0 6px 18px rgb(0 0 0 / 0.4);
  }

  .group {
    padding: 4px 8px 1px;
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  li button {
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

  li button.active,
  li button:hover {
    background: rgb(200 162 74 / 0.18);
  }
</style>

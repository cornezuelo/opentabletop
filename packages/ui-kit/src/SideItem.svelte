<script lang="ts">
  import type { Snippet } from 'svelte'
  import { fullText } from './tooltip'

  /**
   * One row of a sidebar list: a name (cut short, in full on hover), a line under it if
   * given (`detail`), and what comes after it (tags, counts).
   */
  let {
    name,
    detail,
    selected = false,
    untitled = false,
    onclick,
    children,
  }: {
    name: string
    /** A short line under the name (a campaign's system and date). */
    detail?: string
    selected?: boolean
    /** The name is a stand-in for an empty one: shown in italics. */
    untitled?: boolean
    onclick: () => void
    children?: Snippet
  } = $props()
</script>

<li>
  <button class:selected {onclick}>
    {#if detail}
      <span class="two">
        <span class="name" class:untitled use:fullText>{name}</span>
        <small use:fullText>{detail}</small>
      </span>
    {:else}
      <span class="name" class:untitled use:fullText>{name}</span>
    {/if}
    {@render children?.()}
  </button>
</li>

<style>
  li {
    list-style: none;
  }

  button {
    display: flex;
    gap: 6px;
    align-items: center;
    width: 100%;
    padding: 5px 6px;
    text-align: left;
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  button:hover,
  button.selected {
    background: rgb(200 162 74 / 0.12);
  }

  .name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .two {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  small {
    overflow: hidden;
    font-size: 11px;
    color: var(--text-muted);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .untitled {
    font-style: italic;
    color: var(--text-muted);
  }
</style>

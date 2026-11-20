<script lang="ts">
  import type { Snippet } from 'svelte'
  import { fullText } from './tooltip'

  /**
   * One row of a sidebar list: a name (cut short, in full on hover), a line under it if
   * given (`detail`), and what comes after it (tags, counts), or under it with `below`, so
   * a narrow list never cuts the name for them; what goes before it (`lead`: a face) too.
   */
  let {
    name,
    detail,
    selected = false,
    untitled = false,
    below = false,
    onclick,
    lead,
    children,
  }: {
    name: string
    /** A short line under the name (a campaign's system and date). */
    detail?: string
    selected?: boolean
    /** The name is a stand-in for an empty one: shown in italics. */
    untitled?: boolean
    /** What comes after the name goes under it instead (its tags on a line of their own). */
    below?: boolean
    onclick: () => void
    /** What comes before the name (a character's face). */
    lead?: Snippet
    children?: Snippet
  } = $props()
</script>

<li>
  <button class:selected {onclick}>
    {@render lead?.()}
    {#if below}
      <span class="two">
        <span class="name" class:untitled use:fullText>{name}</span>
        {#if detail}<small use:fullText>{detail}</small>{/if}
        {#if children}<span class="under">{@render children()}</span>{/if}
      </span>
    {:else if detail}
      <span class="two">
        <span class="name" class:untitled use:fullText>{name}</span>
        <small use:fullText>{detail}</small>
      </span>
    {:else}
      <span class="name" class:untitled use:fullText>{name}</span>
    {/if}
    {#if !below}{@render children?.()}{/if}
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
    background: color-mix(in srgb, var(--accent) 12%, transparent);
  }

  .name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .under {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 2px;
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

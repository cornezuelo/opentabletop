<script lang="ts">
  import { initialsOf } from './texts'

  /**
   * Someone's face where there's little room (a fight's card, a token in an order): their
   * token's icon in a disc when they have one (`icon`, a bundled icon's id: a template's
   * `token.icon`), else their initial, a copy's number kept (`Bandit 2` → `B2`). Its colour is
   * the host's (`--face`, the accent when unsaid) and its size its font's (`font-size`). Drawn,
   * not said: whatever holds it names who it is.
   */
  let { name, icon }: { name: string; icon?: string } = $props()

  /** The icon's SVG, once the bundled icons are loaded (on the first face that has one). */
  let svg = $state('')
  $effect(() => {
    const id = icon
    if (!id) return void (svg = '')
    let live = true
    void import('@open-tabletop/ui-kit/icons').then(({ getBuiltinIcon, builtinSvg }) => {
      const found = getBuiltinIcon(id)
      if (live) svg = found ? builtinSvg(found) : ''
    })
    return () => (live = false)
  })
  /** A copy's number, kept beside its icon so two of a kind are told apart. */
  const number = $derived(/\s(\d+)$/.exec(name)?.[1] ?? '')
</script>

<span class="face" class:drawn={!!svg} aria-hidden="true">
  {#if svg}
    <!-- Bundled content only: safe to inline. -->
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html svg}
    {#if number}<span class="number">{number}</span>{/if}
  {:else}
    {initialsOf(name)}
  {/if}
</span>

<style>
  .face {
    position: relative;
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 2.2em;
    height: 2.2em;
    font-size: inherit;
    font-weight: 700;
    line-height: 1;
    color: var(--face, var(--accent));
    letter-spacing: -0.02em;
    background: color-mix(in srgb, var(--face, var(--accent)) 16%, var(--panel));
    border: 1px solid color-mix(in srgb, var(--face, var(--accent)) 60%, transparent);
    border-radius: 50%;
  }

  .face.drawn :global(svg) {
    width: 64%;
    height: 64%;
  }

  /* A copy's number on the disc's edge. */
  .number {
    position: absolute;
    right: -0.35em;
    bottom: -0.25em;
    min-width: 1.3em;
    padding: 0.1em 0.2em;
    font-size: 0.6em;
    text-align: center;
    color: var(--face, var(--accent));
    background: var(--panel);
    border: 1px solid color-mix(in srgb, var(--face, var(--accent)) 60%, transparent);
    border-radius: 0.7em;
  }
</style>

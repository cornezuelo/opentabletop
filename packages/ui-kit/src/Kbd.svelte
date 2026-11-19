<script lang="ts">
  import { keyCaps } from './shortcuts'

  /**
   * The ways of pressing a shortcut, each drawn as keys' caps (`Ctrl` + `Z`); what the mouse
   * does (click, drag) as a word beside them. `stacked`: one way under another (in a list),
   * else side by side with a slash.
   */
  let {
    keys,
    locale,
    stacked = false,
  }: { keys: string[]; locale: string; stacked?: boolean } = $props()
</script>

<span class="kbd" class:stacked>
  {#each keys as combo, i (combo)}
    {#if i > 0 && !stacked}<span class="or">/</span>{/if}
    <span class="combo">
      {#each keyCaps(combo, locale) as cap, j (j)}
        {#if j > 0}<span class="plus">+</span>{/if}
        {#if cap.mouse}<span class="mouse">{cap.label}</span>{:else}<kbd>{cap.label}</kbd>{/if}
      {/each}
    </span>
  {/each}
</span>

<style>
  .kbd {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
  }

  .kbd.stacked {
    flex-direction: column;
    align-items: flex-start;
  }

  .combo {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    white-space: nowrap;
  }

  .or,
  .plus,
  .mouse {
    font-size: 0.85em;
    color: var(--text-muted);
  }
</style>

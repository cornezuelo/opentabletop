<script lang="ts">
  import type { Snippet } from 'svelte'

  /** A list of `RowCard`s, one under the other. */
  let { children }: { children: Snippet } = $props()
</script>

<ul class="row-cards">{@render children()}</ul>

<style>
  .row-cards {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
</style>

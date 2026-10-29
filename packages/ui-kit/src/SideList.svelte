<script lang="ts">
  import type { Snippet } from 'svelte'

  /** The list of a sidebar's `SideItem`s. */
  let { children }: { children: Snippet } = $props()
</script>

<ul>{@render children()}</ul>

<style>
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
</style>

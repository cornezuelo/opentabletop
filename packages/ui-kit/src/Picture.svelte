<script lang="ts">
  import type { Snippet } from 'svelte'
  import { cachedImage, onPictureChange } from './imageCache'

  /**
   * A picture of the image library, by id, filling its box (`object-fit: cover`); while it loads,
   * or when there's none by that id, what's given instead (`children`). Read again when it
   * changes, here or in another app.
   */
  let { id, alt = '', children }: { id?: string; alt?: string; children?: Snippet } = $props()

  let src = $state<string>()
  let version = $state(0)
  $effect(() => {
    const wanted = id
    void version
    if (!wanted) return void (src = undefined)
    let live = true
    void cachedImage(wanted).then((image) => {
      if (live) src = image?.data
    })
    return () => (live = false)
  })
  $effect(() => onPictureChange((changed) => changed === id && version++))
</script>

{#if src}
  <img class="picture" {src} {alt} draggable="false" />
{:else}
  {@render children?.()}
{/if}

<style>
  .picture {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
</style>

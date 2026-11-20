<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { LibraryImage } from '@open-tabletop/storage'
  import { cachedImage, onPictureChange } from './imageCache'
  import { faceBox, faceOf } from './imageFrame'

  /**
   * A picture of the image library, by id, filling its box (`object-fit: cover`), or, with
   * `face`, showing its face (a square box: docs/character-pictures.md §10); while it loads, or
   * when there's none by that id, what's given instead (`children`). Read again when it
   * changes, here or in another app.
   */
  let {
    id,
    alt = '',
    face = false,
    whole = false,
    children,
  }: {
    id?: string
    alt?: string
    face?: boolean
    /** Shown whole, in its own proportions, no larger than its box (not covering it). */
    whole?: boolean
    children?: Snippet
  } = $props()

  let image = $state<LibraryImage | null>()
  let version = $state(0)
  $effect(() => {
    const wanted = id
    void version
    if (!wanted) return void (image = undefined)
    let live = true
    void cachedImage(wanted).then((read) => {
      if (live) image = read
    })
    return () => (live = false)
  })
  $effect(() => onPictureChange((changed) => changed === id && version++))
  const box = $derived(image && face && image.width ? faceBox(image, faceOf(image)) : undefined)
</script>

{#if image && box}
  <span class="face"
    ><img
      src={image.data}
      {alt}
      draggable="false"
      style:width="{box.width}%"
      style:left="{box.left}%"
      style:top="{box.top}%"
    /></span
  >
{:else if image}
  <img class="picture" class:whole src={image.data} {alt} draggable="false" />
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

  .picture.whole {
    width: auto;
    max-width: 100%;
    height: auto;
    max-height: inherit;
    object-fit: contain;
  }

  .face {
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .face img {
    position: absolute;
    max-width: none;
    height: auto;
  }
</style>

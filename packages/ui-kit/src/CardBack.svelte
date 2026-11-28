<script lang="ts">
  import { packImageUrl } from './packImages'

  /**
   * A card's back (docs/cards.md): the deck's own picture (`<pack>/<path>`), or the table's,
   * a lattice in the theme's colours. `width` in px, its height a card's.
   */
  let { width, back }: { width: number; back?: string } = $props()
  const url = $derived(packImageUrl(back))
</script>

<span class="back" class:picture={url} style:--w="{width}px">
  {#if url}<img src={url} alt="" draggable="false" />{/if}
</span>

<style>
  .back {
    position: relative;
    display: block;
    width: var(--w);
    height: calc(var(--w) * 1.6);
    overflow: hidden;
    background:
      repeating-linear-gradient(45deg, transparent 0 6px, rgb(200 162 74 / 22%) 6px 7px),
      repeating-linear-gradient(-45deg, transparent 0 6px, rgb(200 162 74 / 22%) 6px 7px),
      linear-gradient(var(--card-back), var(--card-back-deep));
    border: 1px solid var(--card-back-edge);
    border-radius: calc(var(--w) * 0.07);
    box-shadow: 0 3px 10px rgb(0 0 0 / 45%);
  }

  .back:not(.picture)::after {
    position: absolute;
    inset: 7%;
    content: '';
    border: 1px solid rgb(200 162 74 / 55%);
    border-radius: calc(var(--w) * 0.04);
  }

  .back img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
</style>

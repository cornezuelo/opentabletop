<script lang="ts">
  import { tooltip } from '@open-tabletop/ui-kit'

  /**
   * A pack's image, small, on a light ground so dark lines show (a style's art, a texture, a
   * pack's files); `src` undefined shows a `?` with `missing` as its tooltip.
   */
  let {
    src,
    alt = '',
    size = '2.4rem',
    missing = '',
  }: { src: string | undefined; alt?: string; size?: string; missing?: string } = $props()
</script>

{#if src}
  <img class="thumb" {src} {alt} style:width={size} style:height={size} />
{:else}
  <span class="thumb missing" style:width={size} style:height={size} use:tooltip={missing}>?</span>
{/if}

<style>
  .thumb {
    object-fit: contain;
    background: #ece5d3;
    border-radius: 4px;
    flex: none;
  }
  .missing {
    display: inline-grid;
    place-items: center;
    color: var(--danger);
    background: var(--canvas-bg);
  }
</style>

<script lang="ts">
  import type { HexMap } from '@open-tabletop/map'
  import { drawLand } from '../lib/landMap'

  /**
   * A map at a glance, read only: its hexes in their terrain's colour, and the land each
   * faction holds on it in the faction's colour.
   */
  let { map, color, label }: { map: HexMap; color: (faction: string) => string; label: string } =
    $props()

  const drawn = $derived(drawLand(map))
</script>

<svg class="land-map" viewBox={drawn.box} role="img" aria-label={label}>
  {#each drawn.fills as { fill, d } (fill)}
    <path {d} class:empty={!fill} style:fill={fill || null} />
  {/each}
  {#each drawn.land as { faction, d } (faction)}
    <path {d} class="land" style:fill={color(faction)} style:stroke={color(faction)} />
  {/each}
</svg>

<style>
  .land-map {
    display: block;
    width: 100%;
    max-height: 360px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
  }

  path {
    stroke: rgb(0 0 0 / 0.15);
    stroke-width: 0.5;
    opacity: 0.55;
  }

  path.empty {
    fill: var(--panel-border);
    opacity: 0.25;
  }

  path.land {
    stroke-width: 1.2;
    fill-opacity: 0.7;
    opacity: 1;
  }
</style>

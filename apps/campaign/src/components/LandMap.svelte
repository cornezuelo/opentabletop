<script lang="ts">
  import type { HexMap } from '@open-tabletop/map'
  import { drawLand } from '../lib/landMap'

  /**
   * A map at a glance, read only: its hexes in their terrain's colour, and the land each
   * faction holds on it as on Map: diagonal stripes in the faction's colour and a
   * dashed frontier, so the terrain still shows beneath.
   */
  let { map, color, label }: { map: HexMap; color: (faction: string) => string; label: string } =
    $props()

  const drawn = $derived(drawLand(map))
</script>

<svg class="land-map" viewBox={drawn.box} role="img" aria-label={label}>
  {#each drawn.fills as { fill, d } (fill)}
    <path {d} class:empty={!fill} style:fill={fill || null} />
  {/each}
  {#each drawn.land as { faction, hatch, frontier } (faction)}
    <path d={hatch} class="hatch" style:stroke={color(faction)} />
    <path d={frontier} class="frontier" style:stroke={color(faction)} />
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
    opacity: 0.8;
  }

  path.empty {
    fill: var(--panel-border);
    opacity: 0.25;
  }

  /* Bolder than on Map (in a hex's radius of 10), so they read on a small map. */
  path.hatch {
    fill: none;
    stroke-width: 1.2;
    stroke-opacity: 0.75;
    opacity: 1;
  }

  path.frontier {
    fill: none;
    stroke-width: 1.6;
    stroke-dasharray: 3 2;
    opacity: 1;
  }
</style>

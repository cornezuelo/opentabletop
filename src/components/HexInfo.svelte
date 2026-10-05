<script lang="ts">
  import { formatCoord, parseKey } from '../lib/hex/grid'
  import { t } from '../lib/i18n/index.svelte'
  import { editor } from '../lib/store/editor.svelte'
  import { terrainName } from '../lib/terrainName'

  const info = $derived.by(() => {
    void editor.revision
    if (!editor.selected) return null
    const cell = parseKey(editor.selected)
    const terrainId = editor.map.hexes[editor.selected]?.terrain
    const terrain = editor.terrains.find((tt) => tt.id === terrainId)
    return {
      coord: formatCoord(cell, editor.grid.coordFormat, editor.grid),
      terrain: terrain ? terrainName(terrain) : null,
      color: terrain?.color,
    }
  })
</script>

{#if info}
  <dl>
    <dt>{t('hex.coord')}</dt>
    <dd class="coord">{info.coord}</dd>
    <dt>{t('hex.terrain')}</dt>
    <dd>
      {#if info.terrain}
        <span class="swatch" style:background={info.color}></span>{info.terrain}
      {:else}
        <span class="muted">{t('hex.none')}</span>
      {/if}
    </dd>
  </dl>
{:else}
  <p class="muted">{t('panel.noSelection')}</p>
{/if}

<style>
  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 6px 12px;
    margin: 0;
  }

  dt {
    color: var(--text-muted);
  }

  dd {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
  }

  .coord {
    font-family: ui-monospace, monospace;
  }

  .swatch {
    width: 12px;
    height: 12px;
    border-radius: 2px;
  }

  .muted,
  p {
    margin: 0;
    color: var(--text-muted);
  }
</style>

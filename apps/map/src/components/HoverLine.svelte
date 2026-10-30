<script lang="ts">
  import { factionName } from '@open-tabletop/session'
  import { getLocale, t } from '../lib/i18n/index.svelte'
  import { getSystem } from '../lib/play/systems'
  import { editor } from '../lib/store/editor.svelte'

  /** Under the map: what holds the hex under the pointer, its region and its faction. */
  const line = $derived.by(() => {
    const key = editor.hoveredHex
    if (!key) return ''
    const regionId = editor.map.hexes[key]?.region
    const region = regionId && editor.regions.find((r) => r.id === regionId)?.name
    const own = editor.factions
    const holder =
      own && Object.keys(own.territories).find((id) => own.territories[id].includes(key))
    const system = own && getSystem(own.system).factions
    const faction = holder && (system ? factionName(system, holder, getLocale()) : holder)
    return [
      region && t('hover.region', { name: region }),
      faction && t('hover.faction', { name: faction }),
    ]
      .filter(Boolean)
      .join(' · ')
  })
</script>

{#if line}<div class="hover-line" aria-live="off">{line}</div>{/if}

<style>
  .hover-line {
    position: absolute;
    left: 50%;
    bottom: 8px;
    z-index: 1;
    max-width: calc(100% - 80px);
    padding: 3px 10px;
    overflow: hidden;
    font-size: 12px;
    color: var(--text);
    white-space: nowrap;
    text-overflow: ellipsis;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    transform: translateX(-50%);
    pointer-events: none;
  }
</style>

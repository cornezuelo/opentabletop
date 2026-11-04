<script lang="ts">
  import { regionChain } from '@open-tabletop/map'
  import { factionName } from '@open-tabletop/session'
  import { getLocale, t } from '../lib/i18n/index.svelte'
  import { getSystem } from '../lib/play/systems'
  import { editor } from '../lib/store/editor.svelte'

  /**
   * Under the map: what holds the cell under the pointer, its region and its faction, and
   * where its ways lead (down into a sub-map, up out to the map above).
   */
  const line = $derived.by(() => {
    const key = editor.hoveredHex
    if (!key) return ''
    // Its regions from the outermost in: The Greywood › The Heart of the Greywood.
    const region = regionChain(editor.regions, editor.map.hexes[key]?.region)
      .map((r) => r.name || '—')
      .reverse()
      .join(' › ')
    const own = editor.factions
    const holder =
      own && Object.keys(own.territories).find((id) => own.territories[id].includes(key))
    const system = own && getSystem(own.system).factions
    const faction = holder && (system ? factionName(system, holder, getLocale()) : holder)
    const untitled = t('map.untitled')
    const into = (editor.linked.children ?? [])
      .filter((c) => c.meta.parent?.ways?.some((w) => w.place === key))
      .map((c) => t('hover.into', { name: c.meta.name || untitled }))
    const parent = editor.linked.parent
    const out =
      parent && editor.map.meta.parent?.ways?.some((w) => w.entrance === key)
        ? t('hover.out', { name: parent.meta.name || untitled })
        : ''
    return [
      region && t('hover.region', { name: region }),
      faction && t('hover.faction', { name: faction }),
      ...into,
      out,
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

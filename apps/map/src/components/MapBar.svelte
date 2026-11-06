<script lang="ts">
  import { formatCoord, parseKey } from '@open-tabletop/hex'
  import { regionChain } from '@open-tabletop/map'
  import { factionName } from '@open-tabletop/session'
  import { getLocale, t } from '../lib/i18n/index.svelte'
  import { getSystem } from '../lib/play/systems'
  import { editor } from '../lib/store/editor.svelte'
  import { view } from '../lib/store/view'
  import { tooltip } from '@open-tabletop/ui-kit'
  import LineIcon from './LineIcon.svelte'

  /** How much a click on − or + zooms. */
  const STEP = 1.25

  /**
   * Under the map: the cell under the pointer (its coordinate, what holds it, its region and
   * its faction, where its ways lead: down into a sub-map, up out to the map above), and the
   * zoom, 100% being the whole map in view.
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
      formatCoord(parseKey(key), editor.grid.coordFormat, editor.grid),
      region && t('hover.region', { name: region }),
      faction && t('hover.faction', { name: faction }),
      ...into,
      out,
    ]
      .filter(Boolean)
      .join(' · ')
  })
</script>

<div class="map-bar">
  {#if line}<div class="hover-line" aria-live="off">{line}</div>{/if}
  <div class="zoom" role="group" aria-label={t('zoom.label')}>
    <button
      use:tooltip={t('zoom.out')}
      aria-label={t('zoom.out')}
      onclick={() => view.zoomBy(1 / STEP)}><LineIcon name="minus" /></button
    >
    <output>{Math.round(editor.zoom * 100)}%</output>
    <button use:tooltip={t('zoom.in')} aria-label={t('zoom.in')} onclick={() => view.zoomBy(STEP)}
      ><LineIcon name="new" /></button
    >
    <button use:tooltip={t('actions.fit')} aria-label={t('actions.fit')} onclick={() => view.fit()}
      ><LineIcon name="fit" /></button
    >
  </div>
</div>

<style>
  .map-bar {
    position: absolute;
    right: calc(28px + var(--map-covered, 0px));
    bottom: 8px;
    left: 28px;
    z-index: 1;
    display: flex;
    gap: 8px;
    align-items: end;
    justify-content: end;
    pointer-events: none;
  }

  .zoom {
    display: flex;
    flex: none;
    align-items: center;
    font-size: 12px;
    color: var(--text-muted);
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    pointer-events: auto;
  }

  output {
    min-width: 3.2em;
    text-align: center;
  }

  button {
    width: 26px;
    height: 26px;
    padding: 0;
    font-size: 13px;
    color: inherit;
    background: none;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }

  button:hover {
    color: var(--accent);
  }

  .hover-line {
    flex: 0 1 auto;
    min-width: 0;
    margin-right: auto;
    padding: 3px 10px;
    overflow: hidden;
    font-size: 12px;
    color: var(--text);
    white-space: nowrap;
    text-overflow: ellipsis;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
  }
</style>

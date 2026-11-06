<script lang="ts">
  import type { HexKey } from '@open-tabletop/map'
  import { InfoTip, showToast } from '@open-tabletop/ui-kit'
  import { t } from '../../lib/i18n/index.svelte'
  import { addWayInto, newSubMap, openMapAt, waysAt, type WayHere } from '../../lib/io/submaps'
  import { partyAt, sessionOf, step } from '../../lib/play/play'
  import { connectionName, mapSystem } from '../../lib/play/systems'
  import { editor } from '../../lib/store/editor.svelte'
  import WayArrow from './WayArrow.svelte'

  /**
   * The ways a cell leads into other maps: into the sub-maps under it and out of this
   * sub-map (Open; Go in or out while the party is there on a trip), and, while editing,
   * New sub-map and another way into a sub-map of this map. In Play, only the ways.
   */
  let {
    key,
    name = '',
    editing = true,
  }: { key: HexKey; name?: string; editing?: boolean } = $props()

  const ways = $derived((void editor.linked, waysAt(key)))
  /** This map's sub-maps without a way from this cell: another way into one (a tunnel's mouth). */
  const others = $derived(
    (editor.linked.children ?? []).filter((c) => !ways.some((w) => w.map === c.meta.id)),
  )
  let another = $state('')
  /** The party is here on a trip (in the room the cell is in, too): it can head through the way. */
  const here = $derived.by(() => {
    void editor.revision
    const play = editor.play
    return !!play && play.mode === 'rules' && !!sessionOf(play) && partyAt(key)
  })

  /** The way's other end becomes the destination: the trip's march takes it. */
  function head(way: WayHere) {
    step({ type: 'setDestination', place: way.there })
    showToast(t('submap.headed'), 'info', 6000)
  }

  async function create() {
    const kinds = Object.keys(mapSystem().rules.connections ?? {})
    const made = await newSubMap(
      key,
      name || t('submap.defaultName'),
      kinds.includes('way-in') ? 'way-in' : undefined,
    )
    showToast(t('submap.created', { name: made.meta.name }))
  }

  async function addWay() {
    const child = others.find((c) => c.meta.id === another)
    if (!child) return
    await addWayInto(child.meta.id, key)
    another = ''
    showToast(t('submap.wayAdded', { name: child.meta.name || t('map.untitled') }))
  }
</script>

{#if editing || ways.length}
  <div class="submaps">
    <span class="title">{t('submap.title')}<InfoTip text={t('submap.help')} /></span>
    {#each ways as way (way.dir + way.there)}
      <div class="way">
        <span class="name"
          ><WayArrow dir={way.dir} />
          {way.dir === 'in'
            ? way.name || t('map.untitled')
            : t('submap.wayOut', { name: way.name || t('map.untitled') })}
          <small
            >{[
              way.cell && t('submap.arrives', { cell: way.cell }),
              way.kind && connectionName(way.kind),
            ]
              .filter(Boolean)
              .join(' · ')}</small
          ></span
        >
        <button onclick={() => openMapAt(way.map, way.at)}>{t('submap.open')}</button>
        {#if here}
          <button class="primary" onclick={() => head(way)}
            >{way.dir === 'in' ? t('submap.goIn') : t('submap.goOut')}</button
          >
        {/if}
      </div>
    {/each}
    {#if editing}
      <button class="new" onclick={create}>{t('submap.new')}</button>
      {#if others.length}
        <div class="way">
          <select bind:value={another} aria-label={t('submap.anotherWay')}>
            <option value="">{t('submap.anotherWay')}</option>
            {#each others as child (child.meta.id)}
              <option value={child.meta.id}>{child.meta.name || t('map.untitled')}</option>
            {/each}
          </select>
          <button disabled={!another} onclick={addWay}>{t('submap.addWay')}</button>
        </div>
      {/if}
    {/if}
  </div>
{/if}

<style>
  .submaps {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
  }

  .title {
    color: var(--text-muted);
  }

  .way {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* Where it arrives and its kind, on a line of their own under the map's name. */
  small {
    display: block;
    margin-left: 18px;
    overflow: hidden;
    color: var(--text-muted);
    text-overflow: ellipsis;
  }

  .name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
  }

  button {
    font: inherit;
    padding: 2px 8px;
    background: var(--bg);
    color: var(--text);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
    cursor: pointer;
  }

  button:hover:not(:disabled) {
    border-color: var(--accent);
  }

  select {
    flex: 1;
    min-width: 0;
    font: inherit;
  }

  button.primary {
    border-color: var(--accent);
  }

  .new {
    align-self: flex-start;
  }
</style>

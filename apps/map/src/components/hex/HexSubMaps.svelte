<script lang="ts">
  import { parseKey } from '@open-tabletop/hex'
  import type { HexKey } from '@open-tabletop/map'
  import { InfoTip, showToast } from '@open-tabletop/ui-kit'
  import { localize } from '@open-tabletop/session'
  import { getLocale, t } from '../../lib/i18n/index.svelte'
  import { openLibraryMap } from '../../lib/io/actions.svelte'
  import { addWayInto, newSubMap, waysAt, type WayHere } from '../../lib/io/submaps'
  import { partyAt, sessionOf, step } from '../../lib/play/play'
  import { mapSystem } from '../../lib/play/systems'
  import { editor } from '../../lib/store/editor.svelte'
  import { view } from '../../lib/store/view'

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

  /** The map at the way's other end, with the cell it arrives at selected and in view. */
  async function open(way: WayHere) {
    if (!(await openLibraryMap(way.map))) return
    if (editor.tool !== 'play') editor.tool = 'select'
    editor.panelView = 'tool'
    editor.selected = way.at
    view.centerOn(parseKey(way.at))
  }

  /** The way's other end becomes the destination: the trip's march takes it. */
  function head(way: WayHere) {
    step({ type: 'setDestination', place: way.there })
    showToast(t('submap.headed'), 'info', 6000)
  }

  /** A kind of way as the system names it for players, else its id. */
  const kindName = (kind: string) =>
    localize(mapSystem().rules.connections?.[kind]?.name, getLocale(), 'en') ?? kind

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
          ><span class="arrow {way.dir}">{way.dir === 'in' ? '↓' : '↑'}</span>
          {way.dir === 'in'
            ? way.name || t('map.untitled')
            : t('submap.wayOut', { name: way.name || t('map.untitled') })}
          <small
            >{t('submap.arrives', { cell: way.cell })}{#if way.kind}{` · ${kindName(
                way.kind,
              )}`}{/if}</small
          ></span
        >
        <button onclick={() => open(way)}>{t('submap.open')}</button>
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

  .arrow {
    display: inline-block;
    width: 16px;
    height: 16px;
    margin-right: 2px;
    border-radius: 50%;
    font-size: 11px;
    line-height: 16px;
    color: #f4efe2;
    text-align: center;
  }

  /* The colours of the ways' badges on the map. */
  .arrow.in {
    background: #c4561c;
  }

  .arrow.out {
    background: #1f7a8c;
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

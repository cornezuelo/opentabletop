<script lang="ts">
  import { placeOn, type HexKey } from '@open-tabletop/map'
  import { InfoTip, showToast } from '@open-tabletop/ui-kit'
  import { t } from '../../lib/i18n/index.svelte'
  import { openLibraryMap } from '../../lib/io/actions.svelte'
  import { newSubMap, subMapsAt } from '../../lib/io/submaps'
  import { partyLocation, sessionOf, step } from '../../lib/play/play'
  import { mapSystem } from '../../lib/play/systems'
  import { editor } from '../../lib/store/editor.svelte'

  /**
   * The ways a hex leads into other maps: the sub-maps under it (Open; Go in while the
   * party is there on a trip), the way out of this sub-map at its entrance, and New sub-map.
   */
  let { key, name }: { key: HexKey; name: string } = $props()

  const children = $derived((void editor.linked, subMapsAt(key)))
  const parent = $derived(editor.meta.parent?.entrance === key ? editor.meta.parent : undefined)
  const parentName = $derived(
    editor.linked.ancestors.at(-1)?.name || editor.linked.parent?.meta.name || t('map.untitled'),
  )
  /** The party is here on a trip: it can head through the way. */
  const here = $derived.by(() => {
    void editor.revision
    const play = editor.play
    return !!play && play.mode === 'rules' && !!sessionOf(play) && partyLocation() === key
  })

  /** The way's other end becomes the destination: the trip's march takes it. */
  function head(map: string, place: string) {
    step({ type: 'setDestination', place: placeOn(map, place) })
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
</script>

<div class="submaps">
  <span class="title">{t('submap.title')}<InfoTip text={t('submap.help')} /></span>
  {#each children as child (child.meta.id)}
    <div class="way">
      <span class="name">↳ {child.meta.name || t('map.untitled')}</span>
      <button onclick={() => openLibraryMap(child.meta.id)}>{t('submap.open')}</button>
      {#if here}
        <button class="primary" onclick={() => head(child.meta.id, child.meta.parent!.entrance)}
          >{t('submap.goIn')}</button
        >
      {/if}
    </div>
  {/each}
  {#if parent}
    <div class="way">
      <span class="name">↰ {t('submap.wayOut', { name: parentName })}</span>
      <button onclick={() => openLibraryMap(parent.map)}>{t('submap.open')}</button>
      {#if here}
        <button class="primary" onclick={() => head(parent.map, parent.place)}
          >{t('submap.goOut')}</button
        >
      {/if}
    </div>
  {/if}
  <button class="new" onclick={create}>{t('submap.new')}</button>
</div>

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

  button:hover {
    border-color: var(--accent);
  }

  button.primary {
    border-color: var(--accent);
  }

  .new {
    align-self: flex-start;
  }
</style>

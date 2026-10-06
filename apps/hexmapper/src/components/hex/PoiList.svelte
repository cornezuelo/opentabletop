<script lang="ts">
  import FieldEditor from '../FieldEditor.svelte'
  import { tooltip } from '@open-tabletop/ui-kit'
  import { t } from '../../lib/i18n/index.svelte'
  import { newId } from '../../lib/model/id'
  import type { HexKey, Poi } from '../../lib/model/types'
  import { editor } from '../../lib/store/editor.svelte'
  import NoteRefInput from '../NoteRefInput.svelte'
  import TokenIconPicker from '../tokens/TokenIconPicker.svelte'
  import { builtinSvg, getBuiltinIcon } from '../../lib/icons/registry'

  let { key, pois }: { key: HexKey; pois: Poi[] } = $props()

  let draft = $state('')
  /** POI whose icon picker is open. */
  let picking = $state<string | null>(null)
  const icon = (id: string | undefined) => {
    if (!id) return null
    const builtin = getBuiltinIcon(id)
    if (builtin) return { svg: builtinSvg(builtin) }
    const asset = editor.map.assets.find((a) => `asset:${a.id}` === id)
    return asset ? { url: asset.dataUrl } : null
  }

  function update(id: string, patch: Partial<Poi>) {
    editor.editHex(key, (h) => ({
      ...h,
      pois: (h.pois ?? []).map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }))
  }

  function remove(id: string) {
    editor.editHex(key, (h) => ({ ...h, pois: (h.pois ?? []).filter((p) => p.id !== id) }))
  }

  function add() {
    const name = draft.trim()
    if (!name) return
    editor.editHex(key, (h) => ({ ...h, pois: [...(h.pois ?? []), { id: newId(), name }] }))
    draft = ''
  }
</script>

<div class="field">
  <span>{t('hex.pois')}</span>
  {#each pois as poi (poi.id)}
    {@const shown = icon(poi.icon)}
    <div class="poi">
      <div class="row">
        <button
          class="poi-icon"
          use:tooltip={t('hex.poiIcon')}
          aria-label={t('hex.poiIcon')}
          aria-expanded={picking === poi.id}
          onclick={() => (picking = picking === poi.id ? null : poi.id)}
        >
          {#if shown?.svg}
            <!-- Bundled, trusted SVG markup. -->
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            {@html shown.svg}
          {:else if shown?.url}
            <img src={shown.url} alt="" />
          {:else}
            ◇
          {/if}
        </button>
        <input
          type="text"
          class="name"
          value={poi.name}
          aria-label={t('hex.poiName')}
          onchange={(e) => update(poi.id, { name: e.currentTarget.value })}
        />
        <button
          class="icon"
          use:tooltip={t('hex.remove')}
          aria-label={t('hex.remove')}
          onclick={() => remove(poi.id)}>✕</button
        >
      </div>
      {#if picking === poi.id}
        <TokenIconPicker
          value={poi.icon}
          none
          categories={['landmarks', 'settlements', 'nature', 'danger', 'misc']}
          onchange={(icon) => {
            update(poi.id, { icon })
            picking = null
          }}
        />
      {/if}
      <textarea
        rows="2"
        value={poi.description ?? ''}
        placeholder={t('hex.poiDescription')}
        aria-label={t('hex.poiDescription')}
        onchange={(e) => update(poi.id, { description: e.currentTarget.value })}></textarea>
      <NoteRefInput
        value={poi.note ?? ''}
        label={t('hex.note')}
        placeholder={t('hex.poiNotePlaceholder', { name: poi.name })}
        onchange={(note) => update(poi.id, { note })}
      />
      <FieldEditor
        fields={poi.fields ?? []}
        help={t('fields.poiHelp')}
        onchange={(fields) => update(poi.id, { fields: fields.length ? fields : undefined })}
      />
    </div>
  {/each}
  <form
    class="row"
    onsubmit={(e) => {
      e.preventDefault()
      add()
    }}
  >
    <input type="text" bind:value={draft} placeholder={t('hex.poiName')} />
    <button type="submit" class="icon" use:tooltip={t('hex.addPoi')} aria-label={t('hex.addPoi')}
      >+</button
    >
  </form>
</div>

<style>
  .poi-icon {
    flex: none;
    width: 30px;
    height: 30px;
    padding: 3px;
    color: var(--text-muted);
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
    cursor: pointer;
  }

  .poi-icon :global(svg),
  .poi-icon img {
    display: block;
    width: 100%;
    height: 100%;
    color: var(--text);
    object-fit: contain;
  }

  .poi {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 6px;
    background: var(--bg);
    border-radius: 4px;
  }

  .row {
    display: flex;
    gap: 4px;
  }

  .row input {
    flex: 1;
    min-width: 0;
  }

  .name {
    font-weight: 600;
  }

  textarea {
    resize: vertical;
  }
</style>

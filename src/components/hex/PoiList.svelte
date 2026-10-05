<script lang="ts">
  import { t } from '../../lib/i18n/index.svelte'
  import { newId } from '../../lib/model/id'
  import type { HexKey, Poi } from '../../lib/model/types'
  import { editor } from '../../lib/store/editor.svelte'

  let { key, pois }: { key: HexKey; pois: Poi[] } = $props()

  let draft = $state('')

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
    <div class="poi">
      <div class="row">
        <input
          type="text"
          class="name"
          value={poi.name}
          aria-label={t('hex.poiName')}
          onchange={(e) => update(poi.id, { name: e.currentTarget.value })}
        />
        <button
          class="icon"
          title={t('hex.remove')}
          aria-label={t('hex.remove')}
          onclick={() => remove(poi.id)}>✕</button
        >
      </div>
      <textarea
        rows="2"
        value={poi.description ?? ''}
        placeholder={t('hex.poiDescription')}
        aria-label={t('hex.poiDescription')}
        onchange={(e) => update(poi.id, { description: e.currentTarget.value })}></textarea>
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
    <button type="submit" class="icon" title={t('hex.addPoi')} aria-label={t('hex.addPoi')}
      >+</button
    >
  </form>
</div>

<style>
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

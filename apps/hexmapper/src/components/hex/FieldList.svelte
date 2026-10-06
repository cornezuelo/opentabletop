<script lang="ts">
  import { tooltip } from '@open-tabletop/ui-kit'
  import { t } from '../../lib/i18n/index.svelte'
  import type { CustomField, HexKey } from '../../lib/model/types'
  import { editor } from '../../lib/store/editor.svelte'

  let { key, fields, suggestions }: { key: HexKey; fields: CustomField[]; suggestions: string[] } =
    $props()

  let draftKey = $state('')
  let draftValue = $state('')
  const listId = 'hex-field-suggestions'

  function update(index: number, patch: Partial<CustomField>) {
    editor.editHex(key, (h) => ({
      ...h,
      fields: (h.fields ?? []).map((f, i) => (i === index ? { ...f, ...patch } : f)),
    }))
  }

  function remove(index: number) {
    editor.editHex(key, (h) => ({ ...h, fields: (h.fields ?? []).filter((_, i) => i !== index) }))
  }

  function add() {
    if (!draftKey.trim() && !draftValue.trim()) return
    const field = { key: draftKey, value: draftValue }
    editor.editHex(key, (h) => ({ ...h, fields: [...(h.fields ?? []), field] }))
    draftKey = ''
    draftValue = ''
  }
</script>

<div class="field">
  <span>{t('hex.fields')}</span>
  {#each fields as field, index (index)}
    <div class="row">
      <input
        type="text"
        class="key"
        value={field.key}
        list={listId}
        aria-label={t('hex.fieldKey')}
        onchange={(e) => update(index, { key: e.currentTarget.value })}
      />
      <input
        type="text"
        value={field.value}
        aria-label={t('hex.fieldValue')}
        onchange={(e) => update(index, { value: e.currentTarget.value })}
      />
      <button
        class="icon"
        use:tooltip={t('hex.remove')}
        aria-label={t('hex.remove')}
        onclick={() => remove(index)}>✕</button
      >
    </div>
  {/each}
  <form
    class="row"
    onsubmit={(e) => {
      e.preventDefault()
      add()
    }}
  >
    <input
      type="text"
      class="key"
      bind:value={draftKey}
      placeholder={t('hex.fieldKey')}
      list={listId}
    />
    <input type="text" bind:value={draftValue} placeholder={t('hex.fieldValue')} />
    <button
      type="submit"
      class="icon"
      use:tooltip={t('hex.addField')}
      aria-label={t('hex.addField')}>+</button
    >
  </form>
  <datalist id={listId}>
    {#each suggestions as suggestion (suggestion)}
      <option value={suggestion}></option>
    {/each}
  </datalist>
</div>

<style>
  .row {
    display: grid;
    grid-template-columns: 2fr 3fr auto;
    gap: 4px;
  }

  input {
    min-width: 0;
  }

  .key {
    color: var(--text-muted);
  }
</style>

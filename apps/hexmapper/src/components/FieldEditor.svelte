<script lang="ts">
  import { InfoTip, tooltip } from '@open-tabletop/ui-kit'
  import { t } from '../lib/i18n/index.svelte'
  import { fieldSuggestions } from '../lib/model/hex'
  import type { CustomField } from '../lib/model/types'
  import { editor } from '../lib/store/editor.svelte'

  /**
   * Key/value fields of a hex, POI, icon, region or token. Keys and values used anywhere
   * on the map are suggested while typing.
   */
  let {
    fields,
    onchange,
    help,
  }: {
    fields: CustomField[]
    onchange: (fields: CustomField[]) => void
    /** What tables see of these values (e.g. "{{token.<key>}}"). */
    help?: string
  } = $props()

  let draftKey = $state('')
  let draftValue = $state('')
  const id = $props.id()
  const suggestions = $derived.by(() => {
    void editor.revision
    return fieldSuggestions(editor.map)
  })
  const valuesOf = (key: string) => suggestions.get(key.trim()) ?? []

  const update = (index: number, patch: Partial<CustomField>) =>
    onchange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)))

  function add() {
    if (!draftKey.trim() && !draftValue.trim()) return
    onchange([...fields, { key: draftKey.trim(), value: draftValue.trim() }])
    draftKey = ''
    draftValue = ''
  }
</script>

<div class="field">
  <span
    >{t('hex.fields')}{#if help}<InfoTip text={help} />{/if}</span
  >
  {#each fields as field, index (index)}
    <div class="row">
      <input
        type="text"
        class="key"
        value={field.key}
        list="{id}-keys"
        aria-label={t('hex.fieldKey')}
        onchange={(e) => update(index, { key: e.currentTarget.value.trim() })}
      />
      <input
        type="text"
        value={field.value}
        list="{id}-values-{index}"
        aria-label={t('hex.fieldValue')}
        onchange={(e) => update(index, { value: e.currentTarget.value.trim() })}
      />
      <datalist id="{id}-values-{index}">
        {#each valuesOf(field.key) as value (value)}<option {value}></option>{/each}
      </datalist>
      <button
        class="icon"
        use:tooltip={t('hex.remove')}
        aria-label={t('hex.remove')}
        onclick={() => onchange(fields.filter((_, i) => i !== index))}>✕</button
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
      list="{id}-keys"
    />
    <input
      type="text"
      bind:value={draftValue}
      placeholder={t('hex.fieldValue')}
      list="{id}-draft-values"
    />
    <datalist id="{id}-draft-values">
      {#each valuesOf(draftKey) as value (value)}<option {value}></option>{/each}
    </datalist>
    <button
      type="submit"
      class="icon"
      use:tooltip={t('hex.addField')}
      aria-label={t('hex.addField')}>+</button
    >
  </form>
  <datalist id="{id}-keys">
    {#each [...suggestions.keys()] as key (key)}<option value={key}></option>{/each}
  </datalist>
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .field > span {
    font-size: 12px;
    color: var(--text-muted);
  }

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

<script lang="ts">
  import { InfoTip, tooltip } from '@open-tabletop/ui-kit'
  import { t } from '../lib/i18n/index.svelte'
  import { fieldSuggestions } from '../lib/model/hex'
  import type { CustomField } from '../lib/model/types'
  import { editor } from '../lib/store/editor.svelte'
  import { contextSuggestions, FACT_GROUPS, FACT_PATHS } from '@open-tabletop/session'
  import { library } from '../lib/play/packs'

  /** What the map and trips already give: a value with one of these names is hidden. */
  /** Names the map or a trip already gives: a field with one would be hidden by it. */
  const RESERVED = new Set([
    'hex',
    'name',
    'icon',
    'token',
    'party',
    'today',
    'yesterday',
    'from',
    'around',
    ...FACT_GROUPS,
    ...Object.keys(FACT_PATHS),
  ])

  /**
   * Key/value fields of a hex, POI, icon, region or token. Keys and values used anywhere
   * on the map are suggested while typing.
   */
  let {
    fields,
    onchange,
    help,
    scope = 'place',
  }: {
    fields: CustomField[]
    onchange: (fields: CustomField[]) => void
    /** What tables see of these values (e.g. "{{token.<key>}}"). */
    help?: string
    /** Whose values: a place (hex, region, POI), an icon or a token — tables read them differently. */
    scope?: 'place' | 'icon' | 'token'
  } = $props()

  let draftKey = $state('')
  let draftValue = $state('')
  const id = $props.id()
  /** Names the packs' tables read and nothing on the map gives yet (danger, guards, fare…). */
  const packHints = $derived(
    Object.entries(contextSuggestions(library.registry, {}, { reads: true })).flatMap(
      ([full, values]): [string, string[]][] => {
        // A hex's values by their full names too (`hex.danger`, `hex.icon.guards`).
        const key = full.startsWith('hex.') ? full.slice(4) : full
        const name =
          scope === 'icon'
            ? key.startsWith('icon.') && key.slice(5)
            : scope === 'token'
              ? key.startsWith('token.') && key.slice(6)
              : !key.includes('.') && !RESERVED.has(key) && key
        return name && name !== 'id' && name !== 'name' && name !== 'kind' ? [[name, values]] : []
      },
    ),
  )
  const suggestions = $derived.by(() => {
    void editor.revision
    const out = fieldSuggestions(editor.map)
    for (const [key, values] of packHints)
      out.set(key, [...new Set([...(out.get(key) ?? []), ...values])])
    return out
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

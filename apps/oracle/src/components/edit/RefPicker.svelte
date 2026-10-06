<script lang="ts">
  import { t } from '../../lib/i18n'
  import type { DefinitionDoc } from '../../lib/packs/doc.svelte'

  /** "Then roll": nothing, a table or a generator (by id, with suggestions). */
  let {
    doc,
    table,
    generator,
    disabled = false,
    onchange,
  }: {
    doc: DefinitionDoc
    table?: string
    generator?: string
    disabled?: boolean
    onchange: (kind: 'table' | 'generator' | '', target: string) => void
  } = $props()

  const kind = $derived(table ? 'table' : generator ? 'generator' : '')
  const listId = $props.id()
</script>

<div class="ref">
  <select
    value={kind}
    {disabled}
    onchange={(e) => {
      const k = e.currentTarget.value as 'table' | 'generator' | ''
      const first = doc.targets.find((x) => x.kind === k)?.ref ?? ''
      onchange(k, table ?? generator ?? first)
    }}
  >
    <option value="">{t('edit.nothing')}</option>
    <option value="table">{t('kinds.table')}</option>
    <option value="generator">{t('kinds.generator')}</option>
  </select>
  {#if kind}
    <input
      type="text"
      list={listId}
      value={table ?? generator ?? ''}
      {disabled}
      onchange={(e) => onchange(kind, e.currentTarget.value.trim())}
    />
    <datalist id={listId}>
      {#each doc.targets.filter((x) => x.kind === kind) as x (x.ref)}<option value={x.ref}
        ></option>{/each}
    </datalist>
  {/if}
</div>

<style>
  .ref {
    display: flex;
    gap: 4px;
  }

  select {
    width: 100px;
    flex: none;
  }

  /* No intrinsic width: the column decides (sized to the references it holds). */
  input {
    flex: 1;
    width: 0;
    min-width: 0;
  }
</style>

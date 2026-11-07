<script lang="ts">
  import { PairEditor } from '@open-tabletop/pack-ui'
  import type { TravelSystem } from '@open-tabletop/session'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { getLocale, t } from '../../lib/i18n'
  import type { PartDoc } from '../../lib/partDoc.svelte'
  import RecordRows, { type Column, type CustomField } from '../forms/RecordRows.svelte'
  import PieceDrawing from './PieceDrawing.svelte'

  /**
   * A catalogue of pieces (`kind: pieces`) as forms: its name, its grid, what each mark lays,
   * and each piece with its drawing beside how it will look, and its exits as rows.
   */
  let { doc, system }: { doc: PartDoc; system?: TravelSystem } = $props()

  type Raw = Record<string, unknown>
  const data = $derived(doc.data())
  const disabled = $derived(!doc.editable)
  const hex = $derived(data.grid === 'hex')
  const kinds = $derived(Object.keys(system?.rules.connections ?? {}))

  /** The letters drawn in a piece's cells, which each want an exit. */
  const lettersOf = (cells: unknown) => [...new Set(String(cells ?? '').match(/[A-Z]/g) ?? [])]
  const cellsOf = (id: string) => ((data.pieces as Raw | undefined)?.[id] as Raw | undefined)?.cells

  function setExit(field: CustomField, letter: string, patch: Raw) {
    const all = (field.value ?? {}) as Raw
    const next = { ...(all[letter] as Raw), ...patch }
    for (const [key, value] of Object.entries(next))
      if (value === undefined || value === '' || value === false) delete next[key]
    field.set({ ...all, [letter]: next })
  }

  const columns: Column[] = $derived([
    { field: 'name', label: t('piecesForm.pieceName'), type: 'text' },
    { field: 'room', label: t('piecesForm.room'), help: t('piecesForm.roomHelp'), type: 'check' },
    {
      field: 'turn',
      label: t('piecesForm.turn'),
      help: t('piecesForm.turnHelp'),
      type: 'check',
      default: true,
    },
    {
      field: 'contents',
      label: t('piecesForm.contents'),
      help: t('piecesForm.contentsHelp'),
      type: 'value',
      placeholder: 'table.crypt-contents',
    },
    { field: 'tags', label: t('piecesForm.tags'), help: t('piecesForm.tagsHelp'), type: 'list' },
    {
      field: 'fields',
      label: t('piecesForm.fields'),
      help: t('piecesForm.fieldsHelp'),
      type: 'flow',
    },
    {
      field: 'cells',
      label: t('piecesForm.cells'),
      help: t('piecesForm.cellsHelp'),
      type: 'custom',
      render: drawing,
      said: () => '',
    },
    {
      field: 'exits',
      label: t('piecesForm.exits'),
      help: t('piecesForm.exitsHelp'),
      type: 'custom',
      render: exits,
      said: (value: unknown) => Object.keys((value ?? {}) as Raw).join(' '),
    },
  ])
</script>

{#snippet drawing(field: CustomField)}
  <div class="drawing">
    <textarea
      rows="6"
      spellcheck="false"
      value={String(field.value ?? '')}
      disabled={field.disabled}
      onchange={(e) => field.set(e.currentTarget.value)}></textarea>
    <PieceDrawing cells={String(field.value ?? '')} {hex} />
  </div>
{/snippet}

{#snippet exits(field: CustomField)}
  {@const all = (field.value ?? {}) as Raw}
  {@const letters = [...new Set([...lettersOf(cellsOf(field.id)), ...Object.keys(all)])]}
  {#each letters as letter (letter)}
    {@const exit = (all[letter] ?? {}) as Raw}
    <div class="exit">
      <strong>{letter}</strong>
      <select
        aria-label={t('piecesForm.exitKind')}
        value={String(exit.kind ?? '')}
        disabled={field.disabled}
        onchange={(e) => setExit(field, letter, { kind: e.currentTarget.value })}
      >
        <option value="">{t('piecesForm.noKind')}</option>
        {#each [...new Set([...kinds, ...(exit.kind ? [String(exit.kind)] : [])])] as kind (kind)}
          <option value={kind}>{kind}</option>
        {/each}
      </select>
      <label class="check">
        <input
          type="checkbox"
          checked={exit.entry === true}
          disabled={field.disabled}
          onchange={(e) => setExit(field, letter, { entry: e.currentTarget.checked })}
        />
        <span>{t('piecesForm.entry')}<InfoTip text={t('piecesForm.entryHelp')} /></span>
      </label>
    </div>
  {:else}
    <p class="hint">{t('piecesForm.noExits')}</p>
  {/each}
{/snippet}

<div class="form-stack">
  <section class="head">
    <label>
      <span>{t('piecesForm.name')}<InfoTip text={t('piecesForm.nameHelp')} /></span>
      <input
        type="text"
        value={doc.text('', data.name, ['name'])}
        placeholder={doc.translating ? doc.baseText(data.name) : ''}
        {disabled}
        onchange={(e) => doc.setText('', ['name'], data.name, ['name'], e.currentTarget.value)}
      />
    </label>
    <label>
      <span>{t('piecesForm.grid')}<InfoTip text={t('piecesForm.gridHelp')} /></span>
      <select
        value={hex ? 'hex' : 'square'}
        {disabled}
        onchange={(e) =>
          doc.edit('', ['grid'], e.currentTarget.value === 'hex' ? 'hex' : undefined)}
      >
        <option value="square">{t('piecesForm.squares')}</option>
        <option value="hex">{t('piecesForm.hexes')}</option>
      </select>
    </label>
  </section>

  <section>
    <h3>{t('piecesForm.marks')}<InfoTip text={t('piecesForm.marksHelp')} /></h3>
    <PairEditor
      value={data.marks ?? {}}
      fresh="stone-floor"
      locale={getLocale()}
      {disabled}
      label={t('piecesForm.marks')}
      onchange={(value) => doc.edit('', ['marks'], value)}
    />
  </section>

  <section>
    <h3>{t('piecesForm.pieces')}<InfoTip text={t('piecesForm.piecesHelp')} /></h3>
    <RecordRows
      {doc}
      at={['pieces']}
      idLabel={t('forms.id')}
      suggestions={['passage', 'junction', 'room', 'crypt', 'dead-end']}
      template={{ name: 'New piece', cells: 'A\n.\n', exits: { A: { kind: kinds[0] ?? 'door' } } }}
      {columns}
    />
  </section>
</div>

<style>
  section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .head {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .drawing {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }

  textarea {
    flex: 1;
    min-width: 120px;
    font-family: monospace;
    white-space: pre;
  }

  .exit {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 4px;
  }

  .check {
    flex-direction: row;
    align-items: center;
  }
</style>

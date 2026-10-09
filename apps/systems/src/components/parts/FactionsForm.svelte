<script lang="ts">
  import type { TravelSystem } from '@open-tabletop/session'
  import { InfoTip, SuggestInput } from '@open-tabletop/ui-kit'
  import { t } from '../../lib/i18n'
  import { library } from '../../lib/packs.svelte'
  import type { PartDoc } from '../../lib/partDoc.svelte'
  import RecordRows from '../forms/RecordRows.svelte'

  /**
   * The factions of a system (`kind: factions`) as forms: the sheet they're made with, what
   * they roll on their turn and how often turns come, and each faction (its name, colour,
   * starting values and territory, its own turn table).
   */
  let { doc, system }: { doc: PartDoc; system: TravelSystem } = $props()

  const data = $derived(doc.data())
  const disabled = $derived(!doc.editable)
  const pack = $derived(system.pack ?? '')
  /** The sheets this pack and its dependencies declare. */
  const sheets = $derived(
    [pack, ...(library.registry.packs.get(pack)?.dependencies ?? [])].flatMap((p) =>
      (library.registry.extras.get(p) ?? [])
        .filter((e) => e.kind === 'sheet')
        .map((e) => (p === pack ? (e.id ?? 'default') : `${p}/${e.id ?? 'default'}`)),
    ),
  )
  /** What a faction can roll on its turn: tables, oracles, generators and decks. */
  const rollable = $derived(
    [...library.registry.definitions.values()].map((d) => (d.pack === pack ? d.localId : d.id)),
  )
  const values = $derived(Object.keys(system.factions?.sheet.def.values ?? {}))
</script>

<div class="form">
  <section class="head">
    <label>
      <span>{t('factionsForm.name')}<InfoTip text={t('factionsForm.nameHelp')} /></span>
      <input
        type="text"
        value={doc.text('', data.name, ['name'])}
        placeholder={doc.translating ? doc.baseText(data.name) : ''}
        {disabled}
        onchange={(e) => doc.setText('', ['name'], data.name, ['name'], e.currentTarget.value)}
      />
    </label>
    <label>
      <span>{t('factionsForm.sheet')}<InfoTip text={t('factionsForm.sheetHelp')} /></span>
      <select
        value={typeof data.sheet === 'string' ? data.sheet : ''}
        {disabled}
        onchange={(e) => doc.edit('', ['sheet'], e.currentTarget.value)}
      >
        {#each sheets as id (id)}<option value={id}>{id}</option>{/each}
      </select>
    </label>
    <label>
      <span>{t('factionsForm.turn')}<InfoTip text={t('factionsForm.turnHelp')} /></span>
      <SuggestInput
        label={t('factionsForm.turn')}
        value={typeof data.turn === 'string' ? data.turn : ''}
        list={rollable}
        {disabled}
        onchange={(v) => doc.edit('', ['turn'], v.trim() || undefined)}
      />
    </label>
    <label class="num">
      <span>{t('factionsForm.every')}<InfoTip text={t('factionsForm.everyHelp')} /></span>
      <input
        type="number"
        min="0"
        value={typeof data.every === 'number' ? data.every : ''}
        placeholder={t('factionsForm.byHand')}
        {disabled}
        onchange={(e) => {
          const v = e.currentTarget.value.trim()
          doc.edit('', ['every'], v === '' ? undefined : Number(v))
        }}
      />
    </label>
  </section>

  <section>
    <h3>{t('factionsForm.factions')}<InfoTip text={t('factionsForm.factionsHelp')} /></h3>
    <RecordRows
      {doc}
      at={['factions']}
      idLabel={t('forms.id')}
      template={{}}
      columns={[
        { field: 'name', label: t('factionsForm.factionName'), type: 'text' },
        {
          field: 'color',
          label: t('factionsForm.color'),
          help: t('factionsForm.colorHelp'),
          type: 'value',
          placeholder: '#8b1e1e',
        },
        {
          field: 'values',
          label: t('factionsForm.values'),
          help: t('factionsForm.valuesHelp'),
          type: 'flow',
          hints: Object.fromEntries(values.map((v) => [v, []])),
        },
        {
          field: 'territory.regions',
          label: t('factionsForm.regions'),
          help: t('factionsForm.regionsHelp'),
          type: 'list',
        },
        {
          field: 'territory.hexes',
          label: t('factionsForm.hexes'),
          help: t('factionsForm.hexesHelp'),
          type: 'list',
          placeholder: '15,9',
        },
        {
          field: 'turn',
          label: t('factionsForm.ownTurn'),
          help: t('factionsForm.ownTurnHelp'),
          type: 'value',
        },
      ]}
    />
  </section>
</div>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: 22px;
    max-width: 1100px;
  }

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

  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>

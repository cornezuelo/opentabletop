<script lang="ts">
  import { contextSuggestions, type SheetScope, type TravelSystem } from '@open-tabletop/session'
  import { availableActions, BLOCKABLE, ref } from '@open-tabletop/travel-engine'
  import { createCharacter, DISPLAYS, parseSheet, TONES } from '@open-tabletop/character-engine'
  import { CharacterCard } from '@open-tabletop/character-ui'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { PairEditor } from '@open-tabletop/pack-ui'
  import { getLocale, t } from '../../lib/i18n'
  import { library } from '../../lib/packs.svelte'
  import type { PartDoc } from '../../lib/partDoc.svelte'
  import { usesFor } from '../../lib/usage'
  import RecordRows from '../forms/RecordRows.svelte'

  /**
   * A sheet (`kind: sheet`) as forms: what each of the party's characters has. Its values
   * (with their bounds, as tracks, in groups), its conditions (and what each blocks) and
   * the kinds of relation a character may hold.
   */
  let {
    doc,
    system,
    scope,
  }: {
    doc: PartDoc
    system: TravelSystem
    /** Which of the system's sheets this is (members', party's, factions'), for Used by. */
    scope?: SheetScope
  } = $props()

  const data = $derived(doc.data())
  const disabled = $derived(!doc.editable)
  /** What a condition may block: moving on, the system's actions and its ways of travelling. */
  const blockable = $derived([
    ...BLOCKABLE,
    ...Object.keys(availableActions(system.rules).all).map((id) => ref('actions', id)),
    ...Object.keys(system.rules.modes).map((id) => ref('modes', id)),
  ])
  /**
   * What a condition that holds by itself may read: the character's own (`self.*`) first,
   * then the world's.
   */
  const whenHints = $derived({
    ...Object.fromEntries(
      Object.keys((data?.values as Record<string, unknown>) ?? {}).map((id) => [
        `self.values.${id}`,
        [],
      ]),
    ),
    'self.conditions': Object.keys((data?.conditions as Record<string, unknown>) ?? {}),
    'self.tags': [],
    // What its items fill: each place, and all it carries.
    ...Object.fromEntries(
      Object.keys(
        ((data?.items as Record<string, unknown> | undefined)?.places as object) ?? {},
      ).map((id) => [`self.places.${id}.used`, []]),
    ),
    ...(data?.items !== undefined && { 'self.carried.used': [] }),
    ...contextSuggestions(library.registry),
  })
  /** The fields every item has (`items.fields`), for what fills a place. */
  const itemFields = $derived(
    Object.keys(((data?.items as Record<string, unknown>)?.fields as object) ?? {}),
  )
  const size = $derived((data?.items as Record<string, unknown> | undefined)?.size)
  const share = $derived((data?.items as Record<string, unknown> | undefined)?.share)
  const over = $derived((data?.items as Record<string, unknown> | undefined)?.over)
  const room = $derived((data?.items as Record<string, unknown> | undefined)?.room)
  const full = $derived((data?.items as Record<string, unknown> | undefined)?.full)
  const start = $derived((data?.items as Record<string, unknown> | undefined)?.start)
  /** The items of the system's catalogues, by id: what a new character may start with. */
  const catalogueIds = $derived([
    ...new Set((system?.items ?? []).flatMap((c) => Object.keys(c.def.items))),
  ])
  /** Tones suggested after a threshold (`0: danger`). */
  const toneHints = Object.fromEntries(['0', '1', '2', '3'].map((at) => [at, TONES]))

  /** The sheet as it reads now, and a character made with it to try it on (kept here only). */
  const parsed = $derived(parseSheet(data))
  /** The system's own, with its translations, when it's one of its sheets and it reads. */
  const compiled = $derived(
    scope === 'members'
      ? system.sheet?.def
      : scope === 'party'
        ? system.partySheet?.def
        : scope === 'factions'
          ? system.factions?.sheet.def
          : undefined,
  )
  let sample = $state<ReturnType<typeof createCharacter> | undefined>()
  const preview = $derived.by(() => {
    const sheet = parsed.sheet && (compiled ?? parsed.sheet)
    if (!sheet) return undefined
    const fresh = createCharacter(sheet, 'preview', { id: 'preview', name: t('sheet.previewName') })
    // What was tried keeps its values while they still exist on the sheet.
    const tried = sample && {
      ...fresh,
      values: Object.fromEntries(
        Object.keys(fresh.values).map((id) => [id, sample!.values[id] ?? fresh.values[id]]),
      ),
      conditions: Object.fromEntries(
        Object.entries(sample.conditions).filter(([id]) => id in sheet.conditions),
      ),
      ...(sample.items && { items: sample.items }),
      ...(sample.places && { places: sample.places }),
    }
    return { sheet, character: tried ?? fresh }
  })
</script>

<div class="form">
  <section>
    <label class="name">
      <span>{t('sheet.name')}<InfoTip text={t('sheet.nameHelp')} /></span>
      <input
        type="text"
        value={doc.text('', data.name, ['name'])}
        placeholder={doc.translating ? doc.baseText(data.name) : ''}
        {disabled}
        onchange={(e) => doc.setText('', ['name'], data.name, ['name'], e.currentTarget.value)}
      />
    </label>
    <label class="name description">
      <span>{t('forms.description')}<InfoTip text={t('sheet.descriptionHelp')} /></span>
      <textarea
        rows="3"
        value={doc.text('', data.description, ['description'])}
        placeholder={doc.translating ? doc.baseText(data.description) : ''}
        {disabled}
        onchange={(e) =>
          doc.setText(
            '',
            ['description'],
            data.description,
            ['description'],
            e.currentTarget.value,
          )}></textarea>
    </label>
  </section>

  <section>
    <h3>{t('sheet.values')}<InfoTip text={t('sheet.valuesHelp')} /></h3>
    <RecordRows
      {doc}
      at={['values']}
      uses={scope && {
        of: (id) => usesFor(system, { kind: 'sheet-value', sheet: scope, id }),
        system,
      }}
      idLabel={t('forms.id')}
      template={{ default: 0 }}
      columns={[
        { field: 'name', label: t('sheet.valueName'), type: 'text' },
        {
          field: 'description',
          label: t('forms.description'),
          help: t('forms.descriptionHelp'),
          type: 'text',
        },
        { field: 'group', label: t('sheet.group'), help: t('sheet.groupHelp'), type: 'value' },
        {
          field: 'min',
          label: t('sheet.min'),
          help: t('sheet.boundHelp'),
          type: 'value',
        },
        { field: 'max', label: t('sheet.max'), help: t('sheet.boundHelp'), type: 'value' },
        {
          field: 'default',
          label: t('sheet.default'),
          help: t('sheet.defaultHelp'),
          type: 'number',
          off: (row) => row.from !== undefined,
        },
        { field: 'from', label: t('sheet.from'), help: t('sheet.fromHelp'), type: 'value' },
        {
          field: 'display',
          label: t('sheet.display'),
          help: t('sheet.displayHelp'),
          type: 'select',
          choices: DISPLAYS,
          placeholder: 'number',
          read: (row) => (row.track ? 'boxes' : undefined),
          replaces: ['track'],
        },
        {
          field: 'of',
          label: t('sheet.of'),
          help: t('sheet.ofHelp'),
          type: 'value',
          off: (row) => row.display !== 'of' && row.display !== 'bar',
        },
        {
          field: 'levels',
          label: t('sheet.levels'),
          help: t('sheet.levelsHelp'),
          type: 'list',
          off: (row) => row.display !== 'levels',
        },
        {
          field: 'tones',
          label: t('sheet.tones'),
          help: t('sheet.tonesHelp'),
          type: 'pairs',
          hints: toneHints,
        },
      ]}
    />
  </section>

  <section>
    <h3>{t('sheet.preview')}<InfoTip text={t('sheet.previewHelp')} /></h3>
    {#if preview}
      <div class="preview">
        <CharacterCard
          sheet={preview.sheet}
          character={preview.character}
          locale={getLocale()}
          named={false}
          catalogues={system.items}
          onchange={(next) => (sample = next)}
        />
      </div>
    {:else}
      <ul class="problems">
        {#each parsed.errors as problem (problem)}<li>{problem}</li>{/each}
      </ul>
    {/if}
  </section>

  <section>
    <h3>{t('sheet.groups')}<InfoTip text={t('sheet.groupsHelp')} /></h3>
    <RecordRows
      {doc}
      at={['groups']}
      idLabel={t('forms.id')}
      suggestions={['attributes', 'skills', 'body', 'gear']}
      columns={[
        { field: 'name', label: t('sheet.groupName'), type: 'text' },
        {
          field: 'description',
          label: t('forms.description'),
          help: t('forms.descriptionHelp'),
          type: 'text',
        },
      ]}
    />
  </section>

  <section>
    <h3>{t('sheet.conditions')}<InfoTip text={t('sheet.conditionsHelp')} /></h3>
    <RecordRows
      {doc}
      at={['conditions']}
      uses={scope && {
        of: (id) => usesFor(system, { kind: 'sheet-condition', sheet: scope, id }),
        system,
      }}
      idLabel={t('forms.id')}
      suggestions={['wounded', 'exhausted', 'hungry', 'frightened']}
      columns={[
        { field: 'name', label: t('sheet.conditionName'), type: 'text' },
        {
          field: 'description',
          label: t('forms.description'),
          help: t('forms.descriptionHelp'),
          type: 'text',
        },
        {
          field: 'blocks',
          label: t('sheet.blocks'),
          help: t('sheet.blocksHelp'),
          type: 'list',
          choices: blockable,
        },
        {
          field: 'when',
          label: t('sheet.holdsWhen'),
          help: t('sheet.holdsWhenHelp'),
          type: 'condition',
          placeholder: t('sheet.byEffects'),
          hints: whenHints,
        },
      ]}
    />
  </section>

  <section>
    <h3>{t('sheet.items')}<InfoTip text={t('sheet.itemsHelp')} /></h3>
    <h4>{t('sheet.itemFields')}<InfoTip text={t('sheet.itemFieldsHelp')} /></h4>
    <RecordRows
      {doc}
      at={['items', 'fields']}
      idLabel={t('forms.id')}
      suggestions={['slots', 'weight', 'uses', 'armour', 'damage', 'cost']}
      template={{ min: 0 }}
      columns={[
        { field: 'name', label: t('sheet.valueName'), type: 'text' },
        {
          field: 'description',
          label: t('forms.description'),
          help: t('forms.descriptionHelp'),
          type: 'text',
        },
        {
          field: 'default',
          label: t('sheet.default'),
          help: t('sheet.defaultHelp'),
          type: 'number',
        },
        { field: 'min', label: t('sheet.min'), help: t('sheet.boundHelp'), type: 'value' },
        { field: 'max', label: t('sheet.max'), help: t('sheet.boundHelp'), type: 'value' },
        { field: 'spent', label: t('sheet.spent'), help: t('sheet.spentHelp'), type: 'check' },
        {
          field: 'display',
          label: t('sheet.display'),
          help: t('sheet.displayHelp'),
          type: 'select',
          choices: DISPLAYS,
          placeholder: 'number',
        },
        {
          field: 'levels',
          label: t('sheet.levels'),
          help: t('sheet.levelsHelp'),
          type: 'list',
          off: (row) => row.display !== 'levels',
        },
        {
          field: 'tones',
          label: t('sheet.tones'),
          help: t('sheet.tonesHelp'),
          type: 'pairs',
          hints: toneHints,
        },
      ]}
    />
    <h4>{t('sheet.places')}<InfoTip text={t('sheet.placesHelp')} /></h4>
    <RecordRows
      {doc}
      at={['items', 'places']}
      idLabel={t('forms.id')}
      suggestions={['hands', 'body', 'belt', 'pack', 'head', 'feet']}
      columns={[
        { field: 'name', label: t('sheet.placeName'), type: 'text' },
        {
          field: 'description',
          label: t('forms.description'),
          help: t('forms.descriptionHelp'),
          type: 'text',
        },
        { field: 'tags', label: t('sheet.placeTags'), type: 'list' },
        { field: 'room', label: t('sheet.room'), help: t('sheet.boundHelp'), type: 'value' },
        {
          field: 'over',
          label: t('sheet.over'),
          help: t('sheet.overHelp'),
          type: 'select',
          choices: ['allow', 'refuse'],
          placeholder: t('sheet.overSheet'),
          off: (row) => row.room === undefined,
        },
      ]}
    />
    <label class="name">
      <span>{t('sheet.size')}<InfoTip text={t('sheet.sizeHelp')} /></span>
      <select
        value={typeof size === 'string' ? size : ''}
        {disabled}
        onchange={(e) => doc.edit('', ['items', 'size'], e.currentTarget.value || undefined)}
      >
        <option value="">{t('sheet.sizeCount')}</option>
        {#each itemFields as id (id)}<option value={id}>{id}</option>{/each}
      </select>
    </label>
    <label class="name">
      <span>{t('sheet.share')}<InfoTip text={t('sheet.shareHelp')} /></span>
      <select
        value={typeof share === 'string' ? share : ''}
        {disabled}
        onchange={(e) => doc.edit('', ['items', 'share'], e.currentTarget.value || undefined)}
      >
        <option value="">{t('sheet.shareEven')}</option>
        <option value="order">order</option>
      </select>
    </label>
    <label class="name">
      <span>{t('sheet.over')}<InfoTip text={t('sheet.overHelp')} /></span>
      <select
        value={typeof over === 'string' ? over : ''}
        {disabled}
        onchange={(e) => doc.edit('', ['items', 'over'], e.currentTarget.value || undefined)}
      >
        <option value="">{t('sheet.overAllow')}</option>
        <option value="refuse">refuse</option>
      </select>
    </label>
    <label class="name">
      <span>{t('sheet.roomAll')}<InfoTip text={t('sheet.roomAllHelp')} /></span>
      <input
        value={room === undefined ? '' : String(room)}
        placeholder={t('sheet.roomAllNone')}
        {disabled}
        onchange={(e) => {
          const text = e.currentTarget.value.trim()
          doc.edit(
            '',
            ['items', 'room'],
            text === '' ? undefined : /^[+-]?\d+(\.\d+)?$/.test(text) ? Number(text) : text,
          )
        }}
      />
    </label>
    <label class="name">
      <span>{t('sheet.full')}<InfoTip text={t('sheet.fullHelp')} /></span>
      <select
        value={typeof full === 'string' ? full : ''}
        {disabled}
        onchange={(e) => doc.edit('', ['items', 'full'], e.currentTarget.value || undefined)}
      >
        <option value="">{t('sheet.fullLeave')}</option>
        <option value="ask">ask</option>
      </select>
    </label>
    <div class="name">
      <span>{t('sheet.start')}<InfoTip text={t('sheet.startHelp')} /></span>
      <PairEditor
        value={start ?? {}}
        keys={catalogueIds}
        fresh={1}
        keyLabel={t('sheet.startItem')}
        locale={getLocale()}
        {disabled}
        label={t('sheet.start')}
        onchange={(map) =>
          doc.edit('', ['items', 'start'], map && Object.keys(map).length ? map : undefined)}
      />
    </div>
  </section>

  <section>
    <h3>{t('sheet.relations')}<InfoTip text={t('sheet.relationsHelp')} /></h3>
    <RecordRows
      {doc}
      at={['relations']}
      uses={scope && {
        of: (id) => usesFor(system, { kind: 'sheet-relation', sheet: scope, id }),
        system,
      }}
      idLabel={t('forms.id')}
      suggestions={['bond', 'rival', 'home', 'debt', 'oath']}
      columns={[
        { field: 'name', label: t('sheet.relationName'), type: 'text' },
        {
          field: 'description',
          label: t('forms.description'),
          help: t('forms.descriptionHelp'),
          type: 'text',
        },
        {
          field: 'value.display',
          label: t('sheet.display'),
          help: t('sheet.relationDisplayHelp'),
          type: 'select',
          choices: DISPLAYS.filter((d) => d !== 'levels'),
          placeholder: 'number',
        },
        {
          field: 'value.min',
          label: t('sheet.relationMin'),
          help: t('sheet.relationValueHelp'),
          type: 'number',
        },
        {
          field: 'value.max',
          label: t('sheet.relationMax'),
          help: t('sheet.relationValueHelp'),
          type: 'number',
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

  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }

  h4 {
    margin: 6px 0 0;
    font-size: 13px;
    font-weight: 600;
  }

  .preview {
    max-width: 640px;
    padding: 10px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
  }

  .problems {
    margin: 0;
    color: var(--danger);
    font-size: 12px;
  }

  .name.description {
    max-width: 640px;
  }

  .name {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-width: 320px;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>

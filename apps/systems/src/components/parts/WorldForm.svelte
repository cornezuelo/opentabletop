<script lang="ts">
  import { writeRef } from '@open-tabletop/oracle-engine'
  import { contextSuggestions, effectSuggestions, type TravelSystem } from '@open-tabletop/session'
  import {
    momentList,
    reactionOf,
    reactionRef,
    WORLD_TURN,
    type WorldStep,
  } from '@open-tabletop/world-engine'
  import { InfoTip, TagInput } from '@open-tabletop/ui-kit'
  import { conditionWords } from '@open-tabletop/pack-ui'
  import { getLocale, t } from '../../lib/i18n'
  import { library } from '../../lib/packs.svelte'
  import type { PartDoc } from '../../lib/partDoc.svelte'
  import { momentsList, writeMoments } from '../../lib/systemDoc.svelte'
  import { clockMoments, clockOfMoment } from '../../lib/worldMoments'
  import RecordRows, { type CustomField } from '../forms/RecordRows.svelte'
  import ReactionEditor from '../forms/ReactionEditor.svelte'
  import WorldSteps from './WorldSteps.svelte'
  import ParamsEditor from '../forms/ParamsEditor.svelte'
  import { choiceIds, type WorldParam } from '@open-tabletop/world-engine'

  /**
   * The world's rules of a system (`kind: world`) as forms: each reaction a folded card,
   * with the moments it comes at (a world turn, a clock filling, a condition turning true),
   * its conditions as rows and its steps in order.
   */
  let { doc, system }: { doc: PartDoc; system: TravelSystem } = $props()

  const data = $derived(doc.data())
  const disabled = $derived(!doc.editable)
  const locale = $derived(getLocale())
  const pack = $derived(system.pack ?? '')
  const reactions = $derived(
    (typeof data.reactions === 'object' && data.reactions !== null ? data.reactions : {}) as Record<
      string,
      Record<string, unknown>
    >,
  )
  /** The named moments the world has: a world turn, each clock the system declares filling. */
  const named = $derived([WORLD_TURN, ...clockMoments(system)])
  /** What conditions read: the world's facts among what tables see. */
  const hints = $derived(
    Object.fromEntries(
      Object.entries(contextSuggestions(library.registry)).filter(([path]) =>
        /^(world|factions|time)\./.test(path),
      ),
    ),
  )
  /** What effects can change: the world's clocks and the factions. */
  const effects = $derived(
    Object.fromEntries(
      Object.entries(effectSuggestions(library.registry)).filter(([path]) =>
        /^(world\.clocks|factions)\./.test(path),
      ),
    ),
  )
  /** What a step may roll: this pack's and its dependencies' tables, oracles, generators and decks. */
  const rollable = $derived(
    [...library.registry.definitions.values()]
      .filter((d) => d.pack === pack || system.packs.includes(d.pack))
      .map((d) => writeRef(d.kind, d.localId, d.pack === pack ? undefined : d.pack)),
  )
  const nameOf = (id: string) => doc.text('', reactions[id]?.name, ['reactions', id, 'name']) || id
  /** A reaction's questions (`params`), by id and name. */
  const paramsOf = (id: string) =>
    Object.entries((reactions[id]?.params ?? {}) as Record<string, WorldParam>).map(([p, d]) => ({
      id: p,
      name: doc.text('', d.name, ['reactions', id, 'params', p, 'name']) || p,
      choices: choiceIds(d),
    }))
  /** What a reaction's steps' conditions read: the world, and its answers (`params.<id>`). */
  const hintsOf = (id: string) => ({
    ...hints,
    ...Object.fromEntries(paramsOf(id).map((p) => [`params.${p.id}`, p.choices])),
  })
  /** What a `do:` may bring: a world turn, another reaction. */
  const brings = (self: string) => [
    { id: WORLD_TURN, name: t('worldForm.worldTurn') },
    ...Object.keys(reactions)
      .filter((id) => id !== self)
      .map((id) => ({ id: reactionRef(id), name: nameOf(id) })),
  ]
  /** A moment in words: "After a world turn", "The siege fills". */
  const momentWord = (m: string) =>
    m === WORLD_TURN
      ? t('worldForm.afterTurn')
      : clockOfMoment(system, m, locale)
        ? t('worldForm.clockFills', { clock: clockOfMoment(system, m, locale)! })
        : m
  const momentsSaid = (on: unknown) =>
    momentList((on ?? undefined) as never)
      .map((m) =>
        typeof m === 'string'
          ? momentWord(m)
          : t('worldForm.asTrue', { when: conditionWords(m.when ?? { not: m.unless }, locale) }),
      )
      .join(' · ')
  /** Steps in words, for a folded card: "Say · Roll table.rumours · Change". */
  const stepsSaid = (value: unknown) =>
    (Array.isArray(value) ? (value as WorldStep[]) : [])
      .map((s) =>
        s.roll
          ? `${t('worldForm.kinds.roll')} ${s.roll}`
          : s.do
            ? `${t('worldForm.kinds.do')} ${s.do === WORLD_TURN ? t('worldForm.worldTurn') : reactionOf(s.do) ? nameOf(reactionOf(s.do)!) : s.do}`
            : s.effects
              ? t('worldForm.kinds.effects')
              : s.pause !== undefined
                ? t('worldForm.kinds.pause')
                : s.ask
                  ? `${t('worldForm.kinds.ask')} ${s.ask}`
                  : t('worldForm.kinds.say'),
      )
      .join(' · ')
  const clockName = (moment: string) => clockOfMoment(system, moment, locale)
</script>

{#snippet moments(field: CustomField)}
  <div class="moments">
    <TagInput
      label={t('worldForm.on')}
      value={momentsList(field.value)}
      choices={named}
      removeLabel={t('forms.removeItem')}
      disabled={field.disabled}
      onchange={(items) => field.set(writeMoments(items, undefined, field.value))}
    />
    {#if momentsList(field.value).some((m) => m !== WORLD_TURN && !clockName(m))}
      <small class="muted">{t('worldForm.unknownMoment')}</small>
    {/if}
    <ReactionEditor
      value={field.value}
      {hints}
      disabled={field.disabled}
      each={false}
      help={t('worldForm.asTrueHelp')}
      onchange={(v) => field.set(v)}
    />
  </div>
{/snippet}

{#snippet steps(field: CustomField)}
  <WorldSteps
    value={field.value}
    disabled={field.disabled}
    {rollable}
    brings={brings(field.id)}
    {effects}
    hints={hintsOf(field.id)}
    params={paramsOf(field.id)}
    onchange={(v) => field.set(v ?? [{ say: '…' }])}
  />
{/snippet}

{#snippet questions(field: CustomField)}
  <ParamsEditor
    {doc}
    kind=""
    at={['reactions', field.id, 'params']}
    defaults={false}
    disabled={field.disabled}
  />
{/snippet}

<div class="form">
  <section class="head">
    <label>
      <span>{t('worldForm.name')}<InfoTip text={t('worldForm.nameHelp')} /></span>
      <input
        type="text"
        value={doc.text('', data.name, ['name'])}
        placeholder={doc.translating ? doc.baseText(data.name) : ''}
        {disabled}
        onchange={(e) => doc.setText('', ['name'], data.name, ['name'], e.currentTarget.value)}
      />
    </label>
  </section>

  <section>
    <h3>{t('worldForm.reactions')}<InfoTip text={t('worldForm.reactionsHelp')} /></h3>
    {#if !Object.keys(reactions).length}<p class="muted">{t('worldForm.none')}</p>{/if}
    <RecordRows
      {doc}
      at={['reactions']}
      cards
      idLabel={t('forms.id')}
      {nameOf}
      template={{ on: WORLD_TURN, do: [{ say: '…' }] }}
      columns={[
        { field: 'name', label: t('worldForm.reactionName'), type: 'text' },
        {
          field: 'description',
          label: t('forms.description'),
          help: t('forms.descriptionHelp'),
          type: 'text',
        },
        {
          field: 'on',
          label: t('worldForm.on'),
          help: t('worldForm.onHelp'),
          type: 'custom',
          render: moments,
          said: momentsSaid,
        },
        {
          field: 'when',
          label: t('worldForm.when'),
          help: t('worldForm.whenHelp'),
          type: 'condition',
          hints,
        },
        {
          field: 'unless',
          label: t('worldForm.unless'),
          help: t('worldForm.unlessHelp'),
          type: 'condition',
          hints,
        },
        {
          field: 'params',
          label: t('worldForm.params'),
          help: t('worldForm.paramsHelp'),
          type: 'custom',
          render: questions,
          said: (v: unknown) => Object.keys((v ?? {}) as object).join(', '),
        },
        {
          field: 'do',
          label: t('worldForm.do'),
          help: t('worldForm.doHelp'),
          type: 'custom',
          render: steps,
          said: stepsSaid,
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

  .moments {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .muted {
    margin: 0;
    color: var(--text-muted);
  }
</style>

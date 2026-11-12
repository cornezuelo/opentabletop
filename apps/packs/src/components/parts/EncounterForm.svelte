<script lang="ts">
  import { ConditionEditor } from '@open-tabletop/pack-ui'
  import { contextSuggestions, type TravelSystem } from '@open-tabletop/session'
  import { availableActions } from '@open-tabletop/travel-engine'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { getLocale, t } from '../../lib/i18n'
  import { library } from '../../lib/packs.svelte'

  /**
   * How a system's fights go in turns (`encounter:` in `kind: system`), as a form: on or off,
   * who acts first (by side, or each one by what it rolls), the actions a member takes on its
   * turn, the minutes a round takes and when it ends by itself.
   */
  let {
    system,
    value,
    disabled,
    actionName = () => '',
    rolls = [],
    onchange,
  }: {
    system: TravelSystem
    /** An action's name in the UI language ('' if it has none). */
    actionName?: (id: string) => string
    /** What the Oracle can roll, as the system writes it (`table.foe-turn`), for **A foe's turn**. */
    rolls?: readonly string[]
    /** The system's `encounter:` as written (absent: its fights are played as a whole). */
    value: unknown
    disabled: boolean
    onchange: (encounter: Record<string, unknown> | undefined) => void
  } = $props()

  type Raw = Record<string, unknown>
  const raw = $derived<Raw | undefined>(
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Raw)
      : undefined,
  )
  const order = $derived((raw?.order ?? {}) as Raw)
  const by = $derived(order.by === 'participant' ? 'participant' : 'side')
  /** What each one rolls: one for all, or one for each side. */
  const sides = $derived(
    typeof order.value === 'object' && order.value !== null ? (order.value as Raw) : undefined,
  )
  const chosen = $derived(Array.isArray(raw?.actions) ? (raw.actions as string[]) : [])
  /** The system's actions a player takes (those taken by themselves, `on:`, left out). */
  const actions = $derived(
    Object.entries(availableActions(system.rules).all)
      .filter(([, a]) => !a.on)
      .map(([id]) => id),
  )
  const hints = $derived(contextSuggestions(library.registry))
  const isChosen = (id: string) => chosen.some((a) => a === id || a === `actions.${id}`)

  /** Writes one key of `encounter:` (undefined drops it). */
  function set(key: string, next: unknown) {
    const out: Raw = { ...raw }
    if (next === undefined) delete out[key]
    else out[key] = next
    onchange(out)
  }
  function setOrder(next: Raw) {
    set('order', next)
  }
  function toggle(id: string, on: boolean) {
    const kept = chosen.filter((a) => a !== id && a !== `actions.${id}`)
    set('actions', on ? [...kept, `actions.${id}`] : kept)
  }
</script>

<section>
  <h3>{t('encounter.title')}<InfoTip markdown={t('encounter.help')} /></h3>
  <label class="check">
    <input
      type="checkbox"
      checked={!!raw}
      {disabled}
      onchange={(e) =>
        onchange(e.currentTarget.checked ? { order: { by: 'side' }, actions: [] } : undefined)}
    />
    {t('encounter.on')}
  </label>
  {#if raw}
    <div class="grid">
      <label>
        <span>{t('encounter.by')}<InfoTip markdown={t('encounter.byHelp')} /></span>
        <select
          value={by}
          {disabled}
          onchange={(e) =>
            setOrder(
              e.currentTarget.value === 'participant'
                ? { by: 'participant', value: '{{1d6}}' }
                : { by: 'side' },
            )}
        >
          <option value="side">{t('encounter.bySide')}</option>
          <option value="participant">{t('encounter.byParticipant')}</option>
        </select>
      </label>
      {#if by === 'side'}
        <label>
          <span>{t('encounter.first')}<InfoTip markdown={t('encounter.firstHelp')} /></span>
          <select
            value={String(order.first ?? '')}
            {disabled}
            onchange={(e) =>
              setOrder({
                by: 'side',
                ...(e.currentTarget.value && { first: e.currentTarget.value }),
              })}
          >
            <option value="">{t('encounter.firstParty')}</option>
            <option value="foes">{t('encounter.firstFoes')}</option>
          </select>
        </label>
      {:else}
        <label class="check">
          <input
            type="checkbox"
            checked={!!sides}
            {disabled}
            onchange={(e) => {
              const one = sides ? String(sides.party ?? '') : String(order.value ?? '')
              setOrder({
                by: 'participant',
                value: e.currentTarget.checked ? { party: one, foes: one } : one,
              })
            }}
          />
          {t('encounter.perSide')}<InfoTip markdown={t('encounter.valueHelp')} />
        </label>
        {#if sides}
          {#each ['party', 'foes'] as const as side (side)}
            <label>
              <span>{t(`encounter.${side}Rolls`)}</span>
              <input
                type="text"
                value={String(sides[side] ?? '')}
                {disabled}
                onchange={(e) =>
                  setOrder({
                    by: 'participant',
                    value: { ...sides, [side]: e.currentTarget.value },
                  })}
              />
            </label>
          {/each}
        {:else}
          <label>
            <span>{t('encounter.value')}</span>
            <input
              type="text"
              value={String(order.value ?? '')}
              placeholder={'{{acting.values.agility + 1d6}}'}
              {disabled}
              onchange={(e) => setOrder({ by: 'participant', value: e.currentTarget.value })}
            />
          </label>
        {/if}
      {/if}
      <label>
        <span>{t('encounter.foes')}<InfoTip markdown={t('encounter.foesHelp')} /></span>
        <input
          type="text"
          list="encounter-rolls"
          value={typeof raw.foes === 'string' ? raw.foes : ''}
          placeholder="table.foe-turn"
          {disabled}
          onchange={(e) => set('foes', e.currentTarget.value.trim() || undefined)}
        />
        <datalist id="encounter-rolls">
          {#each rolls as ref (ref)}<option value={ref}></option>{/each}
        </datalist>
      </label>
      <label>
        <span>{t('encounter.minutes')}<InfoTip markdown={t('encounter.minutesHelp')} /></span>
        <input
          type="number"
          min="0"
          step="any"
          value={typeof raw.minutes === 'number' ? raw.minutes : ''}
          {disabled}
          onchange={(e) =>
            set(
              'minutes',
              e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value),
            )}
        />
      </label>
    </div>
    <div class="actions">
      <span class="label"
        >{t('encounter.actions')}<InfoTip markdown={t('encounter.actionsHelp')} /></span
      >
      <div class="ticks">
        {#each actions as id (id)}
          <label class="check">
            <input
              type="checkbox"
              checked={isChosen(id)}
              {disabled}
              onchange={(e) => toggle(id, e.currentTarget.checked)}
            />
            {actionName(id)}
            <code>actions.{id}</code>
          </label>
        {:else}
          <p class="help">{t('encounter.noActions')}</p>
        {/each}
      </div>
    </div>
    <div class="ends">
      <span class="label">{t('encounter.ends')}<InfoTip markdown={t('encounter.endsHelp')} /></span>
      <ConditionEditor
        value={raw.ends}
        suggestions={hints}
        locale={getLocale()}
        {disabled}
        label={t('encounter.ends')}
        onchange={(c) => set('ends', c)}
      />
    </div>
  {/if}
</section>

<style>
  section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 12px;
    color: var(--text-muted);
  }

  label.check {
    flex-direction: row;
    gap: 8px;
    align-items: center;
    font-size: 13px;
    color: var(--text);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 14px;
    align-items: start;
  }

  .actions,
  .ends {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .ticks {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 4px 14px;
  }

  .ticks code {
    font-size: 11px;
    color: var(--text-muted);
  }

  .label {
    font-size: 12px;
    color: var(--text-muted);
  }

  .help {
    margin: 0;
    color: var(--text-muted);
  }
</style>

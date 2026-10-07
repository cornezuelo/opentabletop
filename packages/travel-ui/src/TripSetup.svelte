<script lang="ts">
  import { seasonsFor, type Season, type TravelSystem } from '@open-tabletop/session'
  import { tooltip } from '@open-tabletop/ui-kit'
  import { idText, translator } from './i18n'

  /** Choose the travel system and starting season, and start a new trip. */
  let {
    systems,
    system,
    locale,
    season = $bindable('spring'),
    onrestart,
  }: {
    systems: TravelSystem[]
    /** Id of the current system. */
    system: string
    locale: string
    season?: Season
    onrestart: (system: string, season: Season) => void
  } = $props()

  const t = translator(() => locale)
  const current = $derived(systems.find((s) => s.id === system) ?? systems[0])
  /** The seasons of the system's calendar (spring… by default). */
  const seasons = $derived(current ? seasonsFor(current) : [])
  // A season the system's calendar doesn't have becomes its first one.
  $effect(() => {
    if (seasons.length && !seasons.includes(season)) season = seasons[0]
  })
</script>

<div class="group">
  <label class="field">
    <span>{t('system')}</span>
    <select value={system} onchange={(e) => onrestart(e.currentTarget.value, season)}>
      {#each systems as s (s.id)}
        <option value={s.id}>{s.id === 'generic' ? t('genericSystem') : s.name}</option>
      {/each}
    </select>
  </label>
  <div class="row">
    <label class="field">
      <span>{t('startSeason')}</span>
      <select bind:value={season}>
        {#each seasons as s (s)}
          <option value={s}>{idText(t, `seasons.${s}`, s)}</option>
        {/each}
      </select>
    </label>
    <button use:tooltip={t('tips.newTrip')} onclick={() => onrestart(system, season)}
      >{t('newTrip')}</button
    >
  </div>
  <p class="help">
    {!current?.rules.checks?.length
      ? t('noChecks')
      : Object.keys(current.bindings?.on ?? {}).length
        ? t('withTables')
        : t('noBindings')}
  </p>
</div>

<style>
  .group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    background: var(--bg);
    border-radius: 6px;
  }

  .row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    align-items: end;
    gap: 6px;
  }

  select {
    width: 100%;
    min-width: 0;
  }

  button {
    padding: 5px 8px;
    font-size: 12px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .help {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>

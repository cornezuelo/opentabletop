<script lang="ts">
  import { seasonsFor, systemName, type Season, type TravelSystem } from '@open-tabletop/session'
  import { InfoTip, tooltip } from '@open-tabletop/ui-kit'
  import { idText, translator } from './i18n'

  /** Choose the travel system and starting season, and start a new trip, on one line. */
  let {
    systems,
    system,
    locale,
    season = $bindable('spring'),
    onrestart,
    startNote,
    systemNote,
  }: {
    systems: TravelSystem[]
    /** Id of the current system. */
    system: string
    locale: string
    season?: Season
    onrestart: (system: string, season: Season) => void
    /** When the host decides when trips start (no season to choose): said in the help. */
    startNote?: string
    /**
     * Where the host chooses the system, shown instead of a choice (Map: the
     * map's): said in the help.
     */
    systemNote?: string
  } = $props()

  const t = translator(() => locale)
  const current = $derived(systems.find((s) => s.id === system))
  /** The seasons of the system's calendar (spring… by default). */
  const seasons = $derived(current ? seasonsFor(current) : [])
  // A season the system's calendar doesn't have becomes its first one.
  $effect(() => {
    if (seasons.length && !seasons.includes(season)) season = seasons[0]
  })
  /** What the system is and what its trips roll; where it's chosen and when trips start. */
  const help = $derived(
    [
      systemNote,
      !current?.rules.checks?.length
        ? t('noChecks')
        : Object.keys(current.bindings?.on ?? {}).length
          ? t('withTables')
          : t('noBindings'),
      startNote,
    ]
      .filter(Boolean)
      .join('\n\n'),
  )
</script>

<!-- One line: the system (chosen here, or the host's), the season, New trip; what they
     mean in the system's help. -->
<div class="setup">
  <span class="lead">{t('system')}<InfoTip markdown={help} /></span>
  {#if systemNote}
    <strong class="name">{current ? systemName(current, locale) : system}</strong>
  {:else}
    <select
      class="system"
      aria-label={t('system')}
      value={system}
      onchange={(e) => onrestart(e.currentTarget.value, season)}
    >
      {#each systems as s (s.id)}
        <option value={s.id}>{systemName(s, locale)}</option>
      {/each}
    </select>
  {/if}
  {#if !startNote}
    <select class="season" aria-label={t('startSeason')} bind:value={season}>
      {#each seasons as s (s)}
        <option value={s}>{idText(t, `seasons.${s}`, s)}</option>
      {/each}
    </select>
  {/if}
  <button use:tooltip={t('tips.newTrip')} onclick={() => onrestart(system, season)}
    >{t('newTrip')}</button
  >
</div>

<style>
  .setup {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    font-size: 12px;
  }

  .lead {
    color: var(--text-muted);
  }

  .name {
    font-weight: 600;
  }

  .system {
    flex: 1 1 8em;
    min-width: 0;
  }

  .season {
    flex: 0 1 auto;
    min-width: 0;
  }

  button {
    margin-left: auto;
    padding: 5px 8px;
    font-size: 12px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }
</style>

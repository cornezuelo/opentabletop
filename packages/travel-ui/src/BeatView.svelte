<script lang="ts">
  import { tooltip } from '@open-tabletop/ui-kit'
  import type { BeatTold } from './beats'
  import { translator } from './i18n'

  /**
   * One moment of play (a beat): its title, the lines under it (the story first, the
   * important ones marked), what it changed as chips and, folded, the rules behind it.
   * `folded`: only its title, unfolded on a click (the journal's older moments); `big`: an
   * important moment shown up front.
   */
  let {
    told,
    locale,
    clock = '',
    folded = $bindable(false),
    foldable = false,
    big = false,
    latest = false,
  }: {
    told: BeatTold
    locale: string
    /** When it began, in the calendar's day (the journal's moments). */
    clock?: string
    folded?: boolean
    /** Its title folds and unfolds it. */
    foldable?: boolean
    big?: boolean
    /** What the last step did. */
    latest?: boolean
  } = $props()

  const t = translator(() => locale)
  const note = $derived(told.first.source === 'user')
  /** Anything under its title. */
  const more = $derived(told.lines.length > 0 || told.changes.length > 0 || told.why.length > 0)
</script>

<article
  class="beat"
  class:big
  class:latest
  class:notable={told.notable}
  class:note
  class:oracle={told.first.source === 'oracle'}
>
  <header>
    {#if clock}<time>{clock}</time>{/if}
    {#if foldable && more}
      <button
        class="title"
        aria-expanded={!folded}
        use:tooltip={folded ? t('beats.unfold') : t('beats.fold')}
        onclick={() => (folded = !folded)}
        ><span class="arrow" aria-hidden="true">{folded ? '▸' : '▾'}</span>{told.title}</button
      >
    {:else}
      <span class="title">{told.title}</span>
    {/if}
  </header>
  {#if !folded && more}
    {#if told.lines.length}
      <ul class="lines">
        {#each told.lines as line (line.id)}
          <li class:important={line.notable} class:rules={line.level !== 'story'}>{line.text}</li>
        {/each}
      </ul>
    {/if}
    {#if told.changes.length}
      <ul class="changes" aria-label={t('beats.changes')}>
        {#each told.changes as change, i (i)}<li>{change}</li>{/each}
      </ul>
    {/if}
    {#if told.why.length}
      <details class="why">
        <summary>{t('beats.why')}</summary>
        <ul>
          {#each told.why as line, i (i)}<li>{line}</li>{/each}
        </ul>
      </details>
    {/if}
  {/if}
</article>

<style>
  .beat {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 12px;
    color: var(--text);
  }

  header {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 8px;
    align-items: baseline;
  }

  time {
    color: var(--text-muted);
    font-family: ui-monospace, monospace;
  }

  .title {
    font-weight: 600;
    text-align: left;
  }

  button.title {
    padding: 0;
    font: inherit;
    font-weight: 600;
    color: inherit;
    background: none;
    border: none;
    cursor: pointer;
  }

  button.title:hover {
    color: var(--accent);
  }

  .arrow {
    display: inline-block;
    width: 1.1em;
    color: var(--text-muted);
  }

  .note .title {
    font-style: italic;
    font-weight: normal;
  }

  .oracle .title {
    color: var(--accent);
  }

  /* What the last step did, and an important moment, marked at the side. */
  .latest {
    margin-left: -8px;
    padding-left: 5px;
    border-left: 3px solid var(--accent);
  }

  .notable:not(.big) .title {
    color: var(--accent);
  }

  ul {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 0 0 0 1.1em;
    list-style: none;
  }

  .lines li.important {
    font-weight: 600;
  }

  .lines li.rules {
    color: var(--text-muted);
  }

  .changes {
    flex-flow: row wrap;
    gap: 4px;
  }

  .changes li {
    padding: 0 6px;
    font-size: 11px;
    color: var(--text);
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 999px;
  }

  .why {
    padding-left: 1.1em;
    color: var(--text-muted);
  }

  .why summary {
    cursor: pointer;
  }

  .why ul {
    padding-left: 1em;
  }

  /* Up front: larger, to be read at a glance. */
  .big {
    gap: 6px;
    font-size: 14px;
  }

  .big .title {
    font-size: 15px;
  }

  .big ul {
    padding-left: 0;
  }

  .big .changes li {
    font-size: 12px;
  }
</style>

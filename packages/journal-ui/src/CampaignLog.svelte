<script lang="ts">
  import type { Campaign } from '@open-tabletop/campaign'
  import { placeUrl } from '@open-tabletop/character-ui'
  import {
    addNote,
    campaignLog,
    editNote,
    emptyJournal,
    endSession,
    openSession,
    removeItem,
    startSession,
    type CampaignJournal,
    type LogLine,
  } from '@open-tabletop/journal'
  import { JOURNAL_LEVELS, type JournalLevel } from '@open-tabletop/session'
  import { onAnyJournalChange } from '@open-tabletop/storage'
  import type { Calendar } from '@open-tabletop/time'
  import { BeatView, translator as travelTranslator } from '@open-tabletop/travel-ui'
  import {
    confirmAction,
    downloadText,
    fileNameOf,
    InfoTip,
    Markdown,
    tooltip,
  } from '@open-tabletop/ui-kit'
  import { translator } from './i18n'
  import { changeCampaignJournal, readCampaignJournal } from './journal'
  import {
    lineClock,
    lineText,
    logMarkdown,
    logPlaces,
    momentAt,
    sessionTitle,
    shownLog,
    type LogWords,
  } from './log'

  /**
   * The campaign's journal read as its log (docs/notes-and-journal.md §2): everything played
   * in it by game time, newest first, by session and day: its trips' and scenes' moments,
   * the world's timeline, the Oracle's hand rolls and the player's notes; sessions started
   * and ended, notes written anywhere in it, and its Markdown export.
   */
  let {
    campaign,
    calendar,
    locale,
    nameOf,
  }: {
    campaign: Campaign
    calendar: Calendar
    locale: string
    /** Display name of an Oracle definition by id (a hand roll's table). */
    nameOf: (id: string) => string
  } = $props()

  const t = translator(() => locale)
  const tt = travelTranslator(() => locale)

  let journal = $state<CampaignJournal | undefined>()
  $effect(() => {
    const id = campaign.id
    let gone = false
    const read = () =>
      void readCampaignJournal(id).then(
        (read) => {
          if (!gone) journal = read
        },
        () => {
          if (!gone) journal = emptyJournal(id)
        },
      )
    read()
    const stop = onAnyJournalChange((change) => {
      if (change.type === 'many' || change.id === id) read()
    })
    return () => {
      gone = true
      stop()
    }
  })

  let level = $state<JournalLevel>('story')
  let from = $state('')
  let search = $state('')

  const words = $derived<LogWords>({ locale, calendar, nameOf })
  const log = $derived(
    journal
      ? campaignLog(journal, campaign.world?.timeline ?? [], campaign.oracle?.history ?? [])
      : [],
  )
  const places = $derived(logPlaces(log))
  const shown = $derived(shownLog(log, { level, from, search }, words))
  const going = $derived(journal && openSession(journal))
  const anything = $derived(log.some((s) => s.lines.length))

  /** The game's time now: the world clock's (0 while it hasn't started). */
  const now = () => campaign.world?.time ?? 0
  const at = () => new Date().toISOString()
  const change = (update: (journal: CampaignJournal) => CampaignJournal) =>
    void changeCampaignJournal(campaign, update).catch(console.error)

  /** Sessions shown unfolded: the newest; the others by hand. */
  let unfolded = $state<Record<string, boolean>>({})
  /** Moments folded or unfolded by hand: an important one starts unfolded. */
  let momentsOpen = $state<Record<string, boolean>>({})

  /** Where a note is being written: after a line (its key), or `top` (at the game's time now). */
  let writing = $state<{ where: string; time: number } | undefined>()
  let draft = $state('')
  /** The note being changed, by id. */
  let editing = $state<string | undefined>()

  const lineKey = (line: LogLine): string =>
    line.kind === 'moment'
      ? line.moment.id
      : line.kind === 'note'
        ? line.note.id
        : line.kind === 'world'
          ? `w-${line.entry.id}`
          : `o-${line.roll.id}`

  function writeAt(where: string, time: number) {
    writing = { where, time }
    draft = ''
    editing = undefined
  }

  function saveNote() {
    const text = draft.trim()
    const place = writing
    writing = undefined
    if (!text || !place) return
    change((j) => addNote(j, { time: place.time, at: at(), text }))
  }

  function saveEdit(id: string) {
    const text = draft.trim()
    editing = undefined
    if (text) change((j) => editNote(j, id, text, at()))
  }

  async function remove(id: string) {
    if (await confirmAction(t('log.removeAsk'), { title: t('log.removeTitle'), danger: true }))
      change((j) => removeItem(j, id))
  }

  function exportLog() {
    const title = campaign.name || t('log.untitled')
    downloadText(fileNameOf(title, 'md'), logMarkdown(shown, title, words, level))
  }
</script>

{#snippet noteForm(onsave: () => void)}
  <form
    class="note-form"
    onsubmit={(e) => {
      e.preventDefault()
      onsave()
    }}
  >
    <!-- svelte-ignore a11y_autofocus -->
    <textarea
      rows="3"
      bind:value={draft}
      placeholder={t('log.notePlaceholder')}
      aria-label={t('log.note')}
      autofocus
      onkeydown={(e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onsave()
        if (e.key === 'Escape') {
          writing = undefined
          editing = undefined
        }
      }}></textarea>
    <div class="buttons">
      <button
        type="button"
        class="button"
        onclick={() => ((writing = undefined), (editing = undefined))}>{t('log.cancel')}</button
      >
      <button type="submit" class="button primary" disabled={!draft.trim()}>{t('log.save')}</button>
    </div>
  </form>
{/snippet}

{#snippet here(line: LogLine)}
  <button class="link here" onclick={() => writeAt(lineKey(line), line.time)}
    >+ {t('log.noteHere')}</button
  >
{/snippet}

{#snippet lineView(line: LogLine)}
  {#if line.kind === 'moment'}
    {@const told = momentAt(line, locale, level)}
    {@const url = placeUrl(line.moment.from)}
    <div class="moment">
      <BeatView
        told={{ ...told, id: line.moment.id, first: line.moment.entries[0]! }}
        {locale}
        clock={lineClock(line, calendar)}
        foldable
        bind:folded={
          () => !(momentsOpen[line.moment.id] ?? told.notable),
          (folded) => (momentsOpen = { ...momentsOpen, [line.moment.id]: !folded })
        }
      />
      <div class="side">
        {#if url}
          <a class="from" href={url} use:tooltip={t('log.open', { name: line.moment.from.name })}
            >{line.moment.from.name || t('log.untitled')}</a
          >
        {:else}
          <span class="from">{line.moment.from.name}</span>
        {/if}
        {@render here(line)}
      </div>
    </div>
  {:else if line.kind === 'note'}
    {#if editing === line.note.id}
      {@render noteForm(() => saveEdit(line.note.id))}
    {:else}
      <div class="line note">
        <time>{lineClock(line, calendar)}</time>
        <span class="mark" aria-label={t('log.note')}>✎</span>
        <div class="text"><Markdown text={line.note.text} /></div>
        <span class="actions">
          <button
            class="icon"
            aria-label={t('log.edit')}
            use:tooltip={t('log.edit')}
            onclick={() => {
              editing = line.note.id
              writing = undefined
              draft = line.note.text
            }}>✎</button
          >
          <button
            class="icon"
            aria-label={t('log.remove')}
            use:tooltip={t('log.remove')}
            onclick={() => remove(line.note.id)}>×</button
          >
        </span>
      </div>
    {/if}
  {:else}
    <div class="line {line.kind}">
      <time>{lineClock(line, calendar)}</time>
      <span class="mark" aria-label={line.kind === 'world' ? t('log.world') : t('log.oracle')}
        >{line.kind === 'world' ? '◆' : '?'}</span
      >
      <span class="text">{lineText(line, words, level)}</span>
      {@render here(line)}
    </div>
  {/if}
{/snippet}

<section class="log">
  <div class="bar">
    <div class="session">
      {#if going}
        <button class="button" onclick={() => change((j) => endSession(j, now(), at()))}
          >{t('log.endSession')}</button
        >
      {:else}
        <button class="button primary" onclick={() => change((j) => startSession(j, now(), at()))}
          >▶ {t('log.startSession')}</button
        >
      {/if}
      <InfoTip markdown={t('log.sessionHelp')} />
    </div>
    <div class="levels" role="radiogroup" aria-label={tt('filter.level')}>
      <span class="label">{tt('filter.level')}<InfoTip markdown={tt('filter.levelHelp')} /></span>
      {#each JOURNAL_LEVELS as each (each)}
        <button
          role="radio"
          aria-checked={level === each}
          class:on={level === each}
          onclick={() => (level = each)}>{tt(`filter.levels.${each}`)}</button
        >
      {/each}
    </div>
    {#if places.length > 1}
      <label class="from-filter"
        ><span>{t('log.from')}<InfoTip markdown={t('log.fromHelp')} /></span>
        <select bind:value={from}>
          <option value="">{t('log.everywhere')}</option>
          {#each places as place (place.key)}
            <option value={place.key}>{place.name || t('log.untitled')}</option>
          {/each}
        </select>
      </label>
    {/if}
    <input
      class="search"
      type="search"
      bind:value={search}
      placeholder={tt('filter.search')}
      aria-label={tt('filter.search')}
    />
    <button class="button" disabled={!anything} use:tooltip={t('log.exportTip')} onclick={exportLog}
      >{t('log.export')}</button
    >
  </div>

  {#if writing?.where === 'top'}
    {@render noteForm(saveNote)}
  {:else}
    <button class="link write" onclick={() => writeAt('top', now())}>+ {t('log.writeNote')}</button>
  {/if}

  {#if !journal}
    <p class="hint">…</p>
  {:else if !anything}
    <p class="hint">{t('log.empty')}</p>
  {:else if !shown.some((s) => s.days.length)}
    <p class="hint">{tt('filter.none')}</p>
  {/if}

  {#each shown as part, i (part.session?.id ?? 'outside')}
    {@const key = part.session?.id ?? 'outside'}
    {@const open = unfolded[key] ?? i === 0}
    <section class="part">
      <h3>
        <button
          class="fold"
          aria-expanded={open}
          onclick={() => (unfolded = { ...unfolded, [key]: !open })}
          ><span class="arrow" aria-hidden="true">{open ? '▾' : '▸'}</span>{sessionTitle(
            part,
            locale,
          )}</button
        >
        {#if part.session && !part.session.end}<span class="going">{t('log.going')}</span>{/if}
      </h3>
      {#if open}
        {#each part.days as day (day.day)}
          <h4 class="overline">{day.text}</h4>
          <ol>
            {#each day.lines as line (lineKey(line))}
              <li>
                {@render lineView(line)}
                {#if writing?.where === lineKey(line)}
                  {@render noteForm(saveNote)}
                {/if}
              </li>
            {/each}
          </ol>
        {/each}
      {/if}
    </section>
  {/each}
</section>

<style>
  .log {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 900px;
  }

  .bar {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 16px;
    align-items: center;
  }

  .session {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .levels {
    display: flex;
    align-items: center;
    font-size: 13px;
  }

  .levels .label {
    margin-right: 6px;
    color: var(--text-muted);
  }

  .levels button {
    padding: 4px 10px;
    font-size: 13px;
    color: var(--text-muted);
    background: var(--bg);
    border: 1px solid var(--panel-border);
    cursor: pointer;
  }

  .levels button + button {
    border-left: none;
  }

  .levels button:first-of-type {
    border-radius: 6px 0 0 6px;
  }

  .levels button:last-of-type {
    border-radius: 0 6px 6px 0;
  }

  .levels button.on {
    color: var(--accent);
    border-color: var(--accent);
  }

  .from-filter {
    display: flex;
    gap: 6px;
    align-items: center;
    font-size: 13px;
    color: var(--text-muted);
  }

  .search {
    flex: 1;
    min-width: 140px;
  }

  .write {
    align-self: flex-start;
    font-size: 13px;
  }

  .part {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  h3 {
    display: flex;
    gap: 10px;
    align-items: baseline;
    margin: 6px 0 0;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--panel-border);
  }

  .fold {
    padding: 0;
    font: inherit;
    color: inherit;
    background: none;
    border: none;
    cursor: pointer;
  }

  .fold:hover {
    color: var(--accent);
  }

  .arrow {
    display: inline-block;
    width: 1.1em;
    color: var(--text-muted);
  }

  .going {
    font-size: 12px;
    font-weight: normal;
    color: var(--good);
  }

  h4 {
    margin: 8px 0 0;
  }

  ol {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .moment {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
    align-items: start;
    padding: 6px 8px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
  }

  .from {
    font-size: 11px;
    color: var(--text-muted);
    white-space: nowrap;
  }

  a.from:hover {
    color: var(--accent);
  }

  .line {
    display: grid;
    grid-template-columns: auto 1.2em 1fr auto;
    gap: 8px;
    align-items: baseline;
    padding: 2px 8px;
    font-size: 12px;
  }

  .line time {
    color: var(--text-muted);
    font-family: ui-monospace, monospace;
  }

  .mark {
    text-align: center;
    color: var(--text-muted);
  }

  .world .mark {
    color: var(--accent);
  }

  .world .text {
    color: var(--accent);
  }

  .oracle .mark {
    font-weight: 700;
    color: var(--warning-text);
  }

  .note {
    padding: 6px 8px;
    border-left: 3px solid var(--accent);
  }

  .note .text {
    font-size: 13px;
    font-style: italic;
  }

  .note .text :global(p) {
    margin: 0;
  }

  .actions {
    display: flex;
    gap: 4px;
    visibility: hidden;
  }

  .note:hover .actions,
  .note:focus-within .actions {
    visibility: visible;
  }

  .actions .icon {
    height: 24px;
  }

  .side {
    display: flex;
    flex-direction: row-reverse;
    gap: 10px;
    align-items: baseline;
  }

  .here {
    font-size: 11px;
    white-space: nowrap;
    visibility: hidden;
  }

  .moment:hover .here,
  .line:hover .here,
  .here:focus {
    visibility: visible;
  }

  .note-form {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-width: 700px;
  }

  .note-form textarea {
    width: 100%;
    font: inherit;
    font-size: 13px;
  }

  .buttons {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
  }
</style>

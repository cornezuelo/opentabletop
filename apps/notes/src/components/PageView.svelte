<script lang="ts">
  import { pageTitle, type NotePage } from '@open-tabletop/notes'
  import { NoteEditor, NoteLinks, NoteView, suggestTexts } from '@open-tabletop/notes-ui'
  import {
    campaignUrl,
    confirmAction,
    InfoTip,
    Markdown,
    MoreMenu,
    showToast,
    tooltip,
  } from '@open-tabletop/ui-kit'
  import { t, ui } from '../lib/i18n'
  import { go } from '../lib/nav.svelte'
  import {
    campaignName,
    changePage,
    journalLines,
    linkIn,
    moveToCampaign,
    newPageIn,
    notes,
    removePage,
    renameTo,
  } from '../lib/notes.svelte'
  import { editing } from '../lib/editing.svelte'

  /**
   * A page: its path and title (changing it moves the page, and the links that reached it),
   * its campaign, the page read with its links or written (**Edit**, Ctrl+E), and beside it
   * what links here, what of the game it has to do with, and where it's named unlinked.
   */
  let { id, heading }: { id: string; heading?: string } = $props()

  const page = $derived(notes.pages.find((p) => p.id === id))
  /** The path as typed; the page's again whenever the page changes. */
  let path = $derived(page?.path ?? '')

  let journal = $state<string[]>([])
  $effect(() => {
    const shown = page
    if (!shown) return
    void journalLines(shown).then((lines) => (journal = lines))
  })

  // A page just made, with nothing in it, opens to be written.
  $effect(() => {
    if (page && !page.body && page.created === page.modified) editing.on = true
  })

  // A link to a heading scrolls to it.
  $effect(() => {
    if (!heading || editing.on) return
    queueMicrotask(() => document.getElementById(heading)?.scrollIntoView({ block: 'start' }))
  })

  async function rename(current: NotePage) {
    const before = notes.pages.filter((p) => p.id !== current.id).map((p) => p.body)
    if (!(await renameTo(current, path))) {
      showToast(t('page.taken', { path }), 'error')
      path = current.path
      return
    }
    const after = notes.pages.filter((p) => p.id !== current.id).map((p) => p.body)
    const changed = after.filter((body, i) => body !== before[i]).length
    if (changed) showToast(t('page.renamed', { n: changed }))
  }

  async function remove(current: NotePage) {
    if (
      !(await confirmAction(t('page.deleteAsk', { title: pageTitle(current) }), {
        confirm: t('page.delete'),
      }))
    )
      return
    await removePage(current)
    showToast(t('page.deleted'))
    go({ name: 'welcome' }, true)
  }

  function openPage(target: string, at?: string) {
    go({ name: 'page', id: target, ...(at ? { heading: at } : {}) })
  }

  const campaigns = $derived(
    Object.entries(notes.index.campaigns).sort(([, a], [, b]) => a.localeCompare(b)),
  )
</script>

{#if page}
  <div class="page">
    <header>
      <label class="path">
        <span class="overline">{t('page.title')}<InfoTip text={t('page.titleHelp')} /></span>
        <input
          bind:value={path}
          aria-label={t('page.title')}
          onchange={() => rename(page)}
          onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      </label>
      <label class="campaign">
        <span>{t('page.campaign')}<InfoTip text={t('page.campaignHelp')} /></span>
        <select
          value={page.campaign ?? ''}
          onchange={(e) => moveToCampaign(page, e.currentTarget.value || undefined)}
        >
          <option value="">{ui('general')}</option>
          {#each campaigns as [cid, name] (cid)}<option value={cid}>{name}</option>{/each}
          {#if page.campaign && !notes.index.campaigns[page.campaign]}
            <option value={page.campaign}>{campaignName(page.campaign)}</option>
          {/if}
        </select>
      </label>
      <div class="modes" role="group">
        <button
          class:on={!editing.on}
          aria-pressed={!editing.on}
          onclick={() => (editing.on = false)}
          use:tooltip={t('page.readTip')}>{t('page.read')}</button
        >
        <button
          class:on={editing.on}
          aria-pressed={editing.on}
          onclick={() => (editing.on = true)}
          use:tooltip={t('page.editTip')}>{t('page.edit')}</button
        >
      </div>
      <MoreMenu label={t('page.more')}>
        <button class="danger" onclick={() => remove(page)}>{t('page.delete')}</button>
      </MoreMenu>
    </header>
    <div class="body">
      <main class:writing={editing.on}>
        {#if editing.on}
          {#key page.id}
            <NoteEditor
              value={page.body}
              pages={notes.pages}
              index={notes.index}
              campaign={page.campaign}
              texts={suggestTexts(ui)}
              placeholder={t('page.placeholder')}
              label={t('page.editorLabel')}
              onchange={(body) => changePage(page, { body })}
            />
          {/key}
        {:else if page.body.trim()}
          <NoteView
            body={page.body}
            pages={notes.pages}
            index={notes.index}
            from={page}
            onpage={openPage}
            onnew={(target) => newPageIn(page.campaign, '', target)}
          />
        {:else}
          <p class="hint"><Markdown text={t('page.empty')} /></p>
        {/if}
      </main>
      <aside>
        <NoteLinks
          {page}
          pages={notes.pages}
          index={notes.index}
          {journal}
          journalUrl={page.campaign ? campaignUrl(page.campaign, 'log') : undefined}
          t={ui}
          onpage={(target) => openPage(target)}
          onlink={async (other) => {
            await linkIn(other, page)
            showToast(t('page.linked', { n: 1 }))
          }}
        />
      </aside>
    </div>
  </div>
{:else if notes.loaded}
  <p class="hint missing">{t('page.missing')}</p>
{/if}

<style>
  .page {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  header {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    padding: 10px 16px;
    border-bottom: 1px solid var(--panel-border);
  }

  .path {
    display: flex;
    flex: 1 1 280px;
    flex-direction: column;
    min-width: 0;
  }

  .path input {
    width: 100%;
    padding: 4px 6px;
    font-size: 1.35em;
    font-weight: 600;
    color: var(--text);
    background: none;
    border: 1px solid transparent;
    border-radius: 4px;
  }

  .path input:hover,
  .path input:focus {
    border-color: var(--panel-border);
  }

  .campaign {
    display: flex;
    gap: 6px;
    align-items: center;
    color: var(--text-muted);
    font-size: 0.9em;
  }

  .modes {
    display: flex;
  }

  .modes button {
    border-radius: 0;
  }

  .modes button:first-child {
    border-radius: 4px 0 0 4px;
  }

  .modes button:last-child {
    border-radius: 0 4px 4px 0;
  }

  .modes .on {
    color: var(--bg);
    background: var(--accent);
    border-color: var(--accent);
  }

  .body {
    display: grid;
    flex: 1;
    grid-template-columns: minmax(0, 1fr) 280px;
    min-height: 0;
  }

  main {
    min-height: 0;
    padding: 16px 24px;
    overflow: auto;
  }

  main.writing {
    padding: 0 12px;
    overflow: hidden;
  }

  aside {
    min-height: 0;
    padding: 16px 12px;
    overflow: auto;
    border-left: 1px solid var(--panel-border);
  }

  .missing {
    padding: 24px;
  }

  @media (width < 900px) {
    .body {
      grid-template-columns: 1fr;
      overflow: auto;
    }

    aside {
      border-top: 1px solid var(--panel-border);
      border-left: none;
    }
  }
</style>

<script lang="ts">
  import { pageFolder, pageTitle, searchPages } from '@open-tabletop/notes'
  import { examplePages, NoteTree } from '@open-tabletop/notes-ui'
  import {
    ask,
    downloadBytes,
    MoreMenu,
    playing,
    showToast,
    SideButtons,
    SideItem,
    SideList,
    Sidebar,
    tooltip,
  } from '@open-tabletop/ui-kit'
  import { getLocale, t, ui } from '../lib/i18n'
  import { go, nav } from '../lib/nav.svelte'
  import {
    campaignName,
    exportZip,
    newPageIn,
    notes,
    planImport,
    readChosen,
    sections,
    writeImport,
  } from '../lib/notes.svelte'

  /**
   * The left column: **New page**, a search over every page, and the tree of pages by
   * campaign (the one being played first); **⋯** exports and imports them as .md files and
   * adds the packs' example pages.
   */
  let query = $state('')
  let file: HTMLInputElement
  let searchBox: HTMLInputElement

  const hits = $derived(query.trim() ? searchPages(notes.pages, query) : [])
  const selected = $derived(nav.view.name === 'page' ? nav.view.id : undefined)
  const examples = $derived(examplePages(getLocale()))

  /** Focuses the search (its shortcut). */
  export function focusSearch(): void {
    searchBox?.focus()
    searchBox?.select()
  }

  function exportAll() {
    const day = new Date().toISOString().slice(0, 10)
    downloadBytes(`opentabletop-notes-${day}.zip`, exportZip())
  }

  async function importFiles(chosen: File[]) {
    const files = await readChosen(chosen)
    const { put, replaced } = planImport(files, playing.id)
    if (!put.length) return showToast(t('importNone'), 'error')
    if (replaced) {
      const choice = await ask(t('nav.import'), t('importAsk', { n: put.length, replaced }), [
        { value: 'cancel', label: t('cancel') },
        { value: 'import', label: t('importButton'), kind: 'primary' },
      ])
      if (choice !== 'import') return
    }
    await writeImport(put)
    showToast(t('imported', { n: put.length, replaced }))
  }

  async function addExamples(files: Record<string, string>) {
    const { put } = planImport(files, playing.id)
    await writeImport(put)
    showToast(t('examplesAdded', { n: put.length }))
  }
</script>

<Sidebar>
  <SideButtons>
    <button class="primary" onclick={() => newPageIn(playing.id)}>{t('nav.newPage')}</button>
    <MoreMenu label={t('nav.more')}>
      <button onclick={exportAll} disabled={!notes.pages.length} use:tooltip={t('nav.exportTip')}
        >{t('nav.export')}</button
      >
      <button onclick={() => file.click()} use:tooltip={t('nav.importTip')}
        >{t('nav.import')}</button
      >
      {#each examples as example (example.pack)}
        <button onclick={() => addExamples(example.files)}
          >{t('nav.examples')} {example.name}</button
        >
      {/each}
    </MoreMenu>
  </SideButtons>
  <input
    bind:this={file}
    type="file"
    accept=".zip,.md,application/zip,text/markdown"
    multiple
    hidden
    onchange={(e) => {
      const chosen = [...(e.currentTarget.files ?? [])]
      e.currentTarget.value = ''
      if (chosen.length) void importFiles(chosen)
    }}
  />
  <input
    bind:this={searchBox}
    class="side-search"
    type="search"
    placeholder={t('nav.search')}
    aria-label={t('nav.searchLabel')}
    bind:value={query}
  />
  {#if query.trim()}
    <SideList>
      {#each hits as hit (hit.page.id)}
        <SideItem
          name={pageTitle(hit.page)}
          detail={hit.snippet ??
            [campaignName(hit.page.campaign), pageFolder(hit.page)].filter(Boolean).join(' / ')}
          selected={hit.page.id === selected}
          onclick={() => go({ name: 'page', id: hit.page.id })}
        />
      {:else}
        <p class="side-help">{t('nav.noMatch')}</p>
      {/each}
    </SideList>
  {:else}
    <NoteTree
      sections={sections()}
      pages={notes.pages}
      {selected}
      t={ui}
      onopen={(page) => go({ name: 'page', id: page.id })}
      onnew={(campaign, folder) => newPageIn(campaign, folder)}
    />
  {/if}
</Sidebar>

<script lang="ts">
  import { TemplateEditor } from '@open-tabletop/character-ui'
  import { systemName, type TravelSystem } from '@open-tabletop/session'
  import type { TemplateDef } from '@open-tabletop/character-engine'
  import { confirmAction, InfoTip, showToast } from '@open-tabletop/ui-kit'
  import {
    bestiarySource,
    canEdit,
    deleteTemplate,
    freeTemplateId,
    makeCopies,
    saveTemplate,
    templatesOf,
  } from '../lib/bestiary'
  import { getLocale, t } from '../lib/i18n'
  import { go } from '../lib/nav.svelte'
  import { library, systems } from '../lib/packs.svelte'

  /**
   * The bestiary of a system: its templates (creatures, kinds of people), each a character
   * of a sheet whose rolls are made again for every copy. Make copies as roster characters,
   * and, in a pack of the user's, change them (a bundled pack is copied first).
   */
  let chosen = $state(systems.list[0]?.id ?? '')
  const system = $derived<TravelSystem | undefined>(systems.list.find((s) => s.id === chosen))
  const entries = $derived(system ? templatesOf(system, getLocale()) : [])
  let search = $state('')
  let picked = $state('')
  const shown = $derived.by(() => {
    const wanted = search.trim().toLowerCase()
    return entries.filter(
      (e) =>
        !wanted ||
        `${e.name} ${e.id} ${(e.def.tags ?? []).join(' ')}`.toLowerCase().includes(wanted),
    )
  })
  const entry = $derived(entries.find((e) => `${e.bestiary}:${e.id}` === picked) ?? shown[0])
  const editable = $derived(!!entry && canEdit(entry.bestiary))
  const itemIds = $derived([
    ...new Set((system?.items ?? []).flatMap((c) => Object.keys(c.def.items))),
  ])
  let count = $state(1)
  /** The user's bestiary a new template goes in: the first the system has in a user pack. */
  const own = $derived((system?.bestiary ?? []).find((b) => canEdit(b.id))?.id)

  function change(next: TemplateDef) {
    if (entry) saveTemplate(entry.bestiary, entry.id, next)
  }
  function copyPack() {
    const source = entry && bestiarySource(entry.bestiary)
    if (source) library.editCopy(source.root)
  }
  function add() {
    if (!own) return
    const b = system!.bestiary!.find((x) => x.id === own)!
    const id = freeTemplateId(Object.keys(b.def.templates), 'creature')
    if (saveTemplate(own, id, { name: t('bestiary.newName') })) picked = `${own}:${id}`
  }
  async function remove() {
    if (!entry) return
    if (
      !(await confirmAction(t('bestiary.confirmDelete', { name: entry.name }), {
        confirm: t('bestiary.delete'),
        danger: true,
      }))
    )
      return
    deleteTemplate(entry.bestiary, entry.id)
    picked = ''
  }
  function make() {
    if (!system || !entry) return
    const ids = makeCopies(system, entry.id, entry.name, Math.max(1, Math.floor(count) || 1))
    if (!ids.length) return showToast(t('bestiary.cantMake'), 'error')
    showToast(t('bestiary.made', { count: ids.length, name: entry.name }))
    if (ids.length === 1) go({ name: 'character', id: ids[0] })
  }
</script>

<h1>{t('bestiary.title')}<InfoTip markdown={t('bestiary.help')} /></h1>
{#if systems.list.length}
  <div class="bar">
    <label>
      <span>{t('new.system')}</span>
      <select bind:value={chosen}>
        {#each systems.list as s (s.id)}
          <option value={s.id}>{systemName(s, getLocale())}</option>
        {/each}
      </select>
    </label>
    <input
      type="search"
      placeholder={t('nav.search')}
      aria-label={t('nav.search')}
      bind:value={search}
    />
    {#if own}<button onclick={add}>{t('bestiary.add')}</button>{/if}
  </div>
  {#if entries.length}
    <div class="split">
      <ul class="list">
        {#each shown as e (`${e.bestiary}:${e.id}`)}
          <li>
            <button
              class:selected={entry && e.bestiary === entry.bestiary && e.id === entry.id}
              onclick={() => (picked = `${e.bestiary}:${e.id}`)}
            >
              <span class="name">{e.name}</span>
              <span class="tags">{(e.def.tags ?? []).join(', ')}</span>
            </button>
          </li>
        {:else}
          <li class="none">{t('nav.noMatch')}</li>
        {/each}
      </ul>
      {#if entry}
        <section class="detail">
          <h2>{entry.name} <code>present.{entry.id}</code></h2>
          <div class="make">
            <label>
              <span>{t('bestiary.count')}</span>
              <input type="number" min="1" bind:value={count} />
            </label>
            <button class="primary" onclick={make} disabled={!entry.sheet}
              >{t('bestiary.make')}</button
            >
          </div>
          {#if !editable}
            <p class="help">{t('bestiary.readOnly', { pack: entry.bestiary.split('/')[0] })}</p>
            <button onclick={copyPack}>{t('bestiary.editCopy')}</button>
          {/if}
          {#if entry.sheet}
            {#key `${entry.bestiary}:${entry.id}:${editable}`}
              <TemplateEditor
                sheet={entry.sheet}
                template={entry.def}
                locale={getLocale()}
                disabled={!editable}
                others={entry.others}
                items={itemIds}
                onchange={change}
              />
            {/key}
          {:else}
            <p class="help">{t('bestiary.noSheet')}</p>
          {/if}
          {#if editable}<button class="danger" onclick={remove}>{t('bestiary.delete')}</button>{/if}
        </section>
      {/if}
    </div>
  {:else}
    <p class="help">{t('bestiary.none')}</p>
  {/if}
{:else}
  <p class="help">{t('new.noSystems')}</p>
{/if}

<style>
  h1 {
    margin: 0 0 12px;
    font-family: Georgia, serif;
    font-weight: normal;
  }

  .bar {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: end;
    margin-bottom: 12px;
  }

  .bar label,
  .make label {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .split {
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    gap: 18px;
    align-items: start;
  }

  .list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .list button {
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 6px 8px;
    text-align: left;
    background: none;
    border: 1px solid transparent;
    border-radius: 6px;
    cursor: pointer;
  }

  .list button.selected {
    border-color: var(--accent);
    background: var(--panel);
  }

  .tags,
  .none,
  .help {
    font-size: 12px;
    color: var(--text-muted);
  }

  .detail {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 900px;
  }

  .detail h2 {
    margin: 0;
    font-size: 16px;
  }

  .make {
    display: flex;
    gap: 10px;
    align-items: end;
  }

  .make input {
    width: 70px;
  }

  .help {
    margin: 0;
  }

  .danger {
    align-self: start;
  }

  @media (max-width: 800px) {
    .split {
      grid-template-columns: 1fr;
    }
  }
</style>

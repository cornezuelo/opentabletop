<script lang="ts">
  import { roster, sheetText, TemplateEditor } from '@open-tabletop/character-ui'
  import { systemName, tagsInUse } from '@open-tabletop/session'
  import type { TemplateDef } from '@open-tabletop/character-engine'
  import { PackNotice } from '@open-tabletop/pack-ui'
  import { confirmAction, InfoTip, Markdown, showToast } from '@open-tabletop/ui-kit'
  import {
    bestiarySource,
    canEdit,
    copiesOf,
    deleteCopies,
    deleteTemplate,
    makeCopies,
    saveTemplate,
    templatesOf,
  } from '../lib/bestiary'
  import { getLocale, t } from '../lib/i18n'
  import { go } from '../lib/nav.svelte'
  import { library, systems } from '../lib/packs.svelte'

  /**
   * A template of a system's bestiary (picked in the left column's **Bestiary**): a character
   * of a sheet whose rolls are made again for every copy. Make one character of it, or many
   * copies, in the roster, and clear them away; in a pack of the user's, change it (a bundled
   * pack is copied first). With no template given, what the bestiary is.
   */
  let { bestiary, template }: { bestiary?: string; template?: string } = $props()

  const system = $derived(systems.list.find((s) => s.bestiary?.some((b) => b.id === bestiary)))
  const entry = $derived(
    system &&
      templatesOf(system, getLocale()).find((e) => e.bestiary === bestiary && e.id === template),
  )
  const source = $derived(entry && bestiarySource(entry.bestiary))
  const editable = $derived(!!entry && canEdit(entry.bestiary))
  const itemIds = $derived([
    ...new Set((system?.items ?? []).flatMap((c) => Object.keys(c.def.items))),
  ])
  const copies = $derived(entry ? copiesOf(entry) : [])
  const any = $derived(systems.list.some((s) => s.bestiary?.length))
  let count = $state(3)

  function change(next: TemplateDef) {
    if (entry) saveTemplate(entry.bestiary, entry.id, next, entry.def, getLocale())
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
    go({ name: 'bestiary' }, true)
  }
  function make(how: number) {
    if (!system || !entry) return
    const ids = makeCopies(system, entry, Math.max(1, Math.floor(how) || 1), getLocale())
    if (!ids.length) return showToast(t('bestiary.cantMake'), 'error')
    if (ids.length === 1) return go({ name: 'character', id: ids[0] })
    showToast(t('bestiary.made', { count: ids.length, name: entry.name }))
  }
  async function clear() {
    if (!entry) return
    const playing = copies.filter((e) => e.playing).length
    const question = t(playing ? 'bestiary.confirmClearPlaying' : 'bestiary.confirmClear', {
      count: copies.length,
      name: entry.name,
      playing,
    })
    if (!(await confirmAction(question, { confirm: t('bestiary.clear'), danger: true }))) return
    showToast(t('bestiary.cleared', { count: deleteCopies(entry), name: entry.name }))
  }
</script>

{#if entry && system}
  <section class="detail">
    <h1 class="page-title">{entry.name}<InfoTip markdown={t('bestiary.help')} /></h1>
    <p class="where">
      {systemName(system, getLocale())} · {entry.sheet
        ? (sheetText(entry.sheet.name, getLocale()) ?? entry.sheetId)
        : entry.sheetId} · <code>present.{entry.id}</code>
    </p>

    <div class="roster">
      <span class="label"
        >{t('bestiary.inRoster')}<InfoTip markdown={t('bestiary.inRosterHelp')} /></span
      >
      <div class="make">
        <button class="primary" onclick={() => make(1)} disabled={!entry.sheet}
          >{t('bestiary.makeOne')}</button
        >
        <span class="or">{t('bestiary.or')}</span>
        <input
          type="number"
          min="2"
          aria-label={t('bestiary.count')}
          bind:value={count}
          disabled={!entry.sheet}
        />
        <button onclick={() => make(count)} disabled={!entry.sheet}>{t('bestiary.makeMany')}</button
        >
      </div>
      {#if copies.length}
        <p class="copies">
          {t('bestiary.copies', { count: copies.length })}
          <button class="danger" onclick={clear}>{t('bestiary.clear')}</button>
        </p>
      {/if}
    </div>

    {#if source}
      <PackNotice
        {library}
        root={source.root}
        locale={getLocale()}
        texts={{ readOnly: t('bestiary.readOnly', { pack: source.root }) }}
      />
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
          tagChoices={tagsInUse(system, roster.roster)}
          onchange={change}
        />
      {/key}
    {:else}
      <p class="help">{t('bestiary.noSheet')}</p>
    {/if}
    {#if editable}<button class="danger start" onclick={remove}>{t('bestiary.delete')}</button>{/if}
  </section>
{:else}
  <h1 class="page-title">{t('bestiary.title')}</h1>
  <div class="help">
    <Markdown
      text={template ? t('bestiary.notFound') : any ? t('bestiary.intro') : t('bestiary.none')}
    />
  </div>
{/if}

<style>
  .detail {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 900px;
  }

  .detail h1 {
    margin: 0;
  }

  .where {
    margin: -8px 0 0;
    font-size: 13px;
    color: var(--text-muted);
  }

  .roster {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .label {
    font-size: 12px;
    color: var(--text-muted);
  }

  .make {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .make input {
    width: 60px;
  }

  .or,
  .copies,
  .help {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  }

  .copies button {
    margin-left: 6px;
    padding: 0;
    font-size: 13px;
    text-decoration: underline;
    background: none;
    border: none;
    cursor: pointer;
  }

  .danger {
    color: var(--danger, #d9534f);
  }

  .start {
    align-self: start;
  }
</style>

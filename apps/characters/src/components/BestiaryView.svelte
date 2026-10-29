<script lang="ts">
  import { TemplateEditor } from '@open-tabletop/character-ui'
  import { systemName } from '@open-tabletop/session'
  import type { TemplateDef } from '@open-tabletop/character-engine'
  import { confirmAction, InfoTip, Markdown, showToast } from '@open-tabletop/ui-kit'
  import {
    bestiarySource,
    canEdit,
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
   * of a sheet whose rolls are made again for every copy. Make copies as roster characters,
   * and, in a pack of the user's, change it (a bundled pack is copied first). With no
   * template given, what the bestiary is.
   */
  let { bestiary, template }: { bestiary?: string; template?: string } = $props()

  const system = $derived(systems.list.find((s) => s.bestiary?.some((b) => b.id === bestiary)))
  const entry = $derived(
    system &&
      templatesOf(system, getLocale()).find((e) => e.bestiary === bestiary && e.id === template),
  )
  const editable = $derived(!!entry && canEdit(entry.bestiary))
  const itemIds = $derived([
    ...new Set((system?.items ?? []).flatMap((c) => Object.keys(c.def.items))),
  ])
  const any = $derived(systems.list.some((s) => s.bestiary?.length))
  let count = $state(1)

  function change(next: TemplateDef) {
    if (entry) saveTemplate(entry.bestiary, entry.id, next, entry.def, getLocale())
  }
  function copyPack() {
    const source = entry && bestiarySource(entry.bestiary)
    if (source) library.editCopy(source.root)
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
  function make() {
    if (!system || !entry) return
    const ids = makeCopies(system, entry.id, entry.name, Math.max(1, Math.floor(count) || 1))
    if (!ids.length) return showToast(t('bestiary.cantMake'), 'error')
    showToast(t('bestiary.made', { count: ids.length, name: entry.name }))
    if (ids.length === 1) go({ name: 'character', id: ids[0] })
  }
</script>

{#if entry && system}
  <section class="detail">
    <h1 class="page-title">
      {entry.name}<InfoTip markdown={t('bestiary.help')} />
    </h1>
    <p class="where">
      {systemName(system, getLocale())} · <code>present.{entry.id}</code>
    </p>
    <div class="make">
      <label>
        <span>{t('bestiary.count')}</span>
        <input type="number" min="1" bind:value={count} />
      </label>
      <button class="primary" onclick={make} disabled={!entry.sheet}>{t('bestiary.make')}</button>
    </div>
    {#if !editable}
      <p class="help">{t('bestiary.readOnly', { pack: entry.bestiary.split('/')[0] })}</p>
      <button class="start" onclick={copyPack}>{t('bestiary.editCopy')}</button>
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

  .make {
    display: flex;
    gap: 10px;
    align-items: end;
  }

  .make label {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .make input {
    width: 70px;
  }

  .help {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  }

  .start {
    align-self: start;
  }
</style>

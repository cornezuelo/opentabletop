<script lang="ts">
  import { DEFAULT_STYLE_REF } from '@open-tabletop/map'
  import { copyStyle, definitionDoc, StyleForm, styleSource } from '@open-tabletop/pack-ui'
  import { localize } from '@open-tabletop/session'
  import { InfoTip, Markdown } from '@open-tabletop/ui-kit'
  import { SetStyleCommand } from '../lib/commands/settings'
  import { getLocale, t } from '../lib/i18n/index.svelte'
  import { library } from '../lib/play/packs'
  import { mapSystem } from '../lib/play/systems'
  import { loadedStyles } from '../lib/styles'
  import { editor } from '../lib/store/editor.svelte'

  /** The style the map is drawn in (Map settings → Style): a `kind: style` of a pack. */
  const styles = $derived(loadedStyles())
  const chosen = $derived(editor.meta.style ?? DEFAULT_STYLE_REF)
  const current = $derived(styles.find((s) => s.ref === chosen))
  const nameOf = (s: (typeof styles)[number]) => localize(s.style.name, getLocale(), 'en') || s.ref

  function choose(ref: string) {
    const found = loadedStyles().find((s) => s.ref === ref)
    if (found) editor.execute(new SetStyleCommand(found.ref, found.style))
  }

  /** Where the map's style is written, and whether it can be changed (a style of the user's). */
  const source = $derived(current ? styleSource(library, current.ref) : null)
  const editable = $derived(!!source && library.isEditable(source.root))
  /** The style's form, open below the picker: the map beside it shows each change. */
  let editing = $state(false)
  const doc = definitionDoc(library, getLocale, () => (editing && editable ? source : null))
  /** Terrains and kinds of connection to suggest: the map's, then its system's. */
  const terrains = $derived(editor.terrains.map((tt) => tt.id))
  const kinds = $derived([
    ...new Set([
      ...Object.keys(mapSystem().rules.connections ?? {}),
      ...editor.map.connections.map((c) => c.kind),
      ...(editor.meta.parent?.ways ?? []).flatMap((w) => (w.kind ? [w.kind] : [])),
    ]),
  ])

  /** A copy of the style, the user's to change, drawn on the map from now on. */
  function copy() {
    if (!current) return
    const ref = copyStyle(library, current.ref, getLocale())
    if (!ref) return
    choose(ref)
    editing = true
  }
</script>

<label class="field">
  <span>{t('mapStyle.label')}<InfoTip text={t('mapStyle.help')} /></span>
  <select value={chosen} onchange={(e) => choose(e.currentTarget.value)}>
    {#each styles as s (s.ref)}
      <option value={s.ref}>{nameOf(s)}</option>
    {/each}
    {#if !current}
      <option value={chosen}>{chosen}</option>
    {/if}
  </select>
</label>
{#if !current}
  <p class="help">{t('mapStyle.missing', { style: chosen })}</p>
{:else}
  {#if current.style.description}
    <div class="help">
      <Markdown text={localize(current.style.description, getLocale(), 'en') ?? ''} />
    </div>
  {/if}
  <div class="buttons">
    {#if editable}
      <button class="button" aria-pressed={editing} onclick={() => (editing = !editing)}
        >{editing ? t('mapStyle.done') : t('mapStyle.edit')}</button
      >
      <button class="button" onclick={() => choose(current.ref)}>{t('mapStyle.retake')}</button>
    {/if}
    <button class="button" onclick={copy}>{t('mapStyle.copy')}</button>
    <InfoTip text={t('mapStyle.editHelp')} />
  </div>
  {#if editing && editable}
    <StyleForm {doc} locale={getLocale()} {terrains} {kinds} />
  {/if}
{/if}

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  .help {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .help :global(p) {
    margin: 0 0 4px;
  }
</style>

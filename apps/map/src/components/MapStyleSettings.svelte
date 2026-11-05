<script lang="ts">
  import { DEFAULT_STYLE_REF } from '@open-tabletop/map'
  import { localize } from '@open-tabletop/session'
  import { InfoTip, Markdown } from '@open-tabletop/ui-kit'
  import { SetStyleCommand } from '../lib/commands/settings'
  import { getLocale, t } from '../lib/i18n/index.svelte'
  import { loadedStyles } from '../lib/styles'
  import { editor } from '../lib/store/editor.svelte'

  /** The style the map is drawn in (Map settings → Style): a `kind: style` of a pack. */
  const styles = $derived(loadedStyles())
  const chosen = $derived(editor.meta.style ?? DEFAULT_STYLE_REF)
  const current = $derived(styles.find((s) => s.ref === chosen))
  const nameOf = (s: (typeof styles)[number]) => localize(s.style.name, getLocale(), 'en') || s.ref

  function choose(ref: string) {
    const found = styles.find((s) => s.ref === ref)
    if (found) editor.execute(new SetStyleCommand(found.ref, found.style))
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
{:else if current.style.description}
  <div class="help">
    <Markdown text={localize(current.style.description, getLocale(), 'en') ?? ''} />
  </div>
{/if}

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
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

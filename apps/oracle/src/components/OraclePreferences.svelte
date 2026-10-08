<script lang="ts">
  import { helpMarkdown, Markdown } from '@open-tabletop/ui-kit'
  import { hiddenPacks, setHidden } from '../lib/hiddenPacks.svelte'
  import { t } from '../lib/i18n'
  import { oracleUi } from '../lib/oracle'
  import { manifestOf } from '../lib/packs/workspace'
  import { workspace } from '../lib/packs/workspace.svelte'

  /** The Oracle's own preferences, below the shared ones. Their help shows right below each
   * (the help column is behind the dialog). */
  const packs = $derived(
    workspace.packs
      .map((pack) => ({ id: manifestOf(pack).id, name: manifestOf(pack).name ?? pack.root }))
      .filter((p): p is { id: string; name: string } => !!p.id)
      .sort((a, b) => a.name.localeCompare(b.name)),
  )
</script>

<label>
  <span>{t('prefs.seed')}</span>
  <input
    type="text"
    value={oracleUi.roller.seed}
    placeholder={t('prefs.seedPlaceholder')}
    onchange={(e) => oracleUi.roller.setSeed(e.currentTarget.value)}
  />
</label>
<div class="help"><Markdown text={helpMarkdown(t('prefs.seedHelp'))} /></div>

<p class="title">{t('prefs.packs')}</p>
<div class="help"><Markdown text={helpMarkdown(t('prefs.packsHelp'))} /></div>
<div class="packs">
  {#each packs as pack (pack.id)}
    <label class="check">
      <input
        type="checkbox"
        checked={!hiddenPacks.ids.includes(pack.id)}
        onchange={(e) => setHidden(pack.id, !e.currentTarget.checked)}
      />
      {pack.name}
    </label>
  {/each}
</div>

<style>
  .title {
    color: var(--text);
    font-size: 13px;
  }

  .help {
    font-size: 12px;
    color: var(--text-muted);
  }

  .help :global(p),
  .help :global(ul) {
    margin: 0 0 4px;
  }

  .help :global(ul) {
    padding-left: 18px;
  }

  .packs {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 200px;
    overflow: auto;
  }
</style>

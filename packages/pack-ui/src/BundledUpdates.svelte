<script lang="ts">
  import { tooltip } from '@open-tabletop/ui-kit'
  import { translator } from './i18n'
  import type { PackLibrary } from './library.svelte'
  import { manifestOf, type BundledChange } from './packs'

  /**
   * On a user copy of a bundled pack: what the bundled pack changed since the copy was
   * made (a newer app version), file by file, to take or keep. Nothing otherwise.
   */
  let { library, root, locale }: { library: PackLibrary; root: string; locale: string } = $props()

  const t = translator(() => locale)
  const changes = $derived(library.bundledChanges(root))
  const copy = $derived(library.user.find((p) => p.root === root))
  const tracked = $derived(!!copy?.basedOn)
  const untouched = $derived(changes.filter((c) => !c.mine).map((c) => c.path))
  const versions = $derived.by(() => {
    const bundled = library.bundledPack(root)
    const a = bundled && manifestOf(bundled).version
    const b = copy && manifestOf(copy).version
    return a && b && a !== b ? t('updates.versions', { bundled: a, mine: b }) : ''
  })
  let open = $state<string | null>(null)

  const status = (c: BundledChange) =>
    !tracked ? t('updates.differs') : c.mine ? t('updates.both') : t(`updates.${c.bundled}`)
  const bundledText = (path: string) =>
    library.bundledPack(root)?.files.find((f) => f.path === path)?.content ?? ''
</script>

{#if changes.length}
  <div class="updates">
    <p>
      <strong>{tracked ? t('updates.title') : t('updates.untracked')}</strong>
      {versions}
    </p>
    <ul>
      {#each changes as change (change.path)}
        <li>
          <div class="row">
            <code>{change.path}</code>
            <span class="status">{status(change)}</span>
            <span class="buttons">
              {#if change.bundled !== 'removed'}
                <button
                  class="link"
                  onclick={() => (open = open === change.path ? null : change.path)}
                  >{open === change.path ? t('updates.hide') : t('updates.show')}</button
                >
              {/if}
              <button
                use:tooltip={t('updates.takeHelp')}
                onclick={() => library.updateFromBundled(root, { take: [change.path] })}
                >{t('updates.take')}</button
              >
              <button
                use:tooltip={t('updates.keepHelp')}
                onclick={() => library.updateFromBundled(root, { keep: [change.path] })}
                >{t('updates.keep')}</button
              >
            </span>
          </div>
          {#if open === change.path}<pre>{bundledText(change.path)}</pre>{/if}
        </li>
      {/each}
    </ul>
    <div class="all">
      {#if untouched.length}
        <button
          class="primary"
          use:tooltip={t('updates.takeUntouchedHelp')}
          onclick={() => library.updateFromBundled(root, { take: untouched })}
          >{t('updates.takeUntouched', { count: untouched.length })}</button
        >
      {/if}
      <button
        use:tooltip={t('updates.keepAllHelp')}
        onclick={() => library.updateFromBundled(root, { keep: changes.map((c) => c.path) })}
        >{t('updates.keepAll')}</button
      >
    </div>
  </div>
{/if}

<style>
  .updates {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px 10px;
    font-size: 13px;
    color: var(--text);
    border: 1px solid var(--accent);
    border-radius: 6px;
  }

  p {
    margin: 0;
  }

  ul {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 10px;
    align-items: center;
  }

  .status {
    flex: 1;
    min-width: 140px;
    color: var(--text-muted);
  }

  .buttons,
  .all {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  button {
    padding: 4px 8px;
    font-size: 12px;
    color: var(--text);
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
    cursor: pointer;
  }

  button.primary {
    color: var(--bg);
    background: var(--accent);
    border-color: var(--accent);
  }

  button.link {
    padding: 0;
    color: var(--accent);
    background: none;
    border: none;
  }

  pre {
    max-height: 240px;
    margin: 4px 0 0;
    padding: 6px 8px;
    overflow: auto;
    font-size: 12px;
    background: var(--bg);
    border-radius: 4px;
  }
</style>

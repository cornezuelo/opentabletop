<script lang="ts">
  import { PACK_FORMAT } from '@open-tabletop/oracle-engine'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { translator } from './i18n'
  import type { PackLibrary } from './library.svelte'
  import { manifestOf, type PackSource } from './packs'
  import { download, packsToZip } from './zip'

  /**
   * The user's packs written for an older pack format, which aren't read: said where the
   * packs are listed, so none just vanishes, with a way to keep each one. Nothing otherwise.
   */
  let { library, locale }: { library: PackLibrary; locale: string } = $props()

  const t = translator(() => locale)
  const older = $derived(library.olderPacks)
  const label = (p: PackSource) => {
    const m = manifestOf(p)
    return t('older.item', { name: m.name ?? m.id ?? p.root, format: m.format ?? 1 })
  }
</script>

{#if older.length}
  <div class="older">
    <p>
      <strong>{t('older.title')}</strong><InfoTip text={t('older.help', { format: PACK_FORMAT })} />
    </p>
    <ul>
      {#each older as pack (pack.root)}
        <li>
          <span>{label(pack)}</span>
          {#if library.bundledPack(pack.root)}<span class="copy">{t('older.copy')}</span>{/if}
          <button
            class="link"
            onclick={() => download(packsToZip([pack]), `${pack.root}.zip`, 'application/zip')}
            >{t('older.download')}</button
          >
        </li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .older {
    margin: 8px 0;
    padding: 6px 8px;
    border: 1px solid var(--warning, var(--border));
    border-radius: 4px;
    font-size: 12px;
  }
  .older p {
    margin: 0 0 4px;
  }
  .older ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .older li {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: baseline;
  }
  .copy {
    color: var(--text-muted);
  }
</style>

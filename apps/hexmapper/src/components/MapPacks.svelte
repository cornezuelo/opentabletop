<script lang="ts">
  import { manifestOf } from '@open-tabletop/pack-ui'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { SetMetaCommand } from '../lib/commands/settings'
  import { t } from '../lib/i18n/index.svelte'
  import { library } from '../lib/play/packs'
  import { editor } from '../lib/store/editor.svelte'

  /** The packs this map works with: its Oracle panel and play systems only show these. */
  const packs = $derived(
    library.packs.flatMap((pack) => {
      const manifest = manifestOf(pack)
      return manifest.id ? [{ id: manifest.id, name: manifest.name ?? manifest.id }] : []
    }),
  )
  const chosen = $derived(editor.meta.packs)
  const all = $derived(!chosen)

  function set(next: string[] | undefined) {
    // Every pack chosen is the same as no choice: new packs show up too.
    const packsNext = next && packs.every((p) => next.includes(p.id)) ? undefined : next
    editor.execute(new SetMetaCommand({ packs: packsNext }))
  }

  function toggle(id: string, on: boolean) {
    const current = chosen ?? packs.map((p) => p.id)
    set(on ? [...current, id] : current.filter((p) => p !== id))
  }
</script>

<div class="field">
  <span>{t('map.packs')}<InfoTip text={t('map.packsHelp')} /></span>
  <label class="check">
    <input
      type="checkbox"
      checked={all}
      onchange={(e) => set(e.currentTarget.checked ? undefined : [])}
    />
    {t('map.allPacks')}
  </label>
  {#if !all}
    <ul>
      {#each packs as pack (pack.id)}
        <li>
          <label class="check">
            <input
              type="checkbox"
              checked={chosen?.includes(pack.id)}
              onchange={(e) => toggle(pack.id, e.currentTarget.checked)}
            />
            {pack.name}
          </label>
        </li>
      {/each}
    </ul>
    {#each (chosen ?? []).filter((id) => !packs.some((p) => p.id === id)) as missing (missing)}
      <p class="help">{t('map.packMissing', { pack: missing })}</p>
    {/each}
  {/if}
</div>

<style>
  ul {
    margin: 2px 0 0 18px;
    padding: 0;
    list-style: none;
  }
</style>

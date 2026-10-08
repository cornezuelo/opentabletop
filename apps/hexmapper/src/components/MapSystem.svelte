<script lang="ts">
  import { manifestOf } from '@open-tabletop/pack-ui'
  import { systemName } from '@open-tabletop/session'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { SetMetaCommand } from '../lib/commands/settings'
  import { getLocale, t } from '../lib/i18n/index.svelte'
  import { library } from '../lib/play/packs'
  import { mapSystem, playSystems } from '../lib/play/systems'
  import { editor } from '../lib/store/editor.svelte'

  /**
   * The system the map is played with, and the packs it works with: the system's own and
   * the ones the map adds. Its Oracle panel only shows these.
   */
  const packs = $derived(
    library.packs.flatMap((pack) => {
      const manifest = manifestOf(pack)
      return manifest.id ? [{ id: manifest.id, name: manifest.name ?? manifest.id }] : []
    }),
  )
  const systems = $derived(playSystems())
  const chosenSystem = $derived(editor.meta.system ?? 'generic')
  const system = $derived(mapSystem())
  const missingSystem = $derived(!systems.some((s) => s.id === chosenSystem))
  const fromSystem = $derived(new Set(system.packs))
  const chosen = $derived(editor.meta.packs)
  const all = $derived(!chosen)

  function setPacks(next: string[] | undefined) {
    // Every pack chosen is the same as no choice: new packs show up too.
    const packsNext =
      next && packs.every((p) => next.includes(p.id) || fromSystem.has(p.id)) ? undefined : next
    editor.execute(new SetMetaCommand({ packs: packsNext }))
  }

  function toggle(id: string, on: boolean) {
    const current = chosen ?? packs.map((p) => p.id)
    setPacks(on ? [...current, id] : current.filter((p) => p !== id))
  }
</script>

<label class="field">
  <span>{t('map.system')}<InfoTip text={t('map.systemHelp')} /></span>
  <select
    value={chosenSystem}
    onchange={(e) => editor.execute(new SetMetaCommand({ system: e.currentTarget.value }))}
  >
    {#each systems as s (s.id)}
      <option value={s.id}
        >{s.id === 'generic' ? t('map.genericSystem') : systemName(s, getLocale())}</option
      >
    {/each}
    {#if missingSystem}
      <option value={chosenSystem}>{chosenSystem}</option>
    {/if}
  </select>
</label>
{#if missingSystem}
  <p class="help">{t('map.systemMissing', { system: chosenSystem })}</p>
{/if}

<div class="field">
  <span>{t('map.packs')}<InfoTip text={t('map.packsHelp')} /></span>
  <label class="check">
    <input
      type="checkbox"
      checked={all}
      onchange={(e) => setPacks(e.currentTarget.checked ? undefined : [])}
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
              checked={fromSystem.has(pack.id) || chosen?.includes(pack.id)}
              disabled={fromSystem.has(pack.id)}
              onchange={(e) => toggle(pack.id, e.currentTarget.checked)}
            />
            {pack.name}
            {#if fromSystem.has(pack.id)}<span class="from">{t('map.fromSystem')}</span>{/if}
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

  .from {
    margin-left: 4px;
    white-space: nowrap;
    font-size: 11px;
    color: var(--text-muted);
  }
</style>

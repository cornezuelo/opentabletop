<script lang="ts" module>
  import { newSeed } from '../lib/generate'

  /** The model and seed chosen, shared by the terrain and region panels. */
  const chosen = $state({ model: '', seed: newSeed() })
</script>

<script lang="ts">
  import { InfoTip, showToast, tooltip } from '@open-tabletop/ui-kit'
  import { localize } from '@open-tabletop/session'
  import { generateEmpty, emptyHexes } from '../lib/generate'
  import { getLocale, t } from '../lib/i18n/index.svelte'
  import { mapSystem } from '../lib/play/systems'
  import { editor } from '../lib/store/editor.svelte'

  /** Fill one region's empty hexes (its id), or the whole map's. */
  let { region }: { region?: string } = $props()

  const models = $derived.by(() => {
    void editor.setup
    const system = mapSystem()
    return Object.entries(system.land ?? {}).map(([id, model]) => ({
      id,
      model,
      name: localize(model.name, getLocale(), system.locale) ?? id,
    }))
  })
  const current = $derived(models.find((m) => m.id === chosen.model) ?? models[0])
  const empty = $derived.by(() => {
    void editor.revision
    return emptyHexes(editor.map, { region }).length
  })

  function fill() {
    if (!current) return
    const done = generateEmpty(editor.map, current.model, { region }, chosen.seed)
    if (!done.command) return showToast(t('generate.nothing'))
    editor.notify({ kind: 'hexes', keys: done.keys })
    editor.record(done.command)
    const palette = new Set(editor.map.terrains.map((p) => p.id))
    const unknown = done.terrains.filter((id) => !palette.has(id))
    showToast(t('generate.done', { count: done.keys.length, model: current.name }))
    if (unknown.length) showToast(t('generate.unknown', { terrains: unknown.join(', ') }), 'error')
  }
</script>

{#if !region}
  <div class="title">{t('generate.title')}<InfoTip text={t('generate.help')} /></div>
{/if}
{#if !current}
  {#if !region}<p class="help">{t('generate.none')}</p>{/if}
{:else}
  {#if !region}
    {#if models.length > 1}
      <label class="field">
        <span>{t('generate.model')}</span>
        <select bind:value={chosen.model}>
          {#each models as m (m.id)}
            <option value={m.id}>{m.name}</option>
          {/each}
        </select>
      </label>
    {/if}
    <label class="field">
      <span>{t('generate.seed')}</span>
      <span class="seed">
        <input type="text" bind:value={chosen.seed} />
        <button
          class="icon"
          use:tooltip={t('generate.again')}
          aria-label={t('generate.again')}
          onclick={() => (chosen.seed = newSeed())}>🎲</button
        >
      </span>
    </label>
  {/if}
  <span class="go">
    <button onclick={fill} disabled={!empty}
      >{region ? t('generate.fillRegion') : t('generate.fill')} ({empty})</button
    >{#if region}<InfoTip text={t('generate.help')} />{/if}
  </span>
{/if}

<style>
  .title {
    color: var(--text-muted);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    color: var(--text-muted);
  }

  .seed {
    display: flex;
    gap: 4px;
  }

  .seed input {
    flex: 1;
    min-width: 0;
  }

  .go {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .go button {
    flex: 1;
  }

  .help {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>

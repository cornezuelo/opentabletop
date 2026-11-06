<script lang="ts">
  import { writeRef } from '@open-tabletop/oracle-engine'
  import type { TravelSystem } from '@open-tabletop/session'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { t } from '../../lib/i18n'
  import { partChoices, partName } from '../../lib/newSystem'
  import { ROLLABLE, type SystemDoc } from '../../lib/systemDoc.svelte'

  /** `discover` in the bindings: what decides empty cells as the party travels. */
  let { doc, system }: { doc: SystemDoc; system?: TravelSystem } = $props()

  type Raw = Record<string, unknown>
  const disabled = $derived(!doc.editable)
  const discover = $derived((doc.bindings?.discover ?? {}) as Raw)
  const terrain = $derived((discover.terrain ?? {}) as Raw)
  const contents = $derived((discover.contents ?? {}) as Raw)
  const terrainValue = $derived(String(terrain.land ?? terrain.resolve ?? ''))
  const models = $derived(system ? partChoices(system, 'land') : [])

  /** Writes a binding, its `context` kept; empty, it goes, and `discover` with its last part. */
  function bind(key: 'terrain' | 'contents', value: string) {
    const old = (discover[key] ?? {}) as Raw
    const land = value.startsWith('land.') || value.includes('/land.')
    const next = value
      ? {
          ...(old.context !== undefined && !land && { context: old.context }),
          [land ? 'land' : 'resolve']: value,
        }
      : undefined
    write({ ...discover, [key]: next })
  }
  function write(next: Raw) {
    const kept = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined))
    const empty = !kept.terrain && !kept.contents
    doc.edit('bindings', ['discover'], empty ? undefined : kept)
  }
  const refName = (ref: string) => doc.targets.find((x) => x.ref === ref)?.ref ?? ref
</script>

{#snippet rollables(value: string)}
  {#if value && !doc.targets.some((x) => x.ref === value) && !models.includes(value)}
    <option {value}>{value} ⚠</option>
  {/if}
  {#each ROLLABLE as kind (kind)}
    {@const of = doc.targets.filter((x) => x.kind === kind)}
    {#if of.length}
      <optgroup label={t(`kinds.${kind}`)}>
        {#each of as target (target.ref)}<option value={target.ref}>{refName(target.ref)}</option
          >{/each}
      </optgroup>
    {/if}
  {/each}
{/snippet}

<section>
  <h3>{t('discover.title')}<InfoTip text={t('discover.help')} /></h3>
  <div class="row">
    <label>
      <span>{t('discover.terrain')}<InfoTip text={t('discover.terrainHelp')} /></span>
      <select
        value={terrainValue}
        {disabled}
        onchange={(e) => bind('terrain', e.currentTarget.value)}
      >
        <option value="">{t('discover.none')}</option>
        {#if models.length}
          <optgroup label={t('discover.models')}>
            {#each models as id (id)}
              <option value={id}
                >{(system && partName(system, 'land', id)) ?? writeRef('land', id)}</option
              >
            {/each}
          </optgroup>
        {/if}
        {@render rollables(terrainValue)}
      </select>
    </label>
    <label>
      <span>{t('discover.contents')}<InfoTip text={t('discover.contentsHelp')} /></span>
      <select
        value={String(contents.resolve ?? '')}
        {disabled}
        onchange={(e) => bind('contents', e.currentTarget.value)}
      >
        <option value="">{t('discover.none')}</option>
        {@render rollables(String(contents.resolve ?? ''))}
      </select>
    </label>
    <label>
      <span>{t('discover.reveal')}<InfoTip text={t('discover.revealHelp')} /></span>
      <select
        value={String(discover.reveal ?? 'neighbors')}
        disabled={disabled || (!discover.terrain && !discover.contents)}
        onchange={(e) =>
          write({
            ...discover,
            reveal: e.currentTarget.value === 'neighbors' ? undefined : e.currentTarget.value,
          })}
      >
        <option value="neighbors">{t('discover.neighbors')}</option>
        <option value="entered">{t('discover.entered')}</option>
      </select>
    </label>
  </div>
</section>

<style>
  h3 {
    margin: 0 0 8px;
    font-size: 14px;
    font-weight: 600;
  }

  .row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px 16px;
    max-width: 820px;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
    color: var(--text-muted);
  }
</style>

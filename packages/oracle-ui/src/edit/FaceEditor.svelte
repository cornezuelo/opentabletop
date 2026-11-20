<script lang="ts">
  import { packImages } from '@open-tabletop/oracle-engine'
  import { ConditionEditor } from '@open-tabletop/pack-ui'
  import { contextSuggestions } from '@open-tabletop/session'
  import { InfoTip, PlayingCard, SuggestInput } from '@open-tabletop/ui-kit'
  import type { Translate } from '../i18n'
  import type { DefinitionForm } from './doc.svelte'

  /**
   * A card's face, or every card's of a deck (`path`: `['face']` or `['cards', i, 'face']`):
   * a pack's picture, or the parts it's drawn from (index, sign, icon, a domino's pips, ink), and
   * when it's drawn upside down; with how it will look. `base` is the deck's, under a card's own.
   */
  let {
    doc,
    path,
    face,
    base,
  }: {
    doc: DefinitionForm
    path: (string | number)[]
    face: Record<string, unknown> | undefined
    base?: Record<string, unknown>
  } = $props()
  const t: Translate = (key, params) => doc.ui.t(key, params)

  const images = $derived(packImages(doc.ui.library.registry).filter((r) => !/\.svg$/i.test(r)))
  const hints = $derived(contextSuggestions(doc.ui.library.registry))
  const own = $derived(face ?? {})
  const shown = $derived({ ...base, ...own } as Record<string, unknown>)
  const text = (key: string) => (typeof own[key] === 'string' ? (own[key] as string) : '')
  const set = (key: string, value: unknown) => doc.edit([...path, key], value)
  const pips = $derived(Array.isArray(own.pips) ? (own.pips as number[]) : undefined)
  const INKS = ['', 'black', 'red'] as const
  const ink = $derived(typeof own.ink === 'string' ? own.ink : '')
  const preview = $derived({
    ...(typeof shown.image === 'string' && { image: shown.image }),
    ...(typeof shown.corner === 'string' && { corner: shown.corner }),
    ...(typeof shown.symbol === 'string' && { symbol: shown.symbol }),
    ...(typeof shown.icon === 'string' && { icon: shown.icon }),
    ...(Array.isArray(shown.pips) && { pips: shown.pips as [number, number] }),
    ...(typeof shown.ink === 'string' && { ink: shown.ink }),
  })
</script>

<div class="face">
  <div class="fields">
    <span>{t('edit.faceImage')}<InfoTip text={t('edit.faceImageHelp')} /></span>
    <SuggestInput
      value={text('image')}
      list={images}
      label={t('edit.faceImage')}
      placeholder="my-pack/cards/fool.webp"
      onchange={(v) => set('image', v.trim() || undefined)}
    />
    <span>{t('edit.faceCorner')}<InfoTip text={t('edit.faceCornerHelp')} /></span>
    <input
      type="text"
      maxlength="4"
      value={text('corner')}
      placeholder="K"
      onchange={(e) => set('corner', e.currentTarget.value.trim() || undefined)}
    />
    <span>{t('edit.faceSymbol')}<InfoTip text={t('edit.faceSymbolHelp')} /></span>
    <input
      type="text"
      maxlength="4"
      value={text('symbol')}
      placeholder="♠"
      onchange={(e) => set('symbol', e.currentTarget.value.trim() || undefined)}
    />
    <span>{t('edit.faceIcon')}<InfoTip text={t('edit.faceIconHelp')} /></span>
    <input
      type="text"
      value={text('icon')}
      placeholder="game:anchor"
      onchange={(e) => set('icon', e.currentTarget.value.trim() || undefined)}
    />
    <span>{t('edit.facePips')}<InfoTip text={t('edit.facePipsHelp')} /></span>
    <span class="pips">
      {#each [0, 1] as half (half)}
        <input
          type="number"
          min="0"
          max="9"
          value={pips?.[half] ?? ''}
          aria-label={t('edit.facePips')}
          onchange={(e) => {
            const n = e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value)
            const next = [pips?.[0] ?? 0, pips?.[1] ?? 0]
            if (n === undefined) return set('pips', undefined)
            next[half] = Math.min(9, Math.max(0, Math.round(n)))
            set('pips', next)
          }}
        />
      {/each}
    </span>
    <span>{t('edit.faceInk')}<InfoTip text={t('edit.faceInkHelp')} /></span>
    <span class="ink">
      <select
        value={INKS.includes(ink as (typeof INKS)[number]) ? ink : '#'}
        onchange={(e) => {
          const v = e.currentTarget.value
          set('ink', v === '' ? undefined : v === '#' ? '#2a5d8f' : v)
        }}
      >
        {#each INKS as option (option)}
          <option value={option}>{t(`edit.faceInks.${option || 'none'}`)}</option>
        {/each}
        <option value="#">{t('edit.faceInks.colour')}</option>
      </select>
      {#if ink.startsWith('#')}
        <input type="color" value={ink} onchange={(e) => set('ink', e.currentTarget.value)} />
      {/if}
    </span>
    <span>{t('edit.faceTurned')}<InfoTip text={t('edit.faceTurnedHelp')} /></span>
    <ConditionEditor
      value={own.turned}
      suggestions={hints}
      locale={doc.ui.locale()}
      label={t('edit.faceTurned')}
      onchange={(c) => set('turned', c)}
    />
  </div>
  <div class="preview">
    <span>{t('edit.facePreview')}</span>
    <PlayingCard face={preview} width={84} />
  </div>
</div>

<style>
  .face {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: flex-start;
  }

  .fields {
    display: grid;
    flex: 1;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 6px 10px;
    align-items: center;
    min-width: 260px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .pips,
  .ink {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .pips input {
    width: 60px;
  }

  .preview {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: center;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>

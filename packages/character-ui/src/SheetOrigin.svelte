<script lang="ts">
  import type { Sheet } from '@open-tabletop/character-engine'
  import { systemName, type TravelSystem } from '@open-tabletop/session'
  import { appUrl, InfoTip } from '@open-tabletop/ui-kit'
  import { translator } from './i18n'
  import { sheetText } from './texts'

  /**
   * Whose sheet a card is: the sheet and its system, a link to edit it in Systems, and
   * (from the host) where the system is chosen. What a sheet has is its system's to say.
   */
  let {
    sheet,
    system,
    locale,
    where = '',
  }: {
    sheet: { id: string; def: Sheet }
    system: TravelSystem
    locale: string
    /** Where the host's system is chosen (basic Markdown), added to the help. */
    where?: string
  } = $props()

  const t = translator(() => locale)
  const url = $derived(`${appUrl('systems')}#/system/${encodeURIComponent(system.id)}/sheet`)
</script>

<p class="origin">
  <span
    >{t('origin.line', {
      sheet: sheetText(sheet.def.name, locale) ?? sheet.id,
      system: systemName(system, locale),
    })}<InfoTip markdown={[t('origin.help'), where].filter(Boolean).join('\n\n')} /></span
  >
  <a href={url} target="_blank" rel="noopener">{t('origin.edit')}</a>
</p>

<style>
  .origin {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 10px;
    margin: 0 0 6px;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>

<script lang="ts">
  import { CharacterCard } from '@open-tabletop/character-ui'
  import { factionName, localize, type LocalizedText } from '@open-tabletop/session'
  import { confirmAction, InfoTip, Markdown } from '@open-tabletop/ui-kit'
  import { getLocale, t } from '../lib/i18n/index.svelte'
  import {
    bringFactions,
    factionsSystem,
    removeFactions,
    systemFactions,
  } from '../lib/play/factions'
  import { worldTurnNow } from '../lib/play/world.svelte'
  import { editor } from '../lib/store/editor.svelte'

  /**
   * The factions on the map: brought from its system, each with its colour, the hexes it
   * holds and its sheet; a world turn by hand, and turns by themselves with the world clock.
   */
  const own = $derived(editor.factions)
  const offered = $derived.by(() => {
    void editor.meta
    return systemFactions()
  })
  const system = $derived.by(() => {
    void own
    return factionsSystem()
  })
  const name = (id: string) => (system ? factionName(system, id, getLocale()) : id)
  /** What the system says a faction is (its `description`), in the UI's language. */
  const about = (id: string) =>
    (system &&
      localize(system.def.factions[id]?.description as LocalizedText | undefined, getLocale())) ||
    ''
  const color = (id: string) => system?.def.factions[id]?.color ?? '#8a7f6e'
</script>

<div class="field">
  <span>{t('factions.title')}<InfoTip markdown={t('factions.help')} /></span>
  {#if own && system}
    <p class="help">{t('factions.intro')}</p>
    <span class="help what">{t('factions.land')}<InfoTip markdown={t('factions.landHelp')} /></span>
    {#each own.factions as faction (faction.id)}
      <details class="faction">
        <summary>
          <span class="swatch" style:background={color(faction.id)}></span>
          <strong>{name(faction.id)}</strong>
          <span class="count"
            >{(own.territories[faction.id]?.length ?? 0) === 1
              ? t('factions.territoryOne')
              : t('factions.territory', { n: own.territories[faction.id]?.length ?? 0 })}</span
          >
        </summary>
        {#if about(faction.id)}<Markdown class="about" text={about(faction.id)} />{/if}
        <div class="paint">
          <button
            class:active={editor.factionBrush === faction.id}
            aria-pressed={editor.factionBrush === faction.id}
            onclick={() =>
              (editor.factionBrush = editor.factionBrush === faction.id ? null : faction.id)}
            >{editor.factionBrush === faction.id
              ? t('factions.stopPainting')
              : t('factions.paint')}</button
          >
          <span class="help"
            >{t('factions.paintHint')}<InfoTip markdown={t('factions.paintHelp')} /></span
          >
        </div>
        <CharacterCard
          sheet={system.sheet.def}
          character={faction}
          locale={getLocale()}
          named={false}
          path={`factions.${faction.id}`}
          onchange={(next) =>
            editor.setFactions({
              ...own,
              factions: own.factions.map((f) => (f.id === next.id ? next : f)),
            })}
        />
      </details>
    {/each}
    <!-- The help beside the button, not on it: pressing it runs the turn. -->
    <div class="row">
      <button onclick={() => worldTurnNow()}>{t('factions.turn')}</button>
      <span class="help">{t('panel.whatItDoes')}<InfoTip markdown={t('factions.turnHelp')} /></span>
    </div>
    {#if system.def.every}
      <label class="check">
        <input
          type="checkbox"
          checked={own.auto !== false}
          onchange={(e) =>
            editor.setFactions({ ...own, auto: e.currentTarget.checked ? undefined : false })}
        />
        {t('factions.auto', { days: system.def.every })}<InfoTip
          markdown={t('factions.autoHelp')}
        />
      </label>
    {/if}
    <button
      class="link"
      onclick={async () => (await confirmAction(t('factions.confirmRemove'))) && removeFactions()}
      >{t('factions.remove')}</button
    >
  {:else if offered}
    <p class="help">{t('factions.none')}</p>
    <button onclick={bringFactions}>{t('factions.bring')}</button>
  {:else}
    <p class="help">{t('factions.noSystem')}</p>
  {/if}
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 12px;
  }

  .faction {
    padding: 4px 8px 8px;
    border: 1px solid var(--panel-border);
    border-radius: 6px;
  }

  .faction summary {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }

  .faction[open] summary {
    margin-bottom: 6px;
  }

  .paint {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 8px;
    align-items: center;
    margin-bottom: 6px;
    font-size: 12px;
  }

  .paint button.active {
    color: var(--accent);
    border-color: var(--accent);
  }

  .swatch {
    width: 12px;
    height: 12px;
    border-radius: 3px;
  }

  .count {
    margin-left: auto;
    font-size: 12px;
    color: var(--text-muted);
  }

  .row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .check {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }

  .faction :global(.about) {
    margin-bottom: 6px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .what {
    align-self: flex-start;
  }

  .help {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .link {
    align-self: flex-start;
    padding: 0;
    font-size: 12px;
    color: var(--accent);
    background: none;
    border: none;
    cursor: pointer;
  }
</style>

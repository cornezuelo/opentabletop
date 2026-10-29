<script lang="ts">
  import { systemName } from '@open-tabletop/session'
  import { sheetText } from '@open-tabletop/character-ui'
  import { appUrl, InfoTip, Markdown, NewForm, readLastSystem } from '@open-tabletop/ui-kit'
  import { createCharacter } from '../lib/actions'
  import { getLocale, t } from '../lib/i18n'
  import { go } from '../lib/nav.svelte'
  import { systems } from '../lib/packs.svelte'

  /** Makes a character with a system's characters' sheet (the last system chosen, if it has one). */
  const last = readLastSystem()
  let system = $state(systems.list.find((s) => s.id === last)?.id ?? systems.list[0]?.id ?? '')
  let name = $state('')
  /** Its characters' sheet, or its party sheet (a party, its members chosen afterwards). */
  let party = $state(false)
  const chosen = $derived(systems.list.find((s) => s.id === system))

  function create() {
    if (!chosen || !name.trim()) return
    go({
      name: 'character',
      id: createCharacter(chosen, name.trim(), party && !!chosen.partySheet),
    })
  }
</script>

{#if systems.list.length}
  <NewForm
    title={t('new.title')}
    create={t('new.create')}
    disabled={!name.trim()}
    onsubmit={create}
  >
    <label class="field">
      <span>{t('new.system')}<InfoTip markdown={t('new.systemHelp')} /></span>
      <select bind:value={system}>
        {#each systems.list as s (s.id)}
          <option value={s.id}>{systemName(s, getLocale())}</option>
        {/each}
      </select>
    </label>
    {#if chosen?.partySheet}
      <label class="field">
        <span>{t('new.sheet')}<InfoTip markdown={t('new.sheetHelp')} /></span>
        <select
          value={party ? 'party' : 'character'}
          onchange={(e) => (party = e.currentTarget.value === 'party')}
        >
          <option value="character"
            >{sheetText(chosen.sheet.def.name, getLocale()) ?? chosen.sheet.id}</option
          >
          <option value="party"
            >{sheetText(chosen.partySheet.def.name, getLocale()) ?? chosen.partySheet.id} ({t(
              'new.aParty',
            )})</option
          >
        </select>
      </label>
    {/if}
    <label class="field">
      <span>{t('new.name')}</span>
      <!-- svelte-ignore a11y_autofocus -->
      <input
        type="text"
        required
        bind:value={name}
        placeholder={t('new.namePlaceholder')}
        autofocus
      />
    </label>
  </NewForm>
{:else}
  <h1>{t('new.title')}</h1>
  <div class="help"><Markdown text={t('new.noSystems')} /></div>
  <a href={appUrl('systems')}>{t('nav.makeSystems')}</a>
{/if}

<style>
  h1 {
    margin: 0 0 16px;
    font-family: Georgia, serif;
    font-weight: normal;
  }

  .help {
    color: var(--text-muted);
  }

  a {
    color: var(--accent);
  }
</style>

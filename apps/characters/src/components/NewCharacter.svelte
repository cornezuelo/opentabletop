<script lang="ts">
  import { systemName } from '@open-tabletop/session'
  import { appUrl, InfoTip, Markdown, readLastSystem } from '@open-tabletop/ui-kit'
  import { createCharacter } from '../lib/actions'
  import { getLocale, t } from '../lib/i18n'
  import { go } from '../lib/nav.svelte'
  import { systems } from '../lib/packs.svelte'

  /** Makes a character with a system's characters' sheet (the last system chosen, if it has one). */
  const last = readLastSystem()
  let system = $state(systems.list.find((s) => s.id === last)?.id ?? systems.list[0]?.id ?? '')
  let name = $state('')

  function create(e: SubmitEvent) {
    e.preventDefault()
    const chosen = systems.list.find((s) => s.id === system)
    if (!chosen || !name.trim()) return
    go({ name: 'character', id: createCharacter(chosen, name.trim()) })
  }
</script>

<h1>{t('new.title')}</h1>
{#if systems.list.length}
  <form onsubmit={create}>
    <label class="field">
      <span>{t('new.system')}<InfoTip markdown={t('new.systemHelp')} /></span>
      <select bind:value={system}>
        {#each systems.list as s (s.id)}
          <option value={s.id}>{systemName(s, getLocale())}</option>
        {/each}
      </select>
    </label>
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
    <button class="primary" type="submit" disabled={!name.trim()}>{t('new.create')}</button>
  </form>
{:else}
  <div class="help"><Markdown text={t('new.noSystems')} /></div>
  <a href={appUrl('systems')}>{t('nav.makeSystems')}</a>
{/if}

<style>
  h1 {
    margin: 0 0 16px;
    font-family: Georgia, serif;
    font-weight: normal;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 420px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .primary {
    align-self: start;
    padding: 6px 14px;
    color: var(--accent);
    background: var(--bg);
    border: 1px solid var(--accent);
    border-radius: 6px;
    cursor: pointer;
  }

  .primary:disabled {
    opacity: 0.4;
  }

  .help {
    color: var(--text-muted);
  }

  a {
    color: var(--accent);
  }
</style>

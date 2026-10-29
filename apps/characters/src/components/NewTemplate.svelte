<script lang="ts">
  import { systemName } from '@open-tabletop/session'
  import { appUrl, InfoTip, Markdown, NewForm } from '@open-tabletop/ui-kit'
  import { addTemplate, ownBestiaries } from '../lib/bestiary'
  import { getLocale, t } from '../lib/i18n'
  import { go } from '../lib/nav.svelte'
  import { systems } from '../lib/packs.svelte'

  /** Adds a template to a bestiary of the user's: only systems that have one are listed. */
  const own = $derived(systems.list.filter((s) => ownBestiaries(s).length))
  let system = $state('')
  let name = $state('')
  const chosen = $derived(own.find((s) => s.id === system) ?? own[0])

  function create() {
    const bestiary = chosen && ownBestiaries(chosen)[0]
    if (!bestiary || !name.trim()) return
    const id = addTemplate(chosen, bestiary, name.trim())
    if (id) go({ name: 'bestiary', bestiary, template: id })
  }
</script>

{#if own.length}
  <NewForm
    title={t('newTemplate.title')}
    create={t('new.create')}
    disabled={!name.trim()}
    onsubmit={create}
  >
    <label class="field">
      <span>{t('new.system')}<InfoTip markdown={t('newTemplate.systemHelp')} /></span>
      <select value={chosen?.id} onchange={(e) => (system = e.currentTarget.value)}>
        {#each own as s (s.id)}
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
        placeholder={t('newTemplate.namePlaceholder')}
        autofocus
      />
    </label>
  </NewForm>
{:else}
  <h1 class="page-title">{t('newTemplate.title')}</h1>
  <div class="help"><Markdown text={t('newTemplate.none')} /></div>
  <a href={appUrl('systems')}>{t('nav.makeSystems')}</a>
{/if}

<style>
  .help {
    color: var(--text-muted);
  }

  a {
    color: var(--accent);
  }
</style>

<script lang="ts">
  import { InfoTip, showToast, tooltip, confirmAction } from '@open-tabletop/ui-kit'
  import { t } from '../lib/i18n'
  import { displayName, KIND_ORDER } from '../lib/names'
  import { go } from '../lib/nav.svelte'
  import { workspace } from '../lib/packs/workspace.svelte'
  import {
    cleanFilePath,
    manifestOf,
    MANIFEST_FILE,
    overlayLocales,
    overlayPath,
  } from '../lib/packs/workspace'
  import { locate } from '@open-tabletop/pack-ui/yaml'
  import { download, packToZip } from '../lib/packs/zip'
  import KindBadge from './KindBadge.svelte'
  import { dialogs } from '../lib/dialogs.svelte'
  import ReadOnlyNotice from './ReadOnlyNotice.svelte'

  let { root }: { root: string } = $props()

  const pack = $derived(workspace.pack(root))
  const manifest = $derived(pack ? manifestOf(pack) : {})
  const editable = $derived(workspace.isEditable(root))
  const defs = $derived(
    manifest.id
      ? workspace.engine
          .list({ pack: manifest.id })
          .sort(
            (a, b) =>
              KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
              displayName(a).localeCompare(displayName(b)),
          )
      : [],
  )
  const extras = $derived(manifest.id ? (workspace.registry.extras.get(manifest.id) ?? []) : [])
  const diagnostics = $derived(workspace.diagnostics(root))
  const dataFiles = $derived(
    (pack?.files ?? [])
      .map((f) => f.path)
      .filter((p) => p !== MANIFEST_FILE && !p.startsWith('locales/')),
  )
  const translations = $derived(pack ? overlayLocales(pack) : [])

  let newFileName = $state('')
  let newLocale = $state('')

  function addFile() {
    const path = cleanFilePath(newFileName)
    if (!path) return
    if (pack?.files.some((f) => f.path === path))
      return showToast(t('pack.fileExists', { file: path }), 'error')
    workspace.writeFile(root, path, '')
    newFileName = ''
    go({ name: 'file', root, path })
  }

  function rename(path: string) {
    const next = cleanFilePath(prompt(t('pack.renamePrompt', { file: path }), path) ?? '')
    if (!next || next === path) return
    if (pack?.files.some((f) => f.path === next))
      return showToast(t('pack.fileExists', { file: next }), 'error')
    workspace.renameFile(root, path, next)
  }

  function addTranslation() {
    const code = newLocale.trim().toLowerCase()
    if (!/^[a-z]{2,3}(-[a-z0-9]+)?$/.test(code) || code === manifest.locale) return
    for (const file of dataFiles) {
      const path = overlayPath(code, file)
      if (!workspace.readFile(root, path)) workspace.writeFile(root, path, '')
    }
    newLocale = ''
  }

  async function removePack() {
    const name = manifest.name ?? root
    const message = pack?.overrides
      ? t('pack.confirmRevert', { name })
      : t('pack.confirmDeletePack', { name })
    if (!(await confirmAction(message))) return
    workspace.removePack(root)
    if (!pack?.overrides) go({ name: 'welcome' })
  }

  function exportZip() {
    if (pack) download(packToZip(pack), `${root}.zip`, 'application/zip')
  }

  function openProblem(file: string | undefined, at: string | undefined, line?: number) {
    const path = file?.slice(root.length + 1) ?? MANIFEST_FILE
    go({ name: 'file', root, path, line: line ?? locate(workspace.readFile(root, path) ?? '', at) })
  }
</script>

{#if pack}
  <article class="pack">
    <header>
      <h1>{manifest.name ?? root}</h1>
      <div class="meta">
        <code>{manifest.id ?? root}</code>
        {#if manifest.version}<span>{t('pack.version')} {manifest.version}</span>{/if}
        {#if manifest.locale}<span>{t('pack.locale')}: {manifest.locale}</span>{/if}
        {#if manifest.license}<span>{t('pack.license')}: {manifest.license}</span>{/if}
        <button class="link" onclick={() => go({ name: 'file', root, path: MANIFEST_FILE })}
          >pack.yaml</button
        ><InfoTip text={t('pack.manifestHelp')} />
      </div>
      <div class="actions">
        <button onclick={exportZip}>{t('pack.export')}</button>
        {#if editable}
          <button class="danger" onclick={removePack}
            >{pack.overrides ? t('pack.revert') : t('pack.deletePack')}</button
          >
        {/if}
      </div>
    </header>

    {#if !editable}<ReadOnlyNotice {root} />{/if}

    <section>
      <h2>{t('pack.problems')}</h2>
      {#if diagnostics.length}
        <ul class="problems">
          {#each diagnostics as d, i (i)}
            <li class={d.severity}>
              <button class="link" onclick={() => openProblem(d.file, d.at, d.line)}
                >{d.file?.slice(root.length + 1) ?? MANIFEST_FILE}{d.at ? ` · ${d.at}` : ''}</button
              >
              {d.message}
            </li>
          {/each}
        </ul>
      {:else}
        <p class="help">{t('pack.noProblems')}</p>
      {/if}
    </section>

    <section>
      <h2>{t('pack.definitions')}</h2>
      <ul class="defs">
        {#each defs as def (def.id)}
          <li>
            <button class="row" onclick={() => go({ name: 'def', id: def.id, tab: 'roll' })}>
              <KindBadge kind={def.kind} />
              <span>{displayName(def)}</span>
              <code>{def.localId}</code>
            </button>
          </li>
        {/each}
      </ul>
      {#if editable}
        <button class="plain" onclick={() => (dialogs.newDefinition = { root })}
          >{t('pack.newDefinition')}</button
        >
      {/if}
      {#if extras.length}
        <h3>{t('pack.other')}<InfoTip text={t('pack.otherHelp')} /></h3>
        <ul class="defs">
          {#each extras as extra, i (i)}
            <li>
              <button
                class="row"
                onclick={() => go({ name: 'file', root, path: extra.file.slice(root.length + 1) })}
              >
                <span class="kind">{extra.kind}</span>
                <code>{extra.id ?? ''}</code>
                <span class="muted">{extra.file.slice(root.length + 1)}</span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section>
      <h2>{t('pack.files')}</h2>
      <ul class="files">
        {#each pack.files as f (f.path)}
          <li>
            <button class="link" onclick={() => go({ name: 'file', root, path: f.path })}
              >{f.path}</button
            >
            {#if editable && f.path !== MANIFEST_FILE}
              <button class="icon" use:tooltip={t('pack.rename')} onclick={() => rename(f.path)}
                >✎</button
              >
              <button
                class="icon"
                use:tooltip={t('pack.deleteFile')}
                onclick={async () => {
                  if (await confirmAction(t('pack.confirmDeleteFile', { file: f.path })))
                    workspace.deleteFile(root, f.path)
                }}>×</button
              >
            {/if}
          </li>
        {/each}
      </ul>
      {#if editable}
        <form
          class="inline-form"
          onsubmit={(e) => {
            e.preventDefault()
            addFile()
          }}
        >
          <input type="text" placeholder={t('pack.fileName')} bind:value={newFileName} />
          <button type="submit">{t('pack.addFile')}</button>
        </form>
      {/if}
    </section>

    <section>
      <h2>{t('pack.translations')}</h2>
      <p class="help">
        {translations.filter((l) => l !== manifest.locale).join(', ') || t('pack.noTranslations')}
      </p>
      {#if editable}
        <form
          class="inline-form"
          onsubmit={(e) => {
            e.preventDefault()
            addTranslation()
          }}
        >
          <input type="text" placeholder={t('pack.translationCode')} bind:value={newLocale} />
          <button type="submit">{t('pack.addTranslation')}</button>
        </form>
      {/if}
    </section>
  </article>
{/if}

<style>
  .pack {
    display: flex;
    flex-direction: column;
    gap: 18px;
    max-width: 900px;
  }

  h1 {
    margin: 0;
    font-family: Georgia, serif;
    font-size: 26px;
    font-weight: normal;
  }

  h2 {
    margin: 0 0 8px;
    font-size: 14px;
  }

  h3 {
    margin: 12px 0 6px;
    font-size: 13px;
    font-weight: normal;
    color: var(--text-muted);
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    align-items: baseline;
    margin-top: 4px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .actions {
    display: flex;
    gap: 8px;
    margin-top: 10px;
  }

  .actions button,
  .plain,
  .inline-form button {
    padding: 6px 12px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .actions .danger {
    color: #e3a19f;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .defs {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 2px 12px;
  }

  .row {
    display: flex;
    gap: 8px;
    align-items: center;
    width: 100%;
    padding: 4px 6px;
    text-align: left;
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .row:hover {
    background: rgb(255 255 255 / 0.04);
  }

  .row code,
  .muted {
    margin-left: auto;
    font-size: 11px;
    color: var(--text-muted);
  }

  .kind {
    font-size: 12px;
    color: var(--accent);
  }

  .files li {
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 2px 0;
  }

  .files .icon {
    width: 24px;
    height: 24px;
    font-size: 12px;
  }

  .inline-form {
    display: flex;
    gap: 6px;
    margin-top: 8px;
  }

  .inline-form input {
    width: 260px;
  }

  .problems li {
    padding: 3px 0;
    font-size: 13px;
    border-bottom: 1px solid var(--panel-border);
  }

  .problems li.error {
    color: #e3a19f;
  }

  .problems li.warning {
    color: #d8c58a;
  }

  .help {
    margin: 0;
    color: var(--text-muted);
  }
</style>

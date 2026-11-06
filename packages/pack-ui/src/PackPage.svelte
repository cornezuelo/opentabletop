<script lang="ts">
  import type { Snippet } from 'svelte'
  import { imageUrl, isImageFile } from '@open-tabletop/oracle-engine'
  import { confirmAction, InfoTip, showToast, tooltip } from '@open-tabletop/ui-kit'
  import BundledUpdates from './BundledUpdates.svelte'
  import { translator } from './i18n'
  import ImageThumb from './ImageThumb.svelte'
  import ManifestForm from './ManifestForm.svelte'
  import { MAX_IMAGE_BYTES, readImageFile } from './images'
  import type { PackLibrary } from './library.svelte'
  import { cleanFilePath, overlayLocales, overlayPath } from './packFiles'
  import { MANIFEST_FILE, manifestOf } from './packs'
  import ReadOnlyNotice from './ReadOnlyNotice.svelte'
  import { locate } from './yaml'
  import { download, packsToZip } from './zip'

  /**
   * A pack's page: its manifest, what can be done with it, its problems, then what the host
   * says it holds (`holds`), its files and its translations.
   */
  let {
    library,
    locale: uiLocale,
    root,
    at,
    holds,
    onfile,
    onpack,
    ongone,
  }: {
    library: PackLibrary
    locale: string
    root: string
    /** The part of the page to show first. */
    at?: 'images'
    holds?: Snippet
    /** Open a file of the pack, at a line. */
    onfile: (path: string, line?: number) => void
    /** Go to a pack, by its folder (a duplicate of this one). */
    onpack: (root: string) => void
    /** The pack was deleted. */
    ongone: () => void
  } = $props()
  const t = translator(() => uiLocale)

  const pack = $derived(library.pack(root))
  const manifest = $derived(pack ? manifestOf(pack) : {})
  const editable = $derived(library.isEditable(root))
  const diagnostics = $derived(library.diagnostics(root))
  const dataFiles = $derived(
    (pack?.files ?? [])
      .map((f) => f.path)
      .filter((p) => p !== MANIFEST_FILE && !p.startsWith('locales/') && !isImageFile(p)),
  )
  const translations = $derived(pack ? overlayLocales(pack) : [])
  /** Files of the pack itself; translation files are listed under their language. */
  const ownFiles = $derived(
    (pack?.files ?? []).filter((f) => !f.path.startsWith('locales/') && !isImageFile(f.path)),
  )
  const images = $derived((pack?.files ?? []).filter((f) => isImageFile(f.path)))
  let imagesBox = $state<HTMLElement>()
  $effect(() => {
    if (at === 'images') imagesBox?.scrollIntoView({ block: 'start' })
  })
  const filesOf = (locale: string) =>
    (pack?.files ?? []).filter((f) => f.path.startsWith(`locales/${locale}/`))

  let newFileName = $state('')
  let newLocale = $state('')

  function addFile() {
    const path = cleanFilePath(newFileName)
    if (!path) return
    if (pack?.files.some((f) => f.path === path))
      return showToast(t('pack.fileExists', { file: path }), 'error')
    library.writeFile(root, path, '')
    newFileName = ''
    onfile(path)
  }

  /**
   * Asks for images (SVG, PNG, WebP, JPEG) and adds them to the pack, each by its name, in
   * the folder written in the file name's box when it ends in `/` (`relief/`).
   */
  function addImages() {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = '.svg,.png,.webp,.jpg,.jpeg,image/svg+xml,image/png,image/webp,image/jpeg'
    input.onchange = async () => {
      const folder = newFileName.trim().endsWith('/') ? cleanFilePath(newFileName) : ''
      for (const file of input.files ?? []) {
        const path = cleanFilePath(`${folder ? `${folder}/` : ''}${file.name}`)
        if (!path || !isImageFile(path)) {
          showToast(t('pack.notImage', { file: file.name }), 'error')
          continue
        }
        if (file.size > MAX_IMAGE_BYTES) {
          showToast(t('pack.imageTooBig', { file: file.name, kb: MAX_IMAGE_BYTES / 1024 }), 'error')
          continue
        }
        if (pack?.files.some((f) => f.path === path)) {
          showToast(t('pack.fileExists', { file: path }), 'error')
          continue
        }
        library.writeFile(root, path, await readImageFile(file))
      }
    }
    input.click()
  }

  /** The file being renamed, and what it's being called. */
  let renaming = $state<string | null>(null)
  let newName = $state('')

  function rename(path: string) {
    renaming = null
    const next = cleanFilePath(newName)
    if (!next || next === path) return
    if (pack?.files.some((f) => f.path === next))
      return showToast(t('pack.fileExists', { file: next }), 'error')
    library.renameFile(root, path, next)
  }

  function addTranslation() {
    const code = newLocale.trim().toLowerCase()
    if (!/^[a-z]{2,3}(-[a-z0-9]+)?$/.test(code) || code === manifest.locale) return
    for (const file of dataFiles) {
      const path = overlayPath(code, file)
      if (!library.readFile(root, path)) library.writeFile(root, path, '')
    }
    newLocale = ''
  }

  async function removePack() {
    const name = manifest.name ?? root
    const message = pack?.overrides
      ? t('pack.confirmRevert', { name })
      : t('pack.confirmDeletePack', { name })
    if (!(await confirmAction(message))) return
    library.removePack(root)
    if (!pack?.overrides) ongone()
  }

  function exportZip() {
    if (pack) download(packsToZip([pack]), `${root}.zip`, 'application/zip')
  }

  function openProblem(file: string | undefined, at: string | undefined, line?: number) {
    const path = file?.slice(root.length + 1) ?? MANIFEST_FILE
    onfile(path, line ?? locate(library.readFile(root, path) ?? '', at))
  }
</script>

{#snippet fileList(files: { path: string }[], label: (path: string) => string)}
  <ul class="files">
    {#each files as f (f.path)}
      <li>
        {#if renaming === f.path}
          <form
            class="inline-form"
            onsubmit={(e) => {
              e.preventDefault()
              rename(f.path)
            }}
          >
            <input
              type="text"
              aria-label={t('pack.renamePrompt', { file: f.path })}
              bind:value={newName}
            />
            <button type="submit">{t('pack.rename')}</button>
            <button type="button" onclick={() => (renaming = null)}>{t('pack.cancel')}</button>
          </form>
        {:else if isImageFile(f.path)}
          <!-- An image isn't edited as text: it shows, under its name in the styles that use it. -->
          <ImageThumb src={imageUrl(library.readFile(root, f.path) ?? '')} size="28px" />
          <span use:tooltip={t('pack.imageRef', { ref: `${manifest.id ?? root}/${f.path}` })}
            >{label(f.path)}</span
          >
        {:else}
          <button class="link" onclick={() => onfile(f.path)}>{label(f.path)}</button>
        {/if}
        {#if editable && f.path !== MANIFEST_FILE}
          <button
            class="icon"
            use:tooltip={t('pack.rename')}
            onclick={() => {
              renaming = f.path
              newName = f.path
            }}>✎</button
          >
          <button
            class="icon"
            use:tooltip={t('pack.deleteFile')}
            onclick={async () => {
              if (await confirmAction(t('pack.confirmDeleteFile', { file: f.path })))
                library.deleteFile(root, f.path)
            }}>×</button
          >
        {/if}
      </li>
    {/each}
  </ul>
{/snippet}

{#if pack}
  <article class="pack">
    <header>
      <h1 class="page-title">{manifest.name ?? root}</h1>
      <div class="meta">
        <code>{manifest.id ?? root}</code>
        {#if manifest.version}<span>{t('pack.version')} {manifest.version}</span>{/if}
        {#if manifest.locale}<span>{t('pack.locale')}: {manifest.locale}</span>{/if}
        {#if manifest.license}<span>{t('pack.license')}: {manifest.license}</span>{/if}
        <span
          >{t('pack.manifest')}<InfoTip text={t('pack.manifestHelp')} />:
          <button class="link" onclick={() => onfile(MANIFEST_FILE)}>pack.yaml</button></span
        >
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

    {#if !editable}<ReadOnlyNotice {library} locale={uiLocale} {root} onmade={onpack} />{/if}
    <BundledUpdates {library} {root} locale={uiLocale} />
    <ManifestForm {library} locale={uiLocale} {root} />

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

    {@render holds?.()}

    <section>
      <h2>{t('pack.files')}</h2>

      {@render fileList(ownFiles, (path) => path)}
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
          <button type="button" onclick={addImages}>{t('pack.addImage')}</button>
        </form>
      {/if}
    </section>

    {#if images.length}
      <section bind:this={imagesBox}>
        <h2>{t('pack.images')}<InfoTip text={t('pack.addImageHelp')} /></h2>
        {@render fileList(images, (path) => path)}
      </section>
    {/if}

    <section>
      <h2>{t('pack.translations')}</h2>
      {#each translations.filter((l) => l !== manifest.locale) as code (code)}
        <h3>{code}</h3>
        {@render fileList(filesOf(code), (path) => path.slice(`locales/${code}/`.length))}
      {:else}
        <p class="help">{t('pack.noTranslations')}</p>
      {/each}
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

  h2 {
    margin: 0 0 8px;
  }

  h3 {
    margin: 12px 0 6px;
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
  .inline-form button {
    padding: 6px 12px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .actions .danger {
    color: var(--danger-text);
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
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
    color: var(--danger-text);
  }

  .problems li.warning {
    color: var(--warning-text);
  }

  .help {
    margin: 0;
    color: var(--text-muted);
  }
</style>

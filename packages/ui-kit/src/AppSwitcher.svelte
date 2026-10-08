<script lang="ts">
  import {
    downloadBackup,
    makeBackup,
    parseBackup,
    pickBackupFile,
    restoreBackup,
    summarize,
  } from '@open-tabletop/storage'
  import { APPS, appBlurb, appIconUrl, appUrl, logoUrl, type AppId } from './apps'
  import { ask } from './dialog.svelte'
  import { showToast } from './toasts.svelte'
  import { tooltip } from './tooltip'

  /**
   * A button that opens the list of OpenTabletop apps, each with a short description,
   * instead of one toolbar button per app.
   */
  let {
    current,
    locale,
    compact = false,
  }: { current: AppId; locale: string; compact?: boolean } = $props()

  const TEXT = {
    en: {
      button: 'OpenTabletop apps',
      title: 'OpenTabletop apps',
      here: 'You are here',
      soon: 'Coming soon',
      close: 'Close',
      sameSite: 'Apps share your packs when they are served from the same site.',
      data: 'Your data in this browser',
      dataHelp:
        'Everything the apps keep here (maps, your packs, trips, Oracle histories and decks, favorites, preferences) in one file: to move your games to another computer or keep a copy in case the browser’s data is lost.',
      backup: 'Save a backup',
      restore: 'Restore a backup…',
      saved: 'Backup saved: keep the file somewhere safe.',
      failed: 'The backup could not be made: {error}',
      invalid: 'That file is not an OpenTabletop backup.',
      newer: 'That backup was made by a newer version of OpenTabletop.',
      restoreTitle: 'Restore the backup',
      restoreMessage:
        'Backup of {date} (maps: {maps}; packs of your own: {packs}). Add it to what this browser has (where both have a map, the newer one stays), or replace everything here with it? Close other OpenTabletop tabs first.',
      cancel: 'Cancel',
      merge: 'Add to mine',
      replace: 'Replace everything',
      restored: 'Backup restored. Reloading…',
      restoreFailed: 'The backup could not be restored: {error}',
    },
    es: {
      button: 'Aplicaciones de OpenTabletop',
      title: 'Aplicaciones de OpenTabletop',
      here: 'Estás aquí',
      soon: 'Próximamente',
      close: 'Cerrar',
      sameSite: 'Las aplicaciones comparten tus packs cuando se sirven desde el mismo sitio.',
      data: 'Tus datos en este navegador',
      dataHelp:
        'Todo lo que las aplicaciones guardan aquí (mapas, tus packs, viajes, historiales y mazos del Oracle, favoritos, preferencias) en un fichero: para llevar tus partidas a otro ordenador o tener una copia por si se pierden los datos del navegador.',
      backup: 'Guardar una copia',
      restore: 'Restaurar una copia…',
      saved: 'Copia guardada: guarda el fichero en un lugar seguro.',
      failed: 'No se pudo hacer la copia: {error}',
      invalid: 'Ese fichero no es una copia de OpenTabletop.',
      newer: 'Esa copia la hizo una versión más reciente de OpenTabletop.',
      restoreTitle: 'Restaurar la copia',
      restoreMessage:
        'Copia del {date} (mapas: {maps}; packs tuyos: {packs}). ¿Añadirla a lo que tiene este navegador (si ambos tienen un mapa, se queda el más reciente) o sustituirlo todo por ella? Cierra antes otras pestañas de OpenTabletop.',
      cancel: 'Cancelar',
      merge: 'Añadir a lo mío',
      replace: 'Sustituirlo todo',
      restored: 'Copia restaurada. Recargando…',
      restoreFailed: 'No se pudo restaurar la copia: {error}',
    },
  }
  const text = $derived(TEXT[locale as keyof typeof TEXT] ?? TEXT.en)
  let dialog: HTMLDialogElement
  let busy = $state(false)

  const fill = (message: string, values: Record<string, string | number>) =>
    message.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''))
  const reason = (error: unknown) => (error instanceof Error ? error.message : String(error))

  async function backup() {
    busy = true
    try {
      downloadBackup(await makeBackup())
      showToast(text.saved)
    } catch (error) {
      showToast(fill(text.failed, { error: reason(error) }), 'error', 8000)
    } finally {
      busy = false
    }
  }

  async function restore() {
    dialog.close()
    const json = await pickBackupFile()
    if (json === null) return
    const { backup, error } = parseBackup(json)
    if (!backup) return showToast(error === 'newer' ? text.newer : text.invalid, 'error')
    const { maps, packs, created } = summarize(backup)
    const date = created ? new Date(created).toLocaleString(locale) : '?'
    const mode = await ask(text.restoreTitle, fill(text.restoreMessage, { date, maps, packs }), [
      { value: 'cancel', label: text.cancel },
      { value: 'replace', label: text.replace, kind: 'danger' },
      { value: 'merge', label: text.merge, kind: 'primary' },
    ])
    if (mode !== 'merge' && mode !== 'replace') return
    try {
      await restoreBackup(backup, mode)
      showToast(text.restored)
      // Every app reads its data on start: reload to see the restored state.
      setTimeout(() => location.reload(), 800)
    } catch (error) {
      showToast(fill(text.restoreFailed, { error: reason(error) }), 'error', 8000)
    }
  }
</script>

<button
  class="open"
  class:compact
  aria-label={text.button}
  use:tooltip={text.button}
  onclick={() => dialog.showModal()}
>
  <svg viewBox="0 0 16 16" aria-hidden="true"
    >{#each [2, 7, 12] as y (y)}{#each [2, 7, 12] as x (x)}<rect
          {x}
          {y}
          width="3"
          height="3"
          rx="0.6"
        />{/each}{/each}</svg
  >
</button>

<dialog bind:this={dialog} onclick={(e) => e.target === dialog && dialog.close()}>
  <h2><img class="logo" src={logoUrl()} alt="" />{text.title}</h2>
  <ul>
    {#each APPS as app (app.id)}
      <li>
        {#if app.id === current}
          <div class="app here">
            <img src={appIconUrl(app.id)} alt="" />
            <span
              ><strong>{app.name}</strong><small>{text.here}</small>{appBlurb(app.id, locale)}</span
            >
          </div>
        {:else if app.available}
          <a class="app" href={appUrl(app.id)}>
            <img src={appIconUrl(app.id)} alt="" />
            <span><strong>{app.name}</strong>{appBlurb(app.id, locale)}</span>
          </a>
        {:else}
          <div class="app soon">
            <img src={appIconUrl(app.id)} alt="" />
            <span
              ><strong>{app.name}</strong><small>{text.soon}</small>{appBlurb(app.id, locale)}</span
            >
          </div>
        {/if}
      </li>
    {/each}
  </ul>
  <p>{text.sameSite}</p>
  <section class="data">
    <h3>{text.data}</h3>
    <p>{text.dataHelp}</p>
    <div class="buttons">
      <button disabled={busy} onclick={backup}>{text.backup}</button>
      <button disabled={busy} onclick={restore}>{text.restore}</button>
    </div>
  </section>
  <button class="close" onclick={() => dialog.close()}>{text.close}</button>
</dialog>

<style>
  .open {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    color: var(--text-muted);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    cursor: pointer;
  }

  .open.compact {
    width: 40px;
    height: 40px;
  }

  .open:hover {
    color: var(--accent);
    border-color: var(--panel-border);
  }

  .open svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }

  dialog {
    width: min(460px, calc(100vw - 32px));
    padding: 18px;
    color: var(--text);
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
  }

  dialog::backdrop {
    background: rgb(0 0 0 / 0.5);
  }

  h2 {
    display: flex;
    gap: 10px;
    align-items: center;
    margin: 0 0 12px;
    font-family: Georgia, serif;
    font-size: 18px;
    font-weight: normal;
  }

  .logo {
    width: 28px;
    height: 28px;
  }

  ul {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .app {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 10px;
    color: var(--text);
    text-decoration: none;
    border: 1px solid var(--panel-border);
    border-radius: 6px;
  }

  a.app:hover {
    border-color: var(--accent);
  }

  .app.here {
    background: rgb(200 162 74 / 0.08);
    border-color: var(--accent);
  }

  .app.soon {
    opacity: 0.55;
  }

  .app img {
    flex: none;
    width: 32px;
    height: 32px;
  }

  .app span {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 13px;
    color: var(--text-muted);
  }

  .app strong {
    font-family: Georgia, serif;
    font-size: 15px;
    font-weight: normal;
    color: var(--text);
  }

  small {
    color: var(--accent);
  }

  p {
    margin: 12px 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .data {
    padding-top: 12px;
    border-top: 1px solid var(--panel-border);
  }

  h3 {
    margin: 0;
    font-family: Georgia, serif;
    font-size: 15px;
    font-weight: normal;
  }

  .data p {
    margin: 6px 0 10px;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .buttons button,
  .close {
    padding: 6px 14px;
    color: var(--text);
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .buttons button:hover:not(:disabled) {
    border-color: var(--accent);
  }

  .close {
    margin-top: 12px;
    float: right;
  }
</style>

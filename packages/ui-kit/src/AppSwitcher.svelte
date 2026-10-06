<script lang="ts">
  import { APPS, appIconUrl, appUrl, type AppId } from './apps'
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
      hexmapper:
        'Draw hex maps: terrain, roads, rivers, regions, icons and tokens; play trips on them.',
      oracle: 'Roll and edit tables, oracles, generators and decks from your packs.',
      travel: 'Run trips without a map and edit travel rules and their tables.',
      sameSite: 'Apps share your packs when they are served from the same site.',
    },
    es: {
      button: 'Aplicaciones de OpenTabletop',
      title: 'Aplicaciones de OpenTabletop',
      here: 'Estás aquí',
      soon: 'Próximamente',
      close: 'Cerrar',
      hexmapper:
        'Dibuja mapas de hexágonos: terreno, caminos, ríos, regiones, iconos y tokens; juega viajes sobre ellos.',
      oracle: 'Tira y edita tablas, oráculos, generadores y mazos de tus packs.',
      travel: 'Juega viajes sin mapa y edita las reglas de viaje y sus tablas.',
      sameSite: 'Las aplicaciones comparten tus packs cuando se sirven desde el mismo sitio.',
    },
  }
  const text = $derived(TEXT[locale as keyof typeof TEXT] ?? TEXT.en)
  let dialog: HTMLDialogElement
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
  <h2>{text.title}</h2>
  <ul>
    {#each APPS as app (app.id)}
      <li>
        {#if app.id === current}
          <div class="app here">
            <img src={appIconUrl(app.id)} alt="" />
            <span><strong>{app.name}</strong><small>{text.here}</small>{text[app.id]}</span>
          </div>
        {:else if app.available}
          <a class="app" href={appUrl(app.id)}>
            <img src={appIconUrl(app.id)} alt="" />
            <span><strong>{app.name}</strong>{text[app.id]}</span>
          </a>
        {:else}
          <div class="app soon">
            <img src={appIconUrl(app.id)} alt="" />
            <span><strong>{app.name}</strong><small>{text.soon}</small>{text[app.id]}</span>
          </div>
        {/if}
      </li>
    {/each}
  </ul>
  <p>{text.sameSite}</p>
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
    margin: 0 0 12px;
    font-family: Georgia, serif;
    font-size: 18px;
    font-weight: normal;
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

  .close {
    float: right;
    padding: 6px 14px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }
</style>

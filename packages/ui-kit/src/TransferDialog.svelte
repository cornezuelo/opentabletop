<script lang="ts">
  import {
    downloadExport,
    importChosen,
    importStatus,
    keptHere,
    keysOf,
    listItems,
    missing,
    pickExportFile,
    readExport,
    withMissing,
    type ImportStatus,
    type Item,
    type Kept,
    type Missing,
  } from '@open-tabletop/transfer'
  import { confirmAction } from './dialog.svelte'
  import { personalPacks } from './personalPacks'
  import { showToast } from './toasts.svelte'
  import { busy as busyButton } from './busy'
  import Spinner from './Spinner.svelte'

  /**
   * Export or import what the apps keep, choosing what goes: your packs, campaigns with
   * their maps and trips, the roster's characters, as a tree with ticks. What a ticked thing
   * needs and isn't ticked (a pack's dependency, a map's campaign, a trip's characters) is
   * said, with **Add what's missing**.
   */
  let { locale }: { locale: string } = $props()

  const TEXT = {
    en: {
      exportTitle: 'Export',
      importTitle: 'Import',
      exportHelp:
        'Choose what goes in the file: your packs, campaigns with their maps and trips, characters. Import it in another browser or computer with **Import…**. The packs that come with the apps aren’t in it: every copy of OpenTabletop has them. Preferences and histories go only in backups.',
      importHelp:
        'Choose what to bring in. What’s new is ticked; what you have already, the same, is left as it is; ticking what differs from yours replaces yours.',
      reading: 'Reading…',
      packs: 'Your packs',
      campaigns: 'Campaigns',
      loose: 'Maps and trips',
      characters: 'Characters',
      pack: 'Pack',
      campaign: 'Campaign',
      map: 'Map',
      trip: 'Trip',
      character: 'Character',
      unnamed: 'No name',
      nothing: 'Nothing kept here to export yet.',
      new: 'New',
      same: 'Already here',
      changed: 'Replaces yours',
      personal: 'Personal use',
      personalWarning:
        'Some packs are for personal use only: their licence doesn’t let you share this file.',
      missingTitle: 'Left out',
      dependency: '{item} depends on {target}.',
      campaignNeed: '{item} plays in {target}.',
      system: '{item} is played with {target}.',
      packsNeed: '{item} adds {target} to its system.',
      member: '{target} plays in {item}.',
      place: '{item} plays in {target}.',
      partyNeed: '{target} is in the party {item}.',
      addMissing: 'Add what’s missing',
      all: 'All',
      none: 'None',
      cancel: 'Cancel',
      export: 'Export ({n})',
      import: 'Import ({n})',
      exported: 'Export saved: {n} things.',
      failed: 'It could not be done: {error}',
      invalid: 'That file is not an OpenTabletop export.',
      newer: 'That export was made by a newer version of OpenTabletop.',
      replaceTitle: 'Replace yours?',
      replaceMessage:
        '{n} of the things you chose replace yours with the file’s. This can’t be undone. Close other OpenTabletop tabs first.',
      replace: 'Replace them',
      imported: 'Imported. Reloading…',
    },
    es: {
      exportTitle: 'Exportar',
      importTitle: 'Importar',
      exportHelp:
        'Elige qué va en el fichero: tus packs, campañas con sus mapas y viajes, personajes. Impórtalo en otro navegador u ordenador con **Importar…**. Los packs que traen las aplicaciones no van: toda copia de OpenTabletop los tiene. Las preferencias y los historiales solo van en las copias de seguridad.',
      importHelp:
        'Elige qué traer. Lo nuevo va marcado; lo que ya tienes, igual, se queda como está; marcar lo que difiere de lo tuyo sustituye lo tuyo.',
      reading: 'Leyendo…',
      packs: 'Tus packs',
      campaigns: 'Campañas',
      loose: 'Mapas y viajes',
      characters: 'Personajes',
      pack: 'Pack',
      campaign: 'Campaña',
      map: 'Mapa',
      trip: 'Viaje',
      character: 'Personaje',
      unnamed: 'Sin nombre',
      nothing: 'Aún no hay nada guardado aquí que exportar.',
      new: 'Nuevo',
      same: 'Ya está',
      changed: 'Sustituye lo tuyo',
      personal: 'Uso personal',
      personalWarning:
        'Algunos packs son solo para uso personal: su licencia no te deja compartir este fichero.',
      missingTitle: 'Se queda fuera',
      dependency: '{item} depende de {target}.',
      campaignNeed: '{item} se juega en {target}.',
      system: '{item} se juega con {target}.',
      packsNeed: '{item} añade {target} a su sistema.',
      member: '{target} juega en {item}.',
      place: '{item} juega en {target}.',
      partyNeed: '{target} está en el grupo {item}.',
      addMissing: 'Añadir lo que falta',
      all: 'Todo',
      none: 'Nada',
      cancel: 'Cancelar',
      export: 'Exportar ({n})',
      import: 'Importar ({n})',
      exported: 'Exportación guardada: {n} cosas.',
      failed: 'No se pudo hacer: {error}',
      invalid: 'Ese fichero no es una exportación de OpenTabletop.',
      newer: 'Esa exportación la hizo una versión más reciente de OpenTabletop.',
      replaceTitle: '¿Sustituir lo tuyo?',
      replaceMessage:
        '{n} de las cosas que elegiste sustituyen las tuyas por las del fichero. No se puede deshacer. Cierra antes otras pestañas de OpenTabletop.',
      replace: 'Sustituirlas',
      imported: 'Importado. Recargando…',
    },
  }
  const text = $derived(TEXT[locale as keyof typeof TEXT] ?? TEXT.en)

  let element: HTMLDialogElement
  let mode = $state<'export' | 'import'>('export')
  let busy = $state(false)
  let kept = $state.raw<Kept | undefined>()
  let items = $state.raw<Item[]>([])
  let chosen = $state.raw<Set<string>>(new Set())
  /** On importing: what each thing would do here, and what's here already. */
  let status = $state.raw<Map<string, ImportStatus>>(new Map())
  let present = $state.raw<Set<string>>(new Set())

  const fill = (message: string, values: Record<string, string | number>) =>
    message.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''))
  const reason = (error: unknown) => (error instanceof Error ? error.message : String(error))

  /** Opens the dialog to export what this browser keeps. */
  export async function openExport(): Promise<void> {
    mode = 'export'
    busy = true
    kept = undefined
    items = []
    element.showModal()
    try {
      const here = await keptHere()
      kept = here.kept
      items = listItems(here.kept, personalPacks())
      status = new Map()
      present = new Set()
      chosen = new Set(items.map((i) => i.key))
    } catch (error) {
      element.close()
      showToast(fill(text.failed, { error: reason(error) }), 'error', 8000)
    } finally {
      busy = false
    }
  }

  /** Asks for an export's file and opens the dialog to choose what to import. */
  export async function openImport(): Promise<void> {
    const data = await pickExportFile()
    if (!data) return
    const read = readExport(data)
    if (!read.kept) {
      showToast(read.error === 'newer' ? text.newer : text.invalid, 'error')
      return
    }
    mode = 'import'
    busy = true
    try {
      const here = await keptHere()
      kept = read.kept
      items = listItems(read.kept, personalPacks())
      status = importStatus(here.kept, read.kept)
      present = keysOf(here.kept)
      chosen = new Set(items.filter((i) => status.get(i.key) === 'new').map((i) => i.key))
      element.showModal()
    } catch (error) {
      showToast(fill(text.failed, { error: reason(error) }), 'error', 8000)
    } finally {
      busy = false
    }
  }

  const disabled = (item: Item) => mode === 'import' && status.get(item.key) === 'same'

  /** The tree: groups of items, a campaign's maps and trips under it. */
  const groups = $derived.by(() => {
    const children = (campaign: string) => items.filter((i) => i.campaign === campaign)
    return [
      { id: 'packs', label: text.packs, rows: items.filter((i) => i.kind === 'pack') },
      {
        id: 'campaigns',
        label: text.campaigns,
        rows: items.filter((i) => i.kind === 'campaign').flatMap((c) => [c, ...children(c.key)]),
      },
      {
        id: 'loose',
        label: text.loose,
        rows: items.filter((i) => (i.kind === 'map' || i.kind === 'trip') && !i.campaign),
      },
      {
        id: 'characters',
        label: text.characters,
        rows: items.filter((i) => i.kind === 'character'),
      },
    ].filter((g) => g.rows.length)
  })

  const left: Missing[] = $derived(missing(items, chosen, present))
  const personalChosen = $derived(
    mode === 'export' && items.some((i) => i.personal && chosen.has(i.key)),
  )

  function set(keys: string[], on: boolean) {
    chosen = new Set(on ? [...chosen, ...keys] : [...chosen].filter((key) => !keys.includes(key)))
  }

  /** Ticking a campaign ticks its maps and trips too. */
  function toggle(item: Item, on: boolean) {
    const nested = item.kind === 'campaign' ? items.filter((i) => i.campaign === item.key) : []
    set(
      [item, ...nested].filter((i) => !disabled(i)).map((i) => i.key),
      on,
    )
  }

  const nameOf = (item: Item) => item.name || text.unnamed
  const labelOf = (item: Item) => `${text[item.kind]} «${nameOf(item)}»`

  function missingText(m: Missing): string {
    const message = {
      dependency: text.dependency,
      campaign: text.campaignNeed,
      system: text.system,
      packs: text.packsNeed,
      member: text.member,
      place: text.place,
      party: text.partyNeed,
    }[m.need.why]
    return fill(message, { item: labelOf(m.item), target: labelOf(m.target) })
  }

  /** Sets a checkbox half-ticked. */
  function indeterminate(node: HTMLInputElement, value: boolean) {
    node.indeterminate = value
    return { update: (v: boolean) => (node.indeterminate = v) }
  }

  async function finish() {
    if (!kept) return
    if (mode === 'export') {
      downloadExport(kept, chosen)
      showToast(fill(text.exported, { n: chosen.size }))
      element.close()
      return
    }
    const replacing = [...chosen].filter((key) => status.get(key) === 'changed').length
    if (
      replacing &&
      !(await confirmAction(fill(text.replaceMessage, { n: replacing }), {
        title: text.replaceTitle,
        confirm: text.replace,
        danger: true,
      }))
    )
      return
    busy = true
    try {
      await importChosen(kept, chosen)
      element.close()
      showToast(text.imported)
      // Every app reads its data on start: reload to see what came in.
      setTimeout(() => location.reload(), 800)
    } catch (error) {
      showToast(fill(text.failed, { error: reason(error) }), 'error', 8000)
    } finally {
      busy = false
    }
  }
</script>

<dialog bind:this={element} onclick={(e) => e.target === element && !busy && element.close()}>
  <h2>{mode === 'export' ? text.exportTitle : text.importTitle}</h2>
  <p class="help">
    {#each (mode === 'export' ? text.exportHelp : text.importHelp).split('**') as part, i (i)}{#if i % 2}<strong
          >{part}</strong
        >{:else}{part}{/if}{/each}
  </p>

  {#if busy && !items.length}
    <p><Spinner label={text.reading} shown /></p>
  {:else if !items.length}
    <p>{text.nothing}</p>
  {:else}
    <div class="tree">
      {#each groups as group (group.id)}
        {@const free = group.rows.filter((r) => !disabled(r))}
        {@const ticked = free.filter((r) => chosen.has(r.key)).length}
        <section>
          <label class="group">
            <input
              type="checkbox"
              checked={free.length > 0 && ticked === free.length}
              disabled={!free.length}
              use:indeterminate={ticked > 0 && ticked < free.length}
              onchange={(e) =>
                set(
                  free.map((r) => r.key),
                  e.currentTarget.checked,
                )}
            />
            <strong>{group.label}</strong>
            <small>{group.rows.length}</small>
          </label>
          <ul>
            {#each group.rows as item (item.key)}
              {@const change = status.get(item.key)}
              <li class:nested={!!item.campaign && group.id === 'campaigns'}>
                <label class:off={disabled(item)}>
                  <input
                    type="checkbox"
                    checked={chosen.has(item.key)}
                    disabled={disabled(item)}
                    onchange={(e) => toggle(item, e.currentTarget.checked)}
                  />
                  <span class="name">{nameOf(item)}</span>
                  {#if item.kind === 'map' || item.kind === 'trip'}
                    <small>{text[item.kind]}</small>
                  {/if}
                  {#if item.personal}<span class="badge warn">{text.personal}</span>{/if}
                  {#if change}<span class="badge {change}">{text[change]}</span>{/if}
                </label>
              </li>
            {/each}
          </ul>
        </section>
      {/each}
    </div>

    {#if personalChosen}
      <p class="warning">{text.personalWarning}</p>
    {/if}
    {#if left.length}
      <div class="missing">
        <strong>{text.missingTitle}</strong>
        <ul>
          {#each left as m (`${m.item.key}>${m.target.key}`)}
            <li>{missingText(m)}</li>
          {/each}
        </ul>
        <button onclick={() => (chosen = withMissing(items, chosen, present))}
          >{text.addMissing}</button
        >
      </div>
    {/if}
  {/if}

  <div class="buttons">
    <button
      class="plain"
      disabled={!items.length}
      onclick={() =>
        set(
          items.filter((i) => !disabled(i)).map((i) => i.key),
          true,
        )}>{text.all}</button
    >
    <button class="plain" disabled={!items.length} onclick={() => (chosen = new Set())}
      >{text.none}</button
    >
    <span class="gap"></span>
    <button disabled={busy} onclick={() => element.close()}>{text.cancel}</button>
    <button
      class="primary"
      disabled={busy || !chosen.size}
      use:busyButton={busy && !!items.length}
      onclick={finish}
      >{fill(mode === 'export' ? text.export : text.import, { n: chosen.size })}</button
    >
  </div>
</dialog>

<style>
  dialog {
    width: min(560px, calc(100vw - 32px));
    max-height: calc(100vh - 48px);
    padding: 18px;
    color: var(--text);
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
  }

  dialog[open] {
    display: flex;
    flex-direction: column;
  }

  dialog::backdrop {
    background: rgb(0 0 0 / 0.5);
  }

  h2 {
    margin: 0 0 8px;
    font-family: Georgia, serif;
    font-size: 18px;
    font-weight: normal;
  }

  p {
    margin: 0 0 10px;
    font-size: 13px;
    color: var(--text-muted);
  }

  .help strong {
    color: var(--text);
  }

  .tree {
    flex: 1 1 auto;
    min-height: 80px;
    overflow-y: auto;
    padding: 8px;
    border: 1px solid var(--panel-border);
    border-radius: 6px;
  }

  section + section {
    margin-top: 10px;
  }

  ul {
    margin: 2px 0 0;
    padding: 0;
    list-style: none;
  }

  li {
    padding-left: 20px;
  }

  li.nested {
    padding-left: 40px;
  }

  label {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 3px 0;
    font-size: 13px;
    cursor: pointer;
  }

  label.off {
    cursor: default;
    opacity: 0.6;
  }

  .group strong {
    font-family: Georgia, serif;
    font-size: 14px;
    font-weight: normal;
  }

  small {
    color: var(--text-muted);
  }

  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .badge {
    flex: none;
    padding: 0 6px;
    font-size: 11px;
    border: 1px solid var(--panel-border);
    border-radius: 9px;
  }

  .badge.new {
    color: var(--accent);
    border-color: var(--accent);
  }

  .badge.changed,
  .badge.warn {
    color: var(--warning);
    border-color: var(--warning);
  }

  .badge.same {
    color: var(--text-muted);
  }

  .warning {
    margin: 10px 0 0;
    color: var(--warning);
  }

  .missing {
    margin-top: 10px;
    padding: 8px 10px;
    font-size: 13px;
    border: 1px solid var(--warning);
    border-radius: 6px;
  }

  .missing strong {
    color: var(--warning);
    font-weight: normal;
  }

  .missing ul {
    margin: 4px 0 8px;
    max-height: 120px;
    overflow-y: auto;
  }

  .missing li {
    padding: 1px 0;
    color: var(--text-muted);
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }

  .gap {
    flex: 1;
  }

  button {
    padding: 6px 14px;
    color: var(--text);
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  button:hover:not(:disabled) {
    border-color: var(--accent);
  }

  button.plain {
    padding: 6px 8px;
    background: transparent;
    border-color: transparent;
    color: var(--text-muted);
  }

  button.primary {
    color: var(--accent);
    border-color: var(--accent);
  }
</style>

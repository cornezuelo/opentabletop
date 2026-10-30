<script lang="ts">
  import { itemName, roster, sheetText } from '@open-tabletop/character-ui'
  import { rosterEntry, type RosterEntry } from '@open-tabletop/session'
  import { Markdown, showToast, tooltip } from '@open-tabletop/ui-kit'
  import { partyStart, splitTheParty } from '../lib/actions'
  import { getLocale, t } from '../lib/i18n'
  import { go } from '../lib/nav.svelte'
  import type { CharacterSystem } from '../lib/packs.svelte'

  /**
   * **Split the party**: who goes, and what each side has of each value and item. The new
   * party starts as any new one of its sheet; the dialog knows no value: the player decides.
   */
  let {
    entry,
    system,
    onclose,
  }: { entry: RosterEntry; system: CharacterSystem; onclose: () => void } = $props()

  let element = $state<HTMLDialogElement>()
  const party = $derived(entry.character)
  const label = (e: RosterEntry) => e.character.name || e.character.id
  // What the dialog starts from (the party as it was when it opened).
  // svelte-ignore state_referenced_locally
  const start = partyStart(system, 'split')
  // svelte-ignore state_referenced_locally
  const sheet = system.partySheet!.def
  /** The values a player may split: those not made of others. */
  const valueIds = Object.keys(sheet.values).filter((v) => sheet.values[v].from === undefined)
  /** Items at the top (what's inside one goes with it when it goes whole). */
  const items = $derived(
    (party.items ?? []).filter(
      (i) => !i.place || !(party.items ?? []).some((x) => x.key === i.place),
    ),
  )

  // svelte-ignore state_referenced_locally
  let name = $state(t('party.newNameValue', { name: label(entry) }))
  let going = $state<string[]>([])
  let values = $state(
    Object.fromEntries(
      valueIds.map((v) => [v, { stays: party.values[v] ?? 0, goes: start.values[v] ?? 0 }]),
    ),
  )
  let itemsGoing = $state<Record<string, number>>({})

  $effect(() => {
    element?.showModal()
  })

  const members = $derived(
    (entry.members ?? []).flatMap((m) => {
      const e = rosterEntry(roster.roster, m)
      return e ? [e] : []
    }),
  )

  function half(v: string) {
    const all = party.values[v] ?? 0
    values[v] = { stays: Math.ceil(all / 2), goes: Math.floor(all / 2) }
  }

  function split() {
    const id = splitTheParty(party.id, {
      name: name.trim() || label(entry),
      members: going,
      start: { ...start, name: name.trim() },
      values: $state.snapshot(values),
      items: $state.snapshot(itemsGoing),
    })
    showToast(t('party.splitDone', { name: name.trim() }))
    element?.close()
    go({ name: 'character', id })
  }

  const valueName = (v: string) => sheetText(sheet.values[v].name, getLocale()) ?? v
</script>

<dialog bind:this={element} {onclose}>
  <h2>{t('party.splitTitle', { name: label(entry) })}</h2>
  <div class="help"><Markdown text={t('party.splitHelp')} /></div>
  <label class="field">
    <span>{t('party.newName')}</span>
    <input type="text" bind:value={name} />
  </label>
  {#if members.length}
    <fieldset>
      <legend>{t('party.who')}</legend>
      {#each members as m (m.character.id)}
        <label class="check">
          <input type="checkbox" value={m.character.id} bind:group={going} />
          {label(m)}
        </label>
      {/each}
    </fieldset>
  {/if}
  {#if valueIds.length}
    <table>
      <thead>
        <tr>
          <th>{t('party.value')}</th>
          <th>{t('party.stays')}</th>
          <th>{t('party.goes')}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each valueIds as v (v)}
          <tr>
            <td>{valueName(v)}</td>
            <td><input type="number" bind:value={values[v].stays} /></td>
            <td><input type="number" bind:value={values[v].goes} /></td>
            <td class="tools">
              <button
                aria-label={t('party.same')}
                use:tooltip={t('party.same')}
                onclick={() =>
                  (values[v] = { stays: party.values[v] ?? 0, goes: party.values[v] ?? 0 })}
                >=</button
              >
              <button
                aria-label={t('party.half')}
                use:tooltip={t('party.half')}
                onclick={() => half(v)}>½</button
              >
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
  {#if items.length}
    <table>
      <thead>
        <tr>
          <th>{t('party.items')}</th>
          <th>{t('party.itemGoes')}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each items as item (item.key)}
          <tr>
            <td>{itemName(item, system.items ?? [], getLocale())} ×{item.count}</td>
            <td>
              <input
                type="number"
                min="0"
                max={item.count}
                value={itemsGoing[item.key] ?? 0}
                onchange={(e) =>
                  (itemsGoing[item.key] = Math.max(
                    0,
                    Math.min(item.count, Number(e.currentTarget.value) || 0),
                  ))}
              />
            </td>
            <td class="tools">
              <button
                aria-label={t('party.half')}
                use:tooltip={t('party.half')}
                onclick={() => (itemsGoing[item.key] = Math.floor(item.count / 2))}>½</button
              >
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
  <div class="buttons">
    <button class="button" onclick={() => element?.close()}>{t('party.cancel')}</button>
    <button class="button primary" disabled={!name.trim()} onclick={split}
      >{t('party.doSplit')}</button
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
    gap: 12px;
  }

  dialog::backdrop {
    background: rgb(0 0 0 / 0.5);
  }

  h2 {
    margin: 0;
    font-family: Georgia, serif;
    font-size: 18px;
    font-weight: normal;
  }

  .help {
    font-size: 13px;
    color: var(--text-muted);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  fieldset {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    border: 1px solid var(--panel-border);
    border-radius: 6px;
  }

  table {
    border-collapse: collapse;
    font-size: 13px;
  }

  th {
    font-weight: normal;
    color: var(--text-muted);
    text-align: left;
  }

  td input {
    width: 70px;
  }

  .tools button {
    padding: 2px 6px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
    cursor: pointer;
  }

  .buttons {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
  }

  .buttons .primary {
    color: var(--accent-contrast, #fff);
    background: var(--accent);
    border-color: var(--accent);
  }
</style>

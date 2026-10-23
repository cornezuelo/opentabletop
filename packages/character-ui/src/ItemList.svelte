<script lang="ts">
  import {
    fieldBounds,
    fitsIn,
    hasRoom,
    itemFromCatalogue,
    placesOf,
    roomUsed,
    sizeOf,
    type Catalogue,
    type CharacterAction,
    type CharacterState,
    type ItemState,
    type Place,
    type Sheet,
  } from '@open-tabletop/character-engine'
  import { InfoTip, SuggestInput, tooltip } from '@open-tabletop/ui-kit'
  import { valueView } from './display'
  import { translator } from './i18n'
  import { idName, itemId, itemName, sheetText } from './texts'
  import ValueControl from './ValueControl.svelte'

  /**
   * What a character has: its items, grouped by the places the sheet declares (and its own,
   * and the containers it carries), each with its count and the fields the sheet gives
   * items, moved, changed, dropped or added from the system's catalogues or by hand. Every
   * change goes through the character engine (`onaction`).
   */
  let {
    sheet,
    character,
    catalogues = [],
    locale,
    disabled = false,
    path,
    onaction,
  }: {
    sheet: Sheet
    character: CharacterState
    /** The system's item catalogues, to add from. */
    catalogues?: readonly { id: string; def: Catalogue }[]
    locale: string
    disabled?: boolean
    /** How tables reach this character (`characters.kael`). */
    path: string
    onaction: (action: CharacterAction) => void
  } = $props()

  const t = translator(() => locale)
  const text = (value: Parameters<typeof sheetText>[0], fallback = '') =>
    sheetText(value, locale) ?? (fallback ? idName(fallback) : '')

  const items = $derived(character.items ?? [])
  const fields = $derived(Object.entries(sheet.items?.fields ?? {}))
  const places = $derived(placesOf(sheet.items, character))
  const used = $derived(roomUsed(sheet.items, character))
  const nameOf = (item: ItemState) => itemName(item, catalogues, locale)
  /** A place's name: the sheet's, its own, or the container's. */
  function placeName(p: Place): string {
    if (p.item !== undefined) {
      const holder = items.find((i) => i.key === p.item)
      return t('items.inside', { name: holder ? nameOf(holder) : p.id })
    }
    return text(p.name as Parameters<typeof sheetText>[0], p.id)
  }
  /** The groups shown: each place with what's right in it, then what's in none. */
  const groups = $derived.by(() => {
    const ids = new Set(places.map((p) => p.id))
    const out: { place?: Place; items: ItemState[] }[] = places
      .filter((p) => p.item === undefined || items.some((i) => i.key === p.item))
      .map((place) => ({ place, items: items.filter((i) => i.place === place.id) }))
    const loose = items.filter((i) => i.place === undefined || !ids.has(i.place))
    if (loose.length || !places.length) out.push({ items: loose })
    return out
  })

  /** Whether `count` of an item (all of them, if none) may go to a place: it fits and has room. */
  const takes = (place: Place, item: ItemState, count = item.count) =>
    place.id === item.place ||
    (fitsIn(item, place, items) &&
      hasRoom(
        sheet.items,
        character,
        place,
        sizeOf(sheet.items, { ...item, count }),
        count < item.count ? undefined : item.key,
      ))
  /** The places an item may be moved to (where it is, and those with room for it). */
  const fitting = (item: ItemState) => places.filter((p) => takes(p, item))

  /** The item being dragged, if any; a drop with Shift held moves only one of it. */
  let dragging = $state<ItemState>()
  /** The place a drag is over (`''`: in no place). */
  let dragOver = $state<string>()
  const DRAG = 'application/x-opentabletop-item'
  const accepts = (place: Place | undefined, item: ItemState, one = false) =>
    place === undefined ? item.place !== undefined || one : takes(place, item, one ? 1 : item.count)
  function startDrag(e: DragEvent, item: ItemState) {
    dragging = item
    e.dataTransfer?.setData(DRAG, item.key)
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
  }
  function overPlace(e: DragEvent, place: Place | undefined) {
    if (!dragging || !e.dataTransfer?.types.includes(DRAG)) return
    if (!accepts(place, dragging, e.shiftKey)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    dragOver = place?.id ?? ''
  }
  function dropOn(e: DragEvent, place: Place | undefined) {
    const item = dragging
    dragging = dragOver = undefined
    if (!item || !accepts(place, item, e.shiftKey)) return
    e.preventDefault()
    const one = e.shiftKey && item.count > 1
    if (place?.id === item.place && !one) return
    onaction({
      type: 'moveItem',
      key: item.key,
      place: place?.id,
      ...(one && { count: 1 }),
    })
  }

  /** What the catalogues offer, by name. */
  const offered = $derived(
    catalogues.flatMap((c) =>
      Object.entries(c.def.items).map(([id, def]) => ({
        catalogue: c.id,
        id,
        def,
        name: text(def.name, id),
      })),
    ),
  )
  let adding = $state('')
  function add() {
    const typed = adding.trim()
    if (!typed) return
    const found = offered.find((o) => o.name === typed || o.id === typed)
    onaction({
      type: 'addItem',
      item: found
        ? itemFromCatalogue(sheet.items, found.catalogue, found.id, found.def)
        : { id: itemId(typed), name: typed, count: 1 },
    })
    adding = ''
  }

  let placeName_ = $state('')
  let placeRoom = $state('')
  let placeTags = $state('')
  function addPlace() {
    const name = placeName_.trim()
    if (!name) return
    const room = Number(placeRoom)
    const tags = placeTags
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
    onaction({
      type: 'setPlace',
      id: itemId(name),
      place: {
        name,
        ...(tags.length && { tags }),
        ...(placeRoom.trim() && Number.isFinite(room) && { room }),
      },
    })
    placeName_ = placeRoom = placeTags = ''
  }

  /** An item's explanation: its description, tags and how tables read it. */
  function itemHelp(item: ItemState): string {
    const catalogue = catalogues.find((c) => c.id === item.from)
    const def = catalogue?.def.items[item.id]
    return [
      text(def?.description),
      item.tags?.length && t('items.tagsOf', { list: item.tags.join(', ') }),
      !item.from && t('items.byHand'),
      t('items.readAs', { path, id: item.id, field: fields[0]?.[0] ?? 'count' }),
    ]
      .filter(Boolean)
      .join('\n\n')
  }
  function fieldHelp(id: string): string {
    const def = sheet.items?.fields?.[id]
    return [text(def?.description), def?.spent && t('items.spent')].filter(Boolean).join('\n\n')
  }
</script>

<div class="items">
  {#each groups as group (group.place?.id ?? '')}
    <section
      class="place"
      class:target={dragOver === (group.place?.id ?? '')}
      class:dimmed={dragging && !accepts(group.place, dragging)}
      aria-label={group.place ? placeName(group.place) : t('items.nowhere')}
      ondragover={(e) => overPlace(e, group.place)}
      ondragleave={() => (dragOver = undefined)}
      ondrop={(e) => dropOn(e, group.place)}
    >
      {#if group.place}
        {@const room = group.place.room}
        {@const full = used[group.place.id] ?? 0}
        <h5 class="subhead">
          {placeName(group.place)}
          {#if room !== undefined}<span class="room" class:over={full > room}
              >{t('items.room', { used: full, room })}</span
            >{/if}
          {#if !disabled && group.place.item === undefined && character.places?.[group.place.id]}
            <button
              class="icon"
              aria-label={t('items.removePlace')}
              use:tooltip={t('items.removePlace')}
              onclick={() => onaction({ type: 'setPlace', id: group.place!.id, place: null })}
              >×</button
            >
          {/if}
        </h5>
      {:else if places.length}
        <h5 class="subhead">{t('items.nowhere')}</h5>
      {/if}
      {#each group.items as item (item.key)}
        <div class="item" class:moving={dragging?.key === item.key}>
          {#if !disabled && (places.length || item.count > 1)}
            <span
              class="grip"
              role="button"
              tabindex="-1"
              aria-label={t('items.drag')}
              draggable="true"
              ondragstart={(e) => startDrag(e, item)}
              ondragend={() => (dragging = dragOver = undefined)}
              use:tooltip={t('items.drag')}>⠿</span
            >
          {/if}
          <span class="item-name">{nameOf(item)}<InfoTip markdown={itemHelp(item)} /></span>
          <label class="count">
            <span>{t('items.count')}</span>
            <input
              type="number"
              min="0"
              step="1"
              value={item.count}
              {disabled}
              onchange={(e) =>
                onaction({
                  type: 'editItem',
                  key: item.key,
                  count: `=${Math.max(0, Number(e.currentTarget.value) || 0)}`,
                })}
            />
          </label>
          {#each fields as [id, def] (id)}
            {#if item.fields[id] !== undefined}
              <div class="item-field">
                <span
                  >{text(def.name, id)}{#if fieldHelp(id)}<InfoTip
                      markdown={fieldHelp(id)}
                    />{/if}</span
                >
                <ValueControl
                  view={valueView(
                    def,
                    item.fields[id],
                    fieldBounds(sheet.items, id, character.values),
                    locale,
                  )}
                  label={text(def.name, id)}
                  {locale}
                  {disabled}
                  onset={(v) =>
                    onaction({ type: 'editItem', key: item.key, fields: { [id]: `=${v}` } })}
                />
              </div>
            {/if}
          {/each}
          {#if places.length}
            <select
              aria-label={t('items.moveTo')}
              value={item.place ?? ''}
              {disabled}
              onchange={(e) =>
                onaction({
                  type: 'moveItem',
                  key: item.key,
                  place: e.currentTarget.value || undefined,
                })}
            >
              <option value="">{t('items.nowhere')}</option>
              {#each fitting(item) as p (p.id)}<option value={p.id}>{placeName(p)}</option>{/each}
            </select>
          {/if}
          {#if !disabled}
            <button
              class="icon"
              aria-label={t('items.remove')}
              use:tooltip={t('items.remove')}
              onclick={() => onaction({ type: 'removeItem', key: item.key })}>×</button
            >
          {/if}
        </div>
      {:else}
        <p class="empty">{t('items.empty')}</p>
      {/each}
    </section>
  {/each}

  {#if !disabled}
    <form
      class="add"
      onsubmit={(e) => {
        e.preventDefault()
        add()
      }}
    >
      <SuggestInput
        label={t('items.add')}
        placeholder={offered.length ? t('items.addPlaceholder') : t('items.addByHand')}
        value={adding}
        list={offered.map((o) => o.name)}
        onchange={(v) => (adding = v)}
      />
      <button type="submit">{t('items.addButton')}</button>
    </form>
    {#if sheet.items?.places}
      <details class="own">
        <summary>{t('items.ownPlaces')}<InfoTip markdown={t('items.ownPlacesHelp')} /></summary>
        <form
          class="add"
          onsubmit={(e) => {
            e.preventDefault()
            addPlace()
          }}
        >
          <input
            type="text"
            aria-label={t('items.placeName')}
            placeholder={t('items.placeName')}
            bind:value={placeName_}
          />
          <input
            type="text"
            aria-label={t('items.placeTags')}
            placeholder={t('items.placeTags')}
            bind:value={placeTags}
          />
          <input
            type="number"
            min="0"
            aria-label={t('items.placeRoom')}
            placeholder={t('items.placeRoom')}
            bind:value={placeRoom}
          />
          <button type="submit">{t('items.addPlace')}</button>
        </form>
      </details>
    {/if}
  {/if}
</div>

<style>
  .items {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .place {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 6px 8px;
    border: 1px solid var(--panel-border);
    border-radius: 6px;
  }

  .subhead {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
  }

  .room {
    color: var(--text-muted);
    font-weight: normal;
  }

  .room.over {
    color: var(--danger);
  }

  .place.target {
    border-color: var(--accent);
    box-shadow: inset 0 0 0 1px var(--accent);
  }

  .place.dimmed {
    opacity: 0.45;
  }

  .item.moving {
    opacity: 0.6;
  }

  .grip {
    align-self: center;
    padding: 0 2px;
    color: var(--text-muted);
    cursor: grab;
    user-select: none;
  }

  .item {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    gap: 4px 8px;
    color: var(--text);
  }

  .item-name {
    flex: 1 1 8em;
    align-self: center;
  }

  .count,
  .item-field {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 11px;
    color: var(--text-muted);
  }

  .count input {
    width: 4.5em;
  }

  .item-field {
    min-width: 5em;
  }

  .empty {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .add {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .add :global(input) {
    flex: 1;
    min-width: 8em;
  }

  .own summary {
    cursor: pointer;
    font-size: 12px;
    color: var(--text-muted);
  }

  .icon {
    padding: 0 5px;
    color: var(--text-muted);
    background: none;
    border: none;
    cursor: pointer;
  }
</style>

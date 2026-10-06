/**
 * Example maps bundled from examples/maps/ (OTD bundles, like any saved map). They open
 * as maps of the library, so play and changes are kept like on any other map.
 */
const files = import.meta.glob('../../../../../examples/maps/*.otd.json', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

export interface ExampleMap {
  /** Map id inside the bundle (also its id in the library). */
  id: string
  name: string
  json: string
}

export const EXAMPLE_MAPS: ExampleMap[] = Object.values(files).flatMap((json) => {
  try {
    const map = (JSON.parse(json) as { maps?: { id: string; name?: string }[] }).maps?.[0]
    return map ? [{ id: map.id, name: map.name ?? map.id, json }] : []
  } catch {
    return []
  }
})

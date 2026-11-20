/**
 * The images of the packs an app has loaded, by their full name (`<pack>/<path>`, a card's
 * picture): each app's pack library tells this once it's made (pack-ui's `PackLibrary`), so
 * what draws a pack's image anywhere (a card in a trip's journal) finds it without holding the
 * packs itself.
 */
let find: (ref: string) => string | undefined = () => undefined

/** Says how this app finds its packs' images (its library does, as it's made). */
export function setPackImages(finder: (ref: string) => string | undefined): void {
  find = finder
}

/** A pack's image as a URL to show, or undefined when no loaded pack has it. */
export function packImageUrl(ref: string | undefined): string | undefined {
  return ref ? find(ref) : undefined
}

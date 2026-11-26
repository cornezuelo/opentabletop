import type { en } from './en'

type Widen<T> = { -readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> }

/** The shape every language's dictionary has: the English one's, with any texts. */
export type Messages = Widen<typeof en>

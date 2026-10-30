import type { en } from './en'

type Widen<T> = { -readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> }

export type Messages = Widen<typeof en>

type Paths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>
}[keyof T & string]

export type MessageKey = Paths<Messages>

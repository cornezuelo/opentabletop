type Id = 'hexmapper' | 'oracle' | 'travel' | 'systems' | 'manual'

export const APP_LIST: { id: Id; name: string; devPort: number; available: boolean }[]
export const APP_ICON_SVGS: Record<Id, string>
export const APP_BLURBS: Record<'en' | 'es', Record<Id, string>>
export function logoSvg(framed?: boolean): string
export const FRAME: string

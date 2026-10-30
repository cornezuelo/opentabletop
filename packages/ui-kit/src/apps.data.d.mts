type Id = 'hexmapper' | 'campaign' | 'oracle' | 'travel' | 'characters' | 'systems' | 'manual'

export const APP_LIST: { id: Id; devPort: number; available: boolean }[]
export const APP_ICON_SVGS: Record<Id, string>
export const APP_NAMES: Record<'en' | 'es', Record<Id, string>>
export const APP_BLURBS: Record<'en' | 'es', Record<Id, string>>
export function logoSvg(framed?: boolean): string
export const FRAME: string
export const REPO: string

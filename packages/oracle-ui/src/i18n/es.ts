import type { Messages } from '@open-tabletop/ui-kit'
import type { en } from './en'

export const es: Messages<typeof en> = {
  roll: {
    roll: 'Tirar',
    draw: 'Robar',
    shuffle: 'Barajar',
    remaining: 'Quedan {left} de {total} cartas',
    context: 'Contexto',
    contextHelp:
      'Valores que lee esta definición, como el terreno o la estación. Los que la aplicación ya conoce aparecen en gris; escribe para cambiarlos. En blanco significa desconocido.',
    advantage: 'Ventaja',
    advantageHelp: 'Tira dos veces y quédate con la mejor (ventaja) o la peor (desventaja).',
    advantages: { normal: 'Normal', advantage: 'Ventaja', disadvantage: 'Desventaja' },
    nothing: 'No se aplica ninguna entrada. Revisa los valores del contexto.',
    entries: 'Entradas',
    weight: 'peso {weight}',
    then: 'luego {target}',
    conditional: 'solo si {condition}',
    dice: 'Dados',
    details: 'Detalles',
    error: 'No se pudo tirar: {message}',
    keyHint: 'Espacio o Intro vuelve a tirar',
  },
  history: {
    title: 'Historial',
    empty: 'Aquí aparecen tus tiradas.',
    clear: 'Borrar',
    resetState: 'Nueva sesión',
    resetStateTip:
      'Olvida las entradas que solo pueden salir una vez y devuelve a su mazo todas las cartas robadas.',
  },
  picker: {
    search: 'Buscar tablas…',
    none: 'No hay coincidencias.',
    choose: 'Elige una tabla, oráculo, generador o mazo para tirarlo.',
  },
}

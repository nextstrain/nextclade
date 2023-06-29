import memoize from 'fast-memoize'
import { isBoolean, isNil, isNumber, isString } from 'lodash'

export const getSafeId = memoize(getSafeIdImpl)

function getSafeIdImpl(name: string, obj: Record<string, unknown>) {
  const str = stringifyObj(obj).replace(/(\W+)/g, '-')
  return CSS.escape(`${name}___${str}`)
}

function stringifyObj(obj: object): string {
  return Object.entries(obj)
    .map(([key, val]) => {
      let valStr
      if (isNil(val)) {
        valStr = 'none'
      } else if (isString(val) || isNumber(val) || isBoolean(val)) {
        valStr = val
      } else {
        valStr = stringifyObj(val)
      }
      return `${key}_${valStr}`
    })
    .join('__')
}

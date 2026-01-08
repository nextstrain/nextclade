import { isBoolean, isNil, isNumber, isString, memoize } from 'lodash'

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

function getSafeIdImpl(name: string, obj: object) {
  const str = stringifyObj(obj).replace(/(\W+)/g, '-')
  return CSS.escape(`${name}___${str}`)
}

export const getSafeId = memoize(getSafeIdImpl, (name, obj) => `${name}__${stringifyObj(obj)}`)

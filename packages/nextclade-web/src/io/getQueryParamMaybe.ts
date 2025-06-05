import { isNil } from 'lodash'
import type { ParsedUrlQuery } from 'querystring'
import { takeFirstMaybe } from 'src/helpers/takeFirstMaybe'

export function getQueryParamMaybe(urlQuery: ParsedUrlQuery, param: string): string | undefined {
  return takeFirstMaybe(urlQuery?.[param]) ?? undefined
}

export function isQueryParamTruthy(urlQuery: ParsedUrlQuery, param: string): boolean {
  const value = getQueryParamMaybe(urlQuery, param)
  return !isNil(value) && new Set(['', 'true', '1', 'yes', 'on']).has(value.toLowerCase())
}

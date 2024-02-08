import type { StringMap, TOptions } from 'i18next'
import { useTranslation } from 'react-i18next'

export function useTranslationSafe<TInterpolationMap extends object = StringMap>() {
  const response = useTranslation()

  function t(key: string, options?: TOptions<TInterpolationMap> | string) {
    return response.t(key, options) ?? key
  }

  return { ...response, t }
}

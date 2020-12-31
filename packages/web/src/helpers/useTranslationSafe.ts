/* eslint-disable @typescript-eslint/ban-types */
import { StringMap, TOptions } from 'i18next'
import { Namespace, useTranslation, UseTranslationOptions } from 'react-i18next'

export function useTranslationSafe<TInterpolationMap extends object = StringMap>(
  ns?: Namespace,
  options?: UseTranslationOptions,
) {
  const response = useTranslation()

  function t(key: string, options?: TOptions<TInterpolationMap> | string) {
    return response.t(key, options) ?? key
  }

  return { ...response, t }
}

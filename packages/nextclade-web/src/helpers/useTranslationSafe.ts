import type { TOptions } from 'i18next'
import { useTranslation } from 'react-i18next'

export type TFunc = (key: string, options?: string | TOptions | undefined) => string

export function useTranslationSafe(): { t: TFunc } {
  const response = useTranslation()

  function t(key: string, options?: TOptions | string) {
    return response.t(key, options) ?? key
  }

  return { ...response, t }
}

import type { TFunctionInterface } from 'src/helpers/TFunctionInterface'

export function getHttpStatusText(t: TFunctionInterface, status: number): string | undefined {
  const statusTexts = new Map<number, string>([
    [200, t('Success')],
    [400, t('Bad Request. The server cannot or will not process the request due to client error.')],
    [401, t('Unauthorized. Authentication is required in order to use this resource.')],
    [403, t("Forbidden. You don't have necessary permissions to access this resource.")],
    [404, t('The requested resource was not found. Please check the correctness of the address.')],
  ])

  if (status >= 500) {
    return t('Server error. There was an error on the remote server.')
  }

  return statusTexts.get(status)
}

import { URL } from 'url'

export function isValidHttpUrl(urlDangerous: string) {
  try {
    const url = new URL(urlDangerous)

    if (!url.protocol || !['http:', 'https:'].includes(url.protocol.toLowerCase())) {
      return false
    }

    if (!url.host || url.host.length === 0) {
      return false
    }
  } catch {
    return false
  }

  return true
}

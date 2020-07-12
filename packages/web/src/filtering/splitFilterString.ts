const FILTER_DELIMITERS = /[\n\r,;]/gi

export function splitFilterString(filter: string) {
  return filter
    .split(FILTER_DELIMITERS)
    .map((f) => f.trim())
    .filter((f) => f !== '')
}

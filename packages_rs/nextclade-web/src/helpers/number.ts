export function ensureNumber(x?: boolean | number | null): number {
  if (!x || typeof x === 'boolean') {
    return 0
  }
  return x
}

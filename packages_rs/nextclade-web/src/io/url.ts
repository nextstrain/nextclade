export function removeTrailingSlash(s: string): string {
  return s.endsWith('/') ? s.slice(0, Math.max(0, s.length - 1)) : s
}

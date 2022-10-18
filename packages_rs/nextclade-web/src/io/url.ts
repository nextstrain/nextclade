export function removeLeading(s: string, c: string): string {
  return s.startsWith(c) ? s.slice(1) : s
}

export function removeTrailing(s: string, c: string): string {
  return s.endsWith(c) ? s.slice(0, Math.max(0, s.length - 1)) : s
}

export function removeLeadingAndTrailing(s: string, c: string): string {
  return removeLeading(removeTrailing(s, c), c)
}

export function removeLeadingSlash(s: string): string {
  return removeLeading(s, '/')
}

export function removeTrailingSlash(s: string): string {
  return removeTrailing(s, '/')
}

export function removeTrailingAndLeadingSlash(s: string): string {
  return removeLeadingAndTrailing(s, '/')
}

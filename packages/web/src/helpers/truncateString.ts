export function truncateString(s: string, maxLen: number) {
  const truncatedText = '... (truncated)'
  const targetLength = maxLen - truncatedText.length
  if (s.length > targetLength) {
    return s.slice(0, targetLength).concat(truncatedText)
  }
  return s
}

export function getSafeId(name: string, obj: Record<string, unknown>) {
  const str = Object.values(obj).join('_').replace(/(\W+)/g, '-')
  return CSS.escape(`${name}_${str}`)
}

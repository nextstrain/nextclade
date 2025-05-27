export function splitToRows<T>(arr: T[], { rowLength, maxRows }: { rowLength?: number; maxRows?: number }) {
  const n = arr.length
  if (n === 0) {
    return []
  }

  const rowSize = rowLength ?? Math.ceil(maxRows ? n / maxRows : 1)
  const rows: T[][] = []
  for (let i = 0; ; i += rowSize) {
    const row = arr.slice(i, i + rowSize)
    rows.push(row)
    if (i > n) {
      break
    }
  }
  return rows
}

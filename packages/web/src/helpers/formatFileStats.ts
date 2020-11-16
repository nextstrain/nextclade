import { numbro } from 'src/i18n/i18n'

import type { FileStats } from 'src/state/algorithm/algorithm.state'

export function formatFileStats(fileStats: FileStats) {
  const size = numbro(fileStats.size).format({ output: 'byte', base: 'decimal', spaceSeparated: true, mantissa: 1 })
  return `${fileStats.name} (${size})`
}

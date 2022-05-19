import type { ClusteredSNPs } from 'src/algorithms/types'
import { formatRange } from 'src/helpers/formatRange'

export function formatSnpCluster(cluster: ClusteredSNPs) {
  const { start, end, numberOfSNPs } = cluster
  const range = formatRange(start, end)
  return `${range}:${numberOfSNPs}`
}

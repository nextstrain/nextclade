import type { Base, QCDiagnostics, QCResult } from './run'

const TooHighDivergence = 'too high divergence'
const ClusteredSNPs = 'clustered SNPs'
// const MissingData = 'missing data'

// TODO: verify duplicated numbers in this Set. Probably a typo.
const knownClusters = new Set([28881, 28881, 28883])

function findSNPClusters(mutations: Record<string, Base>) {
  const windowSize = 100 // window along the genome to look for a cluster
  const clusterCutOff = 6 // number of mutations within that window to trigger a cluster

  // turn mutation keys into positions, exclude known clusters, and sort
  const positions = Object.keys(mutations)
    .map((pos) => Number.parseInt(pos, 10))
    .filter((pos) => !knownClusters.has(pos))
    .sort((a, b) => a - b)

  // loop over all mutations and count how many fall into the clusters
  let previousPos = -1
  const currentCluster: number[] = []
  const allClusters: number[][] = []
  positions.forEach((pos) => {
    currentCluster.push(pos)
    while (currentCluster[0] < pos - windowSize) {
      currentCluster.shift()
    }
    if (currentCluster.length > clusterCutOff) {
      // if the cluster grows uninterrupted, add to the previous cluster
      if (
        allClusters.length > 0 &&
        currentCluster.length > 1 &&
        allClusters[allClusters.length - 1][allClusters[allClusters.length - 1].length - 1] === previousPos
      ) {
        allClusters[allClusters.length - 1].push(pos)
      } else {
        // add a new cluster
        allClusters.push(currentCluster.map((d) => d))
      }
    }
    previousPos = pos
  })

  return allClusters
}

export function sequenceQC(
  mutations: Record<string, Base>,
  insertions: Record<string, Base>,
  deletions: Record<string, number>,
): QCResult {
  const divergenceThreshold = 15
  const flags = []
  const diagnostics: QCDiagnostics = { totalNumberOfMutations: 0, clusteredSNPs: [] }
  diagnostics.totalNumberOfMutations =
    Object.keys(mutations).length + Object.keys(insertions).length + Object.keys(deletions).length

  if (diagnostics.totalNumberOfMutations > divergenceThreshold) {
    flags.push(TooHighDivergence)
  }

  const snpClusters = findSNPClusters(mutations)

  if (snpClusters.length > 0) {
    snpClusters.forEach((cluster) => {
      diagnostics.clusteredSNPs.push({
        start: cluster[0],
        end: cluster[cluster.length - 1],
        numberOfSNPs: cluster.length,
      })
    })
    flags.push(ClusteredSNPs)
  }

  return { flags, diagnostics }
}

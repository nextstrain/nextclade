const TooHighDivergence = 'too high divergence'
const ClusteredSNPs = 'clustered SNPs'
const MissingData = 'missing data'

const knownClusters = new Set([28881, 28881, 28883])

function findSNPClusters(mutations) {
  const windowSize = 100 // window along the genome to look for a cluster
  const clusterCutOff = 6 // number of mutations within that window to trigger a cluster

  // turn mutation keys into positions, exclude known clusters, and sort
  const positions = Object.keys(mutations)
    .map((pos) => Number.parseInt(pos))
    .filter((pos) => !knownClusters.has(pos))
    .sort((a, b) => a > b)

  // loop over all mutations and count how many fall into the clusters
  let previousPos = -1
  const currentCluster = []
  const allClusters = []
  positions.forEach((pos) => {
    currentCluster.push(pos)
    while (currentCluster[0] < pos - windowSize) {
      currentCluster.shift()
    }
    if (currentCluster.length > clusterCutOff) {
      // if the cluster grows uninterrupted, add to the previous cluster
      if (
        allClusters.length &&
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

export function sequenceQC(mutations, insertions, deletions) {
  const divergenceThreshold = 15
  const flags = []
  const diagnostics = { ClusteredSNPs: [] }
  diagnostics.totalNumberOfMutations =
    Object.keys(mutations).length + Object.keys(insertions).length + Object.keys(deletions).length

  if (diagnostics.totalNumberOfMutations > divergenceThreshold) {
    flags.push(TooHighDivergence)
  }

  const snpClusters = findSNPClusters(mutations)

  if (snpClusters.length) {
    snpClusters.forEach((cluster) => {
      diagnostics.ClusteredSNPs.push({
        start: cluster[0],
        end: cluster[cluster.length - 1],
        numberOfSNPs: cluster.length,
      })
    })
    flags.push(ClusteredSNPs)
  }

  return { flags, diagnostics }
}

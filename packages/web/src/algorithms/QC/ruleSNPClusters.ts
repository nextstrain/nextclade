import type { NucleotideSubstitution, QCParameters } from 'src/algorithms/types'
import { ClusteredSNPs } from 'src/algorithms/types'

export function findSNPClusters(QCParams: QCParameters, mutations: NucleotideSubstitution[]) {
  // turn mutation keys into positions, exclude known clusters, and sort
  const positions = mutations.filter(({ pos }) => !QCParams.knownClusters.has(pos)).sort((a, b) => a.pos - b.pos)

  // loop over all mutations and count how many fall into the clusters
  let previousPos = -1
  const currentCluster: number[] = []
  const allClusters: number[][] = []
  positions.forEach(({ pos }) => {
    currentCluster.push(pos)
    while (currentCluster[0] < pos - QCParams.windowSize) {
      currentCluster.shift()
    }
    if (currentCluster.length > QCParams.clusterCutOff) {
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

export function ruleSnpClusters(QCParams: QCParameters, mutations: NucleotideSubstitution[]) {
  const snpClusters = findSNPClusters(QCParams, mutations)
  const clusteredSNPs: ClusteredSNPs[] = []
  if (snpClusters.length > 0) {
    snpClusters.forEach((cluster) => {
      clusteredSNPs.push({
        start: cluster[0],
        end: cluster[cluster.length - 1],
        numberOfSNPs: cluster.length,
      })
    })
    flags.push(ClusteredSNPsFlag)
  }
}

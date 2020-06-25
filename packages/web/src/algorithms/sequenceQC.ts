import type {
  QCDiagnostics,
  QCResult,
  ClusteredSNPs,
  NucleotideLocation,
  NucleotideDeletion,
  QCParameters,
  NucleotideSubstitution,
} from './types'

const TooHighDivergence = 'too high divergence'
const ClusteredSNPsFlag = 'clustered SNPs'
const TooManyMixedSites = 'Too many non-ACGT characters'
const MissingData = 'missing data'

function findSNPClusters(QCParams: QCParameters, mutations: NucleotideSubstitution[]) {
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

function getNucleotideComposition(alignedQuery: string): Record<string, number> {
  const result: Record<string, number> = {}
  let char = ''
  for (let i = 0; i < alignedQuery.length; i++) {
    char = alignedQuery[i]
    if (result[char] === undefined) {
      result[char] = 1
    } else {
      result[char]++
    }
  }
  return result
}

export function sequenceQC(
  QCParams: QCParameters,
  mutations: NucleotideSubstitution[],
  insertions: NucleotideLocation[],
  deletions: NucleotideDeletion[],
  alignedQuery: string,
): QCResult {
  const flags: string[] = []

  const totalNumberOfMutations =
    Object.keys(mutations).length + Object.keys(insertions).length + Object.keys(deletions).length

  if (totalNumberOfMutations > QCParams.divergenceThreshold) {
    flags.push(TooHighDivergence)
  }

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
  const nucleotideComposition = getNucleotideComposition(alignedQuery)
  const goodBases = new Set(['A', 'C', 'G', 'T', 'N', '-'])
  const totalMixedSites = Object.keys(nucleotideComposition)
    .filter((d) => !goodBases.has(d))
    .reduce((a, b) => a + nucleotideComposition[b], 0)
  if (totalMixedSites > QCParams.mixedSitesThreshold) {
    flags.push(TooManyMixedSites)
  }

  if (nucleotideComposition.N && nucleotideComposition.N > QCParams.missingDataThreshold) {
    flags.push(MissingData)
  }

  const diagnostics: QCDiagnostics = { clusteredSNPs, totalMixedSites, totalNumberOfMutations }
  return { flags, diagnostics, nucleotideComposition }
}

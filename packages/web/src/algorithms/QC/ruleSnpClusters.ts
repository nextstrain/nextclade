import { clamp } from 'lodash'

import type { AnalysisResult, ClusteredSNPs, NucleotideSubstitution } from 'src/algorithms/types'
import { getQCRuleStatus } from 'src/algorithms/QC/QCRuleStatus'

export function findSNPClusters(
  { substitutions }: AnalysisResult,
  privateMutations: NucleotideSubstitution[],
  { windowSize, clusterCutOff }: QCRulesConfigSNPClusters,
) {
  // turn mutation keys into positions, exclude known clusters, and sort
  const positions = privateMutations.map(({ pos }) => pos)
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

export function processSNPClusters(snpClusters: number[][]): ClusteredSNPs[] {
  // reformat the SNP clusters and return
  return snpClusters.map((cluster) => {
    return {
      start: cluster[0],
      end: cluster[cluster.length - 1],
      numberOfSNPs: cluster.length,
    }
  })
}

export interface QCRulesConfigSNPClusters {
  windowSize: number
  clusterCutOff: number
  scoreWeight: number
  scoreMax: number
}

export function ruleSnpClusters(
  data: AnalysisResult,
  privateMutations: NucleotideSubstitution[],
  config: QCRulesConfigSNPClusters,
) {
  const name = 'SNP clusters'
  const acronym = 'SC'

  const { scoreWeight, scoreMax } = config

  const snpClusters = findSNPClusters(data, privateMutations, config)
  const clusteredSNPs = processSNPClusters(snpClusters)
  const totalSNPs = clusteredSNPs.reduce((acc, { numberOfSNPs }) => acc + numberOfSNPs, 0)

  let scoreRaw = 0
  scoreRaw = snpClusters.length * scoreWeight

  const score = clamp(scoreRaw, 0, scoreMax)

  const status = getQCRuleStatus(score)

  return { name, acronym, score, totalSNPs, clusteredSNPs, status }
}

export type QCResultSNPClusters = ReturnType<typeof ruleSnpClusters>

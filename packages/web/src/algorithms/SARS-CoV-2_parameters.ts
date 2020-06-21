
export const QCParams = {
  knownClusters: new Set([28881, 28882, 28883]),
  windowSize: 100, // window along the genome to look for a cluster
  clusterCutOff: 6, // number of mutations within that window to trigger a cluster
  divergenceThreshold: 15, // number of mutations to trigger divergence warning
  mixedSitesThreshold: 10, // number of non-ACGTN sites to trigger warning
  missingDataThreshold: 1000, // number of sites as N to trigger warning
}
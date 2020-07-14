export function ruleMixedSites() {
  const goodBases = new Set(['A', 'C', 'G', 'T', 'N', '-'])
  const totalMixedSites = Object.keys(nucleotideComposition)
    .filter((d) => !goodBases.has(d))
    .reduce((a, b) => a + nucleotideComposition[b], 0)
  if (totalMixedSites > QCParams.mixedSitesThreshold) {
    flags.push(TooManyMixedSites)
  }
}

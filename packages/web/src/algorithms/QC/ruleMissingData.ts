export function ruleMissingData() {
  if (nucleotideComposition.N && nucleotideComposition.N > QCParams.missingDataThreshold) {
    flags.push(MissingData)
  }
}

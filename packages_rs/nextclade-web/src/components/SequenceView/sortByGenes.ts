export function negativeNumberToInfinity(x: number) {
  return x < 0 ? Number.POSITIVE_INFINITY : x
}

export function sortByGenes<T extends { gene: string }>(geneOrderPreference: string[]) {
  return function sortByGenesPredicate(left: T, right: T): number {
    // We want items that are not in the preference list to be sorted to the end
    const l = negativeNumberToInfinity(geneOrderPreference.indexOf(left.gene))
    const r = negativeNumberToInfinity(geneOrderPreference.indexOf(right.gene))
    return l - r
  }
}

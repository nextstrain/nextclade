export function isSequenceInClade(cladeAlleles, mutations, reference) {
  const conditions = cladeAlleles.map((d) => {
    const state = mutations[d.pos - 1] === undefined ? reference[d.pos - 1] : mutations[d.pos - 1]
    return state === d.allele
  })
  return conditions.every((d) => d)
}

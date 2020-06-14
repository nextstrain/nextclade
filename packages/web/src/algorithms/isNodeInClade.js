export function isNodeInClade(cladeAlleles, mutations, reference) {
  const conditions = cladeAlleles.map((d) => {
    const state = mutations[d.pos] === undefined ? reference[d.pos - 1] : mutations[d.pos]
    return state === d.allele
  })
  return conditions.every((d) => d)
}

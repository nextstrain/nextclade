import { groupBy, uniqBy } from 'lodash'

import type { Nucleotide, Substitutions, CladeDataFlat, CladeDataGrouped } from 'src/algorithms/types'

import { VIRUSES } from 'src/algorithms/viruses'

export function cladesFlatten(clades: Substitutions): CladeDataFlat[] {
  return Object.entries(clades).reduce((result, [cladeName, substitutions]) => {
    const subs = substitutions.map(({ pos, nuc }) => {
      return { cladeName, pos, nuc }
    })

    return [...result, ...subs]
  }, [] as CladeDataFlat[])
}

export function groupClades(clades: Substitutions): CladeDataGrouped[] {
  const cladesFlat = cladesFlatten(clades)

  // TODO: there should probably be a simpler and cleaner way to do this
  const cladesGroupedByNuc = cladesFlat.map(({ pos }) => {
    const subsList = cladesFlat
      .filter((candidate) => pos === candidate.pos)
      .map(({ cladeName, nuc }) => ({ cladeName, nuc }))

    const subsRaw = groupBy(subsList, ({ nuc }) => nuc)

    const subsEntriesSimplified = Object.entries(subsRaw).map(([nuc, arr]) => [
      nuc,
      arr.map(({ cladeName }) => cladeName),
    ])

    const subs = Object.fromEntries(subsEntriesSimplified) as Record<Nucleotide, string[]>
    return { pos, subs }
  })

  return uniqBy(cladesGroupedByNuc, ({ pos }) => pos)
}

export const cladesGrouped = groupClades(VIRUSES['SARS-CoV-2'].clades)

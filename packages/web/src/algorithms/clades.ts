import { groupBy, uniqBy } from 'lodash'

import type { Nucleotide, Clades, CladesGrouped } from 'src/algorithms/types'

export interface CladesFlat {
  cladeName: string
  pos: number
  nuc: Nucleotide
}

export function flattenClades(clades: Clades): CladesFlat[] {
  return Object.entries(clades).reduce((result, [cladeName, substitutions]) => {
    const subs = substitutions.map(({ pos, nuc }) => ({ cladeName, pos, nuc }))
    return [...result, ...subs]
  }, [] as CladesFlat[])
}

export function groupClades(clades: Clades): CladesGrouped[] {
  const cladesFlat = flattenClades(clades)

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

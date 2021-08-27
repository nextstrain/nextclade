import { Gene } from 'src/algorithms/types'
import { GENOTYPE_COLORS } from 'src/constants'

export function prepareGeneMap(geneMapUnsafe: unknown) {
  if (typeof geneMapUnsafe !== 'string') {
    throw new TypeError(
      `When loading gene map string data: expected to find 'string', but got '${typeof geneMapUnsafe}' instead`,
    )
  }

  let geneMap = JSON.parse(geneMapUnsafe) as Gene[] // TODO: validate
  geneMap = geneMap.map((gene, i) => {
    const color = GENOTYPE_COLORS[(i + 1) % GENOTYPE_COLORS.length]
    return { ...gene, color }
  })

  return geneMap
}

import { Gene } from 'src/types'
import { GENOTYPE_COLORS } from 'src/constants'

export function prepareGeneMap(geneMapUnsafe: unknown) {
  if (typeof geneMapUnsafe !== 'string') {
    throw new TypeError(
      `When loading gene map string data: expected to find 'string', but got '${typeof geneMapUnsafe}' instead`,
    )
  }

  const geneMapRaw = JSON.parse(geneMapUnsafe) as Record<string, Gene>
  const geneMap: Gene[] = Object.entries(geneMapRaw).map(([_0, gene], i) => {
    const color = GENOTYPE_COLORS[(i + 1) % GENOTYPE_COLORS.length]
    return { ...gene, color }
  })

  return geneMap
}

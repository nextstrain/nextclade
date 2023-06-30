import { Gene } from 'src/types'
import { GENOTYPE_COLORS } from 'src/constants'

export function prepareGeneMap(geneMapUnsafe: unknown) {
  if (typeof geneMapUnsafe !== 'string') {
    throw new TypeError(
      `When loading gene map string data: expected to find 'string', but got '${typeof geneMapUnsafe}' instead`,
    )
  }

  const geneMapRaw = JSON.parse(geneMapUnsafe) as Record<string, Gene>

  const genes: Gene[] = Object.values(geneMapRaw).map((gene, i) => {
    const geneColor = getColorFromIndex(i)
    const cdses = gene.cdses.map((cds) => {
      const segments = cds.segments.map((cdsSeg) => ({ ...cdsSeg, color: geneColor }))
      return { ...cds, segments, color: geneColor }
    })
    return { ...gene, cdses, color: geneColor }
  })

  return genes
}

function getColorFromIndex(i: number): string {
  return GENOTYPE_COLORS[(i + 1) % GENOTYPE_COLORS.length]
}

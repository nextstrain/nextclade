import { GeneMap } from 'src/types'
import { GENOTYPE_COLORS } from 'src/constants'

export function prepareGeneMap(geneMap: GeneMap): GeneMap {
  const genes = geneMap.genes.map((gene, i) => {
    const geneColor = getColorFromIndex(i)
    const cdses = gene.cdses.map((cds) => {
      const segments = cds.segments.map((cdsSeg) => ({ ...cdsSeg, color: geneColor }))
      return { ...cds, segments, color: geneColor }
    })
    return { ...gene, cdses, color: geneColor }
  })
  return { genes }
}

function getColorFromIndex(i: number): string {
  return GENOTYPE_COLORS[(i + 1) % GENOTYPE_COLORS.length]
}

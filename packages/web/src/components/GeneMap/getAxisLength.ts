import type { Gene } from 'src/algorithms/types'
import { GENE_OPTION_NUC_SEQUENCE } from 'src/constants'

/** Retrieves length of the axis to draw: Genome size in case of nuc sequence, or gene length on case of gene */
export function getAxisLength(genomeSize: number, viewedGene: string, geneMap: Gene[]) {
  let length = genomeSize
  if (viewedGene !== GENE_OPTION_NUC_SEQUENCE) {
    const gene = geneMap?.find((gene) => gene.geneName === viewedGene)
    if (gene) {
      length = gene.length
    }
  }
  return length
}

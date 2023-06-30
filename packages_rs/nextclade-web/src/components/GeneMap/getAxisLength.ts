import type { Cds } from 'src/types'
import { GENE_OPTION_NUC_SEQUENCE } from 'src/constants'
import { cdsCodonLength } from 'src/types'

/** Retrieves length of the axis to draw: Genome size in case of nuc sequence, or gene length on case of gene */
export function getAxisLength(genomeSize: number, viewedGene: string, cdses: Cds[]) {
  let length = genomeSize
  if (viewedGene !== GENE_OPTION_NUC_SEQUENCE) {
    const cds = cdses?.find((cds) => cds.name === viewedGene)
    if (cds) {
      length = Math.round(cdsCodonLength(cds))
    }
  }
  return length
}

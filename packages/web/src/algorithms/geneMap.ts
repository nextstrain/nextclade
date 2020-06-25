import { get, pick } from 'lodash'

import type { Gene } from 'src/algorithms/types'
import geneMapRaw from 'src/assets/data/genomeAnnotationsFromNcovGlobal.json'
import { GENOTYPE_COLORS } from 'src/constants'

function getGeneMap(): Gene[] {
  const geneMap = get(geneMapRaw, 'genome_annotations')

  if (!geneMap) {
    throw new Error(`getGeneMap: the gene map data is corrupted`)
  }

  return Object.entries(geneMap).map(([name, geneDataRaw], i) => {
    const color = GENOTYPE_COLORS[(i + 1) % GENOTYPE_COLORS.length]
    const { start: begin, end } = pick(geneDataRaw, ['start', 'end'])
    const geneWithoutColor = { name, range: { begin, end } }
    return { ...geneWithoutColor, color }
  })
}

export const geneMap = getGeneMap()

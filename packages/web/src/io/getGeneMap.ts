import { get, pick } from 'lodash'

import type { Gene } from 'src/algorithms/types'
import { GENOTYPE_COLORS } from 'src/constants'

export interface GeneMapJsonEntry {
  start: number
  end: number
}

export interface GeneMapJson {
  genome_annotations: Record<string, GeneMapJsonEntry> // eslint-disable-line camelcase
}

export function getGeneMap(geneMapJson: GeneMapJson): Gene[] {
  const geneMap = get(geneMapJson, 'genome_annotations')

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

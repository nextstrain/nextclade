import { get, pick } from 'lodash'

import createColor from 'create-color'

import type { Gene } from 'src/algorithms/types'
import geneMapRaw from 'src/assets/data/genomeAnnotationsFromNcovGlobal.json'

function getGeneMap(): Gene[] {
  const geneMap = get(geneMapRaw, 'genome_annotations')

  if (!geneMap) {
    throw new Error(`getGeneMap: the gene map data is corrupted`)
  }

  return Object.entries(geneMap).map(([name, geneDataRaw]) => {
    const { start: begin, end } = pick(geneDataRaw, ['start', 'end'])
    const geneWithoutColor = { name, range: { begin, end } }
    const color = createColor(geneWithoutColor)
    return { ...geneWithoutColor, color }
  })
}

export const geneMap = getGeneMap()

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
    const geneData = pick(geneDataRaw, ['start', 'end'])
    const color = createColor({ name, ...geneData })
    return { name, ...geneData, color }
  })
}

export const geneMap = getGeneMap()

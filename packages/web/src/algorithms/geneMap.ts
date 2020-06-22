import { get } from 'lodash'

import createColor from 'create-color'

import type { GeneMapDatum } from 'src/algorithms/types'
import geneMapRaw from 'src/assets/data/genomeAnnotationsFromNcovGlobal.json'

function getGeneMap(): GeneMapDatum[] {
  const geneMap = get(geneMapRaw, 'genome_annotations')

  return Object.entries(geneMap).map(([name, geneData]) => ({
    name,
    color: createColor({ name, ...geneData }),
    ...geneData,
  }))
}

export const geneMap = getGeneMap()

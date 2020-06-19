import { get } from 'lodash'

import createColor from 'create-color'

import geneMapRaw from 'src/assets/data/genomeAnnotationsFromNcovGlobal.json'

export interface GeneMapDatum {
  name: string
  color: string
  type: string
  start: number
  end: number
  seqid: string
  strand: string
}

function getGeneMap(): GeneMapDatum[] {
  const geneMap = get(geneMapRaw, 'genome_annotations')

  return Object.entries(geneMap).map(([name, geneData]) => ({
    name,
    color: createColor({ name, ...geneData }),
    ...geneData,
  }))
}

export const geneMap = getGeneMap()

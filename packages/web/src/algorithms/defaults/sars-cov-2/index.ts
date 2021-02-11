import type { VirusRaw } from 'src/algorithms/types'
import { VirusName } from 'src/algorithms/defaults/virusNames'
import { qcRulesConfig } from 'src/algorithms/defaults/sars-cov-2/qcRulesConfig'
import { rootSeq } from 'src/algorithms/defaults/sars-cov-2/rootSeq'
import auspiceDataRaw from 'src/algorithms/defaults/sars-cov-2/ncov_small.json'
import sequenceData from 'src/algorithms/defaults/sars-cov-2/sequenceData.fasta'
import pcrPrimers from 'src/algorithms/defaults/sars-cov-2/pcrPrimers.json'
import constellationDefinitions from 'src/algorithms/defaults/sars-cov-2/constellations.json'

import { treeValidate } from 'src/algorithms/tree/treeValidate'
import { validatePcrPrimers } from 'src/algorithms/primers/validatePcrPrimers'
import { convertGeneMap, getGeneMapJsonFromTree } from 'src/io/convertGeneMap'
import { convertConstellationDefinitionObjects } from 'src/io/convertConstellationDefinitions'

const auspiceData = treeValidate(auspiceDataRaw)
const geneMap = convertGeneMap(getGeneMapJsonFromTree(auspiceData))

const virus: VirusRaw = {
  name: VirusName.SARS_COV_2,
  rootSeq,
  geneMap,
  pcrPrimers: validatePcrPrimers(pcrPrimers),
  constellations: convertConstellationDefinitionObjects(constellationDefinitions),
  auspiceData,
  qcRulesConfig,
  minimalLength: 100,
}

export const SARS_COV_2 = Object.freeze({ sequenceData, virus })

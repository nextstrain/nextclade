import { VirusName } from 'src/algorithms/defaults/virusNames'
import { qcRulesConfig } from 'src/algorithms/defaults/sars-cov-2/qcRulesConfig'
import { geneMap } from 'src/algorithms/defaults/sars-cov-2/geneMap'
import { rootSeq } from 'src/algorithms/defaults/sars-cov-2/rootSeq'
import clades from 'src/algorithms/defaults/sars-cov-2/clades.json'
import auspiceData from 'src/algorithms/defaults/sars-cov-2/ncov_small.json'
import sequenceData from 'src/algorithms/defaults/sars-cov-2/sequenceData.fasta'
import pcrPrimers from 'src/algorithms/defaults/sars-cov-2/pcrPrimers.json'

import { treeValidate } from 'src/algorithms/tree/treeValidate'
import { validateClades } from 'src/algorithms/clades'
import { validatePcrPrimers } from 'src/algorithms/primers/validatePcrPrimers'

export const SARS_COV_2 = Object.freeze({
  sequenceData,
  virus: {
    name: VirusName.SARS_COV_2,
    rootSeq,
    clades: validateClades(clades),
    geneMap,
    pcrPrimers: validatePcrPrimers(pcrPrimers),
    auspiceData: treeValidate(auspiceData),
    qcRulesConfig,
    minimalLength: 100,
  },
})

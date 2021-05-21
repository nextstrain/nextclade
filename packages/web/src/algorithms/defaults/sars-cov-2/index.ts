import type { Virus } from 'src/algorithms/types'
import { VirusName } from 'src/algorithms/defaults/virusNames'

import queryStr from '../../../../../../data/sars-cov-2/sequences.fasta'
import treeJson from '../../../../../../data/sars-cov-2/tree.json'
import refFastaStr from '../../../../../../data/sars-cov-2/reference.fasta'
import qcConfigRaw from '../../../../../../data/sars-cov-2/qc.json'
import geneMapStrRaw from '../../../../../../data/sars-cov-2/genemap.gff'
import pcrPrimersStrRaw from '../../../../../../data/sars-cov-2/primers.csv'

const virus: Virus = {
  name: VirusName.SARS_COV_2,
  minimalLength: 100,
  genomeSize: 1000, // FIXME: deduce from root sequence
  queryStr,
  treeJson: JSON.stringify(treeJson),
  refFastaStr,
  qcConfigRaw: JSON.stringify(qcConfigRaw),
  geneMapStrRaw,
  pcrPrimersStrRaw,
}

export const SARS_COV_2 = Object.freeze({ queryStr, virus })

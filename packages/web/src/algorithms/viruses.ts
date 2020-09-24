import type { StrictOmit } from 'ts-essentials'
import copy from 'fast-copy'

import { groupClades } from 'src/algorithms/clades'
import { treeValidate } from 'src/algorithms/tree/treeValidate'
import type { Virus } from 'src/algorithms/types'
import { A, T, G, C } from 'src/algorithms/nucleotides'

import { geneMap } from 'src/algorithms/geneMap'
import { DEFAULT_ROOT_SEQUENCE } from 'src/algorithms/getRootSeq'
import { qcRulesConfigDefault } from 'src/algorithms/QC/qcRulesConfig'
import { pcrPrimers } from 'src/algorithms/primers/getPcrPrimers'
import DEFAULT_AUSPICE_DATA from 'src/assets/data/ncov_small.json'
import DEFAULT_INPUT from 'src/assets/data/defaultSequencesWithGaps.fasta'

export enum VirusName {
  SARS_COV_2 = 'SARS-CoV-2',
}

export type VirusRaw = StrictOmit<Virus, 'cladesGrouped' | 'length'>

const DEFAULT_VIRUSES: Record<VirusName, VirusRaw> = {
  [VirusName.SARS_COV_2]: {
    rootSeq: DEFAULT_ROOT_SEQUENCE,
    minimalLength: 100,
    clades: {
      '19A': [
        { pos: 8782, nuc: C },
        { pos: 14408, nuc: C },
      ],
      '19B': [
        { pos: 8782, nuc: T },
        { pos: 28144, nuc: C },
      ],
      '20A': [
        { pos: 8782, nuc: C },
        { pos: 14408, nuc: T },
        { pos: 23403, nuc: G },
      ],
      '20B': [
        { pos: 8782, nuc: C },
        { pos: 14408, nuc: T },
        { pos: 23403, nuc: G },
        { pos: 28881, nuc: A },
        { pos: 28882, nuc: A },
      ],
      '20C': [
        { pos: 1059, nuc: T },
        { pos: 8782, nuc: C },
        { pos: 14408, nuc: T },
        { pos: 23403, nuc: G },
        { pos: 25563, nuc: T },
      ],
    },
    geneMap,
    pcrPrimers,
    auspiceData: treeValidate(DEFAULT_AUSPICE_DATA),
    qcRulesConfig: qcRulesConfigDefault,
  },
}

const DEFAULT_SEQUENCE_DATA: Record<VirusName, string> = {
  [VirusName.SARS_COV_2]: DEFAULT_INPUT,
}

export const DEFAULT_VIRUS_NAME = VirusName.SARS_COV_2
export const DEFAULT_VIRUS = DEFAULT_VIRUSES[DEFAULT_VIRUS_NAME]
export const DEFAULT_SEQUENCE_DATUM = DEFAULT_SEQUENCE_DATA[DEFAULT_VIRUS_NAME]

export class ErrorVirusNotFound extends Error {
  public constructor(virusName: string) {
    super(`Virus not found: ${virusName}`)
  }
}

export function validateVirusName(virusName: string): VirusName {
  if (!Object.values(VirusName).includes(virusName as VirusName)) {
    throw new ErrorVirusNotFound(virusName)
  }
  return virusName as VirusName
}

export function getVirus(virusName: string = DEFAULT_VIRUS_NAME): Virus {
  const virusNameValid = validateVirusName(virusName)
  const virusRaw = DEFAULT_VIRUSES[virusNameValid]
  const length = virusRaw.rootSeq.length // eslint-disable-line prefer-destructuring
  const cladesGrouped = groupClades(virusRaw.clades)
  return copy({
    ...virusRaw,
    length,
    cladesGrouped,
  })
}

export function getSequenceDatum(virusName: string = DEFAULT_VIRUS_NAME): string {
  const virusNameValid = validateVirusName(virusName)
  return copy(DEFAULT_SEQUENCE_DATA[virusNameValid])
}

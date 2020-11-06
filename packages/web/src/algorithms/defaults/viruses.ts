import copy from 'fast-copy'

import type { Virus, VirusRaw } from 'src/algorithms/types'
import { VirusName } from 'src/algorithms/defaults/virusNames'

import { SARS_COV_2 } from 'src/algorithms/defaults/sars-cov-2'

const DEFAULT_VIRUSES: Record<VirusName, VirusRaw> = {
  [VirusName.SARS_COV_2]: SARS_COV_2.virus,
}

const DEFAULT_SEQUENCE_DATA: Record<VirusName, string> = {
  [VirusName.SARS_COV_2]: SARS_COV_2.sequenceData,
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
  const genomeSize = virusRaw.rootSeq.length
  return copy({ ...virusRaw, genomeSize })
}

export function getSequenceDatum(virusName: string = DEFAULT_VIRUS_NAME): string {
  const virusNameValid = validateVirusName(virusName)
  return copy(DEFAULT_SEQUENCE_DATA[virusNameValid])
}

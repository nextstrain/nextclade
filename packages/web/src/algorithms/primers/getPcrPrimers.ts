import PCR_PRIMERS_RAW from 'src/assets/data/primers.json'

import type { PcrPrimer } from 'src/algorithms/types'

export function getPcrPrimers() {
  return PCR_PRIMERS_RAW as PcrPrimer[]
}

export const pcrPrimers = getPcrPrimers()

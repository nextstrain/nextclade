import type { DeepReadonly } from 'ts-essentials'

import type { NucleotideRange } from 'src/algorithms/types'

import { N } from 'src/algorithms/nucleotides'

export function getTotalMissing(missing: DeepReadonly<NucleotideRange[]>) {
  return missing
    .filter(({ character }) => character === N)
    .reduce((total, { range: { begin, end } }) => total + end - begin, 0)
}

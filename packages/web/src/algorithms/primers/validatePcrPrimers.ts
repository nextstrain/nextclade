import type { PrimerEntries } from 'src/algorithms/primers/convertPcrPrimers'
import type { PcrPrimer } from 'src/algorithms/types'

export function validatePcrPrimerEntries(primersEntriesUnsafe: unknown) {
  // TODO: validate PCR primers CSV entries
  return primersEntriesUnsafe as PrimerEntries[]
}

export function validatePcrPrimers(primersUnsafe: unknown) {
  // TODO: validate PCR primers JSON
  return primersUnsafe as PcrPrimer[]
}

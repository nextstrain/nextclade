import type { TFunctionInterface } from 'src/helpers/TFunctionInterface'
import {
  ErrorAlignmentBadSeedMatches,
  ErrorAlignmentNoSeedMatches,
  ErrorAlignmentSequenceTooShort,
} from 'src/algorithms/alignPairwise'

export function formatError(t: TFunctionInterface, error?: Error) {
  let errorText = t('Unknown error')
  if (error instanceof ErrorAlignmentSequenceTooShort) {
    errorText = t('Unable to align: sequence is too short')
  } else if (error instanceof ErrorAlignmentNoSeedMatches) {
    errorText = t('Unable to align: no seed matches')
  } else if (error instanceof ErrorAlignmentBadSeedMatches) {
    errorText = t('Unable to align: too many insertions, deletions, duplications, or ambiguous seed matches')
  }
  return errorText
}

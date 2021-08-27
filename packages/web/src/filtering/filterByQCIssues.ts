import { QcStatus } from 'src/algorithms/types'
import type { SequenceAnalysisState } from 'src/state/algorithm/algorithm.state'
import { AlgorithmSequenceStatus } from 'src/state/algorithm/algorithm.state'

export interface QCFilters {
  showGood: boolean
  showMediocre: boolean
  showBad: boolean
  showErrors: boolean
}

export function filterByQCIssues({ showGood, showMediocre, showBad, showErrors }: QCFilters) {
  return ({ status, result, errors }: SequenceAnalysisState) => {
    const isError = status === AlgorithmSequenceStatus.failed
    const isPending = !isError && (!result || !result.qc)

    // The sequences which are still being processed are presumed to be 'good' until QC results come and prove otherwise
    const isGood = isPending || result?.qc?.overallStatus === QcStatus.good
    const isMediocre = result?.qc?.overallStatus === QcStatus.mediocre
    const isBad = result?.qc?.overallStatus === QcStatus.bad

    const good = showGood && isGood
    const mediocre = showMediocre && isMediocre
    const bad = showBad && isBad
    const err = showErrors && isError

    return err || good || mediocre || bad
  }
}

import type { SequenceAnalysisState } from 'src/state/algorithm/algorithm.state'
import { AlgorithmSequenceStatus } from 'src/state/algorithm/algorithm.state'
import { QCRuleStatus } from 'src/algorithms/QC/QCRuleStatus'

export interface QCFilters {
  showGood: boolean
  showMediocre: boolean
  showBad: boolean
  showErrors: boolean
}

export function filterByQCIssues({ showGood, showMediocre, showBad, showErrors }: QCFilters) {
  return ({ status, result, qc, errors }: SequenceAnalysisState) => {
    const isError = status === AlgorithmSequenceStatus.analysisFailed
    const isPending = !isError && (!result || !qc)

    // The sequences which are still being processed are presumed to be 'good' until QC results come and prove otherwise
    const isGood = isPending || qc?.status === QCRuleStatus.good
    const isMediocre = qc?.status === QCRuleStatus.mediocre
    const isBad = qc?.status === QCRuleStatus.bad

    const good = showGood && isGood
    const mediocre = showMediocre && isMediocre
    const bad = showBad && isBad
    const err = showErrors && isError

    return err || good || mediocre || bad
  }
}

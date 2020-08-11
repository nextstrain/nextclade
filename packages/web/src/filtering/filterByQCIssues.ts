import type { SequenceAnalysisState } from 'src/state/algorithm/algorithm.state'

export interface FilterByQCIssuesParams {
  hasNoQcIssuesFilter: boolean
  hasQcIssuesFilter: boolean
  hasErrorsFilter: boolean
}

export function filterByQCIssues({ hasNoQcIssuesFilter, hasQcIssuesFilter, hasErrorsFilter }: FilterByQCIssuesParams) {
  return ({ result, qc, errors }: SequenceAnalysisState) => {
    const hasErrors = errors.length > 0

    const hasIssues = qc && qc.score > 0

    // // Sequences still being processed (!result) are assumed to have no issues until the results come and prove otherwise
    const hasNoIssues = (!hasErrors && !result && !qc) || (qc && qc.score === 0)

    return (hasNoQcIssuesFilter && hasNoIssues) || (hasQcIssuesFilter && hasIssues) || (hasErrorsFilter && hasErrors)
  }
}

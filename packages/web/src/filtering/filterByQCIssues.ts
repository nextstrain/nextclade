import type { SequenceAnylysisState } from 'src/state/algorithm/algorithm.state'

export interface FilterByQCIssuesParams {
  hasNoQcIssuesFilter: boolean
  hasQcIssuesFilter: boolean
  hasErrorsFilter: boolean
}

export function filterByQCIssues({ hasNoQcIssuesFilter, hasQcIssuesFilter, hasErrorsFilter }: FilterByQCIssuesParams) {
  return ({ result, errors }: SequenceAnylysisState) => {
    const hasErrors = errors.length > 0

    const hasIssues = result && result.diagnostics.score > 0

    // // Sequences still being processed (!result) are assumed to have no issues until the results come and prove otherwise
    const hasNoIssues = (!hasErrors && !result) || (result && result.diagnostics.score === 0)

    return (hasNoQcIssuesFilter && hasNoIssues) || (hasQcIssuesFilter && hasIssues) || (hasErrorsFilter && hasErrors)
  }
}

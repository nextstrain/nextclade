import type { SequenceAnylysisState } from 'src/state/algorithm/algorithm.state'

export function filterByQCIssues(hasNoQcIssuesFilter: boolean, hasQcIssuesFilter: boolean, hasErrorsFilter: boolean) {
  return ({ result, errors }: SequenceAnylysisState) => {
    const hasErrors = errors.length > 0
    const hasIssues = hasErrors || (result && result.diagnostics.score > 0)
    const hasNoIssues = result && result.diagnostics.score === 0
    return (hasNoQcIssuesFilter && hasNoIssues) || (hasQcIssuesFilter && hasIssues) || (hasErrorsFilter && hasErrors)
  }
}

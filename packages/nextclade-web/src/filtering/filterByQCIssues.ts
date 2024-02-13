import { isNil } from 'lodash'

import type { NextcladeResult, QCFilters } from 'src/types'

export function filterByQCIssues({ showGood, showMediocre, showBad, showErrors }: QCFilters) {
  return ({ result, error }: NextcladeResult) => {
    const isError = !isNil(error)
    const isPending = !isError && !result

    // The sequences which are still being processed are presumed to be 'good' until QC results come and prove otherwise
    const isGood = isPending || result?.analysisResult?.qc?.overallStatus === 'good'
    const isMediocre = result?.analysisResult?.qc?.overallStatus === 'mediocre'
    const isBad = result?.analysisResult?.qc?.overallStatus === 'bad'

    const good = showGood && isGood
    const mediocre = showMediocre && isMediocre
    const bad = showBad && isBad
    const err = showErrors && isError

    return err || good || mediocre || bad
  }
}

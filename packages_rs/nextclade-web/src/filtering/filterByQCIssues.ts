import { isNil } from 'lodash'

import type { NextcladeResult, QCFilters } from 'src/types'
import { QcStatus } from 'src/types'

export function filterByQCIssues({ showGood, showMediocre, showBad, showErrors }: QCFilters) {
  return ({ result, error }: NextcladeResult) => {
    const isError = !isNil(error)
    const isPending = !isError && !result

    // The sequences which are still being processed are presumed to be 'good' until QC results come and prove otherwise
    const isGood = isPending || result?.analysisResult?.qc?.overallStatus === QcStatus.good
    const isMediocre = result?.analysisResult?.qc?.overallStatus === QcStatus.mediocre
    const isBad = result?.analysisResult?.qc?.overallStatus === QcStatus.bad

    const good = showGood && isGood
    const mediocre = showMediocre && isMediocre
    const bad = showBad && isBad
    const err = showErrors && isError

    return err || good || mediocre || bad
  }
}

import { round } from 'lodash'
import React, { useMemo } from 'react'

import type { AnalysisResult } from 'src/types'
import { getSafeId } from 'src/helpers/getSafeId'

export interface ColumnCoverageProps {
  analysisResult: AnalysisResult
}

export function ColumnCoverage({ analysisResult }: ColumnCoverageProps) {
  const { index, seqName, coverage } = analysisResult
  const id = getSafeId('col-coverage', { index, seqName })
  const coveragePercentage = useMemo(() => `${round(coverage * 100, 1).toFixed(1)}%`, [coverage])

  return (
    <div id={id} className="w-100">
      {coveragePercentage}
    </div>
  )
}

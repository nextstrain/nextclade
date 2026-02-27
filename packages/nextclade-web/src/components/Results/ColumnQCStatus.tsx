import React, { useCallback, useState } from 'react'

import type { AnalysisResult } from 'src/types'
import { getSafeId } from 'src/helpers/getSafeId'
import { Tooltip } from 'src/components/Results/Tooltip'
import { ListOfQcIssues } from 'src/components/Results/ListOfQcIsuues'
import { notUndefined } from 'src/helpers/notUndefined'
import { Circle } from 'src/components/Results/Circle'

export interface ColumnQCStatusProps {
  analysisResult: AnalysisResult
}

export function ColumnQCStatus({ analysisResult }: ColumnQCStatusProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const { index, seqName, qc } = analysisResult
  const { missingData, privateMutations, mixedSites, snpClusters, frameShifts, stopCodons, recombinants } = qc

  const id = getSafeId('qc-label', { index, seqName })

  const rules = [
    { value: missingData, name: 'N' },
    { value: mixedSites, name: 'M' },
    { value: privateMutations, name: 'P' },
    { value: snpClusters, name: 'C' },
    { value: frameShifts, name: 'F' },
    { value: stopCodons, name: 'S' },
    { value: recombinants, name: 'R' },
  ].filter((value) => notUndefined(value))

  const icons = rules.map(({ name, value }, i) => {
    if (!value) {
      return undefined
    }

    return <Circle key={i} status={value.status} text={name} /> // eslint-disable-line react/no-array-index-key
  })

  return (
    <div id={id} className="d-flex w-100 h-100" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {icons}
      <Tooltip wide target={id} isOpen={showTooltip}>
        <ListOfQcIssues qc={qc} />
      </Tooltip>
    </div>
  )
}

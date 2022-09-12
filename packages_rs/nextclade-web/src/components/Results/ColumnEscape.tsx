import React, { useMemo } from 'react'

import type { AnalysisResult } from 'src/types'
import { getSafeId } from 'src/helpers/getSafeId'

export interface ColumnEscapeProps {
  analysisResult: AnalysisResult
}

export function ColumnEscape({ analysisResult }: ColumnEscapeProps) {
  const { index, seqName, escape } = analysisResult
  const id = getSafeId('col-escape', { index, seqName })

  const escapePercentage = useMemo(() => {
    const entries = Object.entries(escape)
    if (entries.length > 0) {
      return formatEscapeValue(entries[0][1])
    }
    return undefined
  }, [escape])

  return (
    <div id={id} className="w-100">
      {escapePercentage}
    </div>
  )
}

function formatEscapeValue(escape: number) {
  return `${escape.toFixed(4)}`
}

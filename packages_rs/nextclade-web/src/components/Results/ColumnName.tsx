import React, { useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { isEmpty, isNil } from 'lodash'
import styled from 'styled-components'

import { analysisResultsAtom } from 'src/state/results.state'
import { getSafeId } from 'src/helpers/getSafeId'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { ColumnNameTooltip } from 'src/components/Results/ColumnNameTooltip'
import { Tooltip } from 'src/components/Results/Tooltip'
import { getStatusIconAndText } from 'src/components/Results/getStatusIconAndText'

export const SequenceName = styled.div`
  white-space: nowrap;
  overflow: hidden;
`

export interface ColumnNameProps {
  seqName: string
}

export function ColumnName({ seqName }: ColumnNameProps) {
  const isDone = false

  const { t } = useTranslationSafe()
  const { result, error } = useRecoilValue(analysisResultsAtom(seqName))
  const [showTooltip, setShowTooltip] = useState(false)
  const id = useMemo(() => getSafeId('sequence-label', { seqName }), [seqName])

  const { StatusIcon } = useMemo(
    () =>
      getStatusIconAndText({
        t,
        isDone,
        hasWarnings: !isEmpty(result?.analysisResult.warnings),
        hasErrors: !isNil(error),
      }),
    [error, isDone, result?.analysisResult.warnings, t],
  )

  if (!result?.analysisResult) {
    return null
  }

  return (
    <SequenceName
      id={id}
      className="w-100"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <StatusIcon />
      {seqName}
      {
        <Tooltip wide fullWidth target={id} isOpen={showTooltip} placement="right-start">
          <ColumnNameTooltip seqName={seqName} />
        </Tooltip>
      }
    </SequenceName>
  )
}

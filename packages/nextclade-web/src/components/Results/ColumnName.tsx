import React, { useCallback, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { isEmpty, isNil } from 'lodash'
import styled from 'styled-components'

import { analysisResultAtom, seqNameDuplicatesAtom } from 'src/state/results.state'
import { getSafeId } from 'src/helpers/getSafeId'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { ColumnNameErrorTooltip, ColumnNameTooltip, DuplicateIcon } from 'src/components/Results/ColumnNameTooltip'
import { Tooltip } from 'src/components/Results/Tooltip'
import { getStatusIconAndText } from 'src/components/Results/getStatusIconAndText'

export const SequenceName = styled.div`
  white-space: nowrap;
  overflow: hidden;
`

export interface ColumnNameProps {
  index: number
  seqName: string
}

export function ColumnName({ index, seqName }: ColumnNameProps) {
  const { t } = useTranslationSafe()
  const { result, error } = useRecoilValue(analysisResultAtom(index))
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])
  const id = useMemo(() => getSafeId('sequence-label', { index }), [index])

  const duplicateIndices = useRecoilValue(seqNameDuplicatesAtom(seqName))
  const duplicateIcon = useMemo(() => {
    const hasDuplicates = duplicateIndices.length > 1
    if (hasDuplicates) {
      return <DuplicateIcon />
    }
    return undefined
  }, [duplicateIndices.length])

  const { StatusIcon } = useMemo(
    () =>
      getStatusIconAndText({
        t,
        hasWarnings: !isEmpty(result?.analysisResult.warnings),
        hasErrors: !isNil(error),
      }),
    [error, result?.analysisResult.warnings, t],
  )

  const tooltip = useMemo(() => {
    if (error) {
      return <ColumnNameErrorTooltip index={index} seqName={seqName} error={error} />
    }
    return <ColumnNameTooltip index={index} />
  }, [error, index, seqName])

  return (
    <SequenceName id={id} className="w-100" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <StatusIcon />
      {duplicateIcon}
      {seqName}
      <Tooltip wide fullWidth target={id} isOpen={showTooltip} placement="right-start">
        {tooltip}
      </Tooltip>
    </SequenceName>
  )
}

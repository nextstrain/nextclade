import React, { useCallback, useMemo, useState } from 'react'
import { useAtomValue } from 'jotai'
import { isEmpty, isNil } from 'lodash'
import styled from 'styled-components'

import { analysisResultAtom, seqNameDuplicatesAtom } from 'src/state/results.state'
import { getSafeId } from 'src/helpers/getSafeId'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { ColumnNameErrorTooltip, ColumnNameTooltip, DuplicateIcon } from 'src/components/Results/ColumnNameTooltip'
import { Tooltip } from 'src/components/Results/Tooltip'
import { getStatusIconAndText } from 'src/components/Results/getStatusIconAndText'
import { Button as ButtonShowOnTreeStyle, ButtonShowOnTree } from 'src/components/Results/ButtonShowOnTree'

export const SequenceName = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;

  &:hover ${ButtonShowOnTreeStyle} {
    opacity: 1;
  }
`

const SequenceNameText = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
`

export interface ColumnNameProps {
  index: number
  seqName: string
}

export function ColumnName({ index, seqName }: ColumnNameProps) {
  const { t } = useTranslationSafe()
  const { result, error } = useAtomValue(analysisResultAtom(index))
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])
  const id = useMemo(() => getSafeId('sequence-label', { index }), [index])

  const duplicateIndices = useAtomValue(seqNameDuplicatesAtom(seqName))
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
      <SequenceNameText>{seqName}</SequenceNameText>
      {result && !error && <ButtonShowOnTree seqName={seqName} />}
      <Tooltip wide fullWidth target={id} isOpen={showTooltip} placement="right-start">
        {tooltip}
      </Tooltip>
    </SequenceName>
  )
}

import React, { useCallback, useMemo } from 'react'
import { Button, ButtonProps } from 'reactstrap'
import { useRecoilValue } from 'recoil'
import { useRunAnalysis } from 'src/hooks/useRunAnalysis'
import { hasSingleCurrentDatasetAtom } from 'src/state/dataset.state'
import styled from 'styled-components'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { hasTopSuggestedDatasetsAtom, isAutodetectRunningAtom } from 'src/state/autodetect.state'
import { hasInputErrorsAtom } from 'src/state/error.state'
import { hasRequiredInputsAtom } from 'src/state/inputs.state'
import { isAnalysisRunningAtom } from 'src/state/results.state'

export interface ButtonRunProps extends ButtonProps {
  singleDatasetMode: boolean
}

export function ButtonRun({ singleDatasetMode, ...restProps }: ButtonRunProps) {
  const run = useRunAnalysis()
  const onClick = useCallback(() => run({ isSingle: singleDatasetMode }), [run, singleDatasetMode])

  const isAnalysisRunning = useRecoilValue(isAnalysisRunningAtom)
  const hasRequiredInputs = useRecoilValue(hasRequiredInputsAtom)
  const hasInputErrors = useRecoilValue(hasInputErrorsAtom)
  const isAutodetectRunning = useRecoilValue(isAutodetectRunningAtom)

  const hasSingleDataset = useRecoilValue(hasSingleCurrentDatasetAtom)
  const hasMultiDatasets = useRecoilValue(hasTopSuggestedDatasetsAtom)

  const { t } = useTranslationSafe()
  const { isDisabled, color, tooltip } = useMemo(() => {
    const hasDatasetsSelected = singleDatasetMode ? hasSingleDataset : hasMultiDatasets
    const isDisabled =
      isAnalysisRunning || !(hasRequiredInputs && !isAutodetectRunning) || hasInputErrors || !hasDatasetsSelected
    return {
      isDisabled,
      color: isDisabled ? 'secondary' : 'success',
      tooltip: isDisabled ? t('Please provide sequence data first') : t('Launch the algorithm!'),
    }
  }, [
    singleDatasetMode,
    hasSingleDataset,
    hasMultiDatasets,
    isAnalysisRunning,
    hasRequiredInputs,
    isAutodetectRunning,
    hasInputErrors,
    t,
  ])

  return (
    <ButtonStyled disabled={isDisabled} color={color} onClick={onClick} title={tooltip} {...restProps}>
      {t('Run')}
    </ButtonStyled>
  )
}

const ButtonStyled = styled(Button)`
  min-width: 150px;
  min-height: 40px;
`

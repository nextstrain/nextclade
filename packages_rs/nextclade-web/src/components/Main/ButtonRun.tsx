import { isNil } from 'lodash'
import React, { useMemo } from 'react'
import { Button, ButtonProps } from 'reactstrap'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { isAutodetectRunningAtom } from 'src/state/autodetect.state'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { hasInputErrorsAtom } from 'src/state/error.state'
import { hasRequiredInputsAtom } from 'src/state/inputs.state'
import { canRunAtom } from 'src/state/results.state'

export interface ButtonRunProps extends ButtonProps {
  onClick(): void
}

export function ButtonRun({ onClick, ...restProps }: ButtonRunProps) {
  const canRun = useRecoilValue(canRunAtom)
  const hasRequiredInputs = useRecoilValue(hasRequiredInputsAtom)
  const hasInputErrors = useRecoilValue(hasInputErrorsAtom)
  const isAutodetectRunning = useRecoilValue(isAutodetectRunningAtom)
  const dataset = useRecoilValue(datasetCurrentAtom)

  const { t } = useTranslationSafe()
  const { isDisabled, color, tooltip } = useMemo(() => {
    const isDisabled = !(canRun && hasRequiredInputs && !isAutodetectRunning) || hasInputErrors || isNil(dataset)
    return {
      isDisabled,
      color: isDisabled ? 'secondary' : 'success',
      tooltip: isDisabled ? t('Please provide sequence data first') : t('Launch the algorithm!'),
    }
  }, [canRun, dataset, hasInputErrors, hasRequiredInputs, isAutodetectRunning, t])

  return (
    <ButtonStyled disabled={isDisabled} color={color} onClick={onClick} title={tooltip} {...restProps}>
      {t('Run')}
    </ButtonStyled>
  )
}

const ButtonStyled = styled(Button)`
  min-width: 150px;
  min-height: 45px;
`

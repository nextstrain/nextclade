import React, { useMemo } from 'react'
import { Button, ButtonProps } from 'reactstrap'
import { useRecoilValue } from 'recoil'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { hasInputErrorsAtom } from 'src/state/error.state'
import { hasRequiredInputsAtom } from 'src/state/inputs.state'
import { canRunAtom } from 'src/state/results.state'
import styled from 'styled-components'

export interface ButtonRunProps extends ButtonProps {
  onClick(): void
}

export function ButtonRun({ onClick, ...restProps }: ButtonRunProps) {
  const canRun = useRecoilValue(canRunAtom)
  const hasRequiredInputs = useRecoilValue(hasRequiredInputsAtom)
  const hasInputErrors = useRecoilValue(hasInputErrorsAtom)

  const { t } = useTranslationSafe()
  const { isDisabled, color, tooltip } = useMemo(() => {
    const isDisabled = !(canRun && hasRequiredInputs) || hasInputErrors
    return {
      isDisabled,
      color: isDisabled ? 'secondary' : 'success',
      tooltip: isDisabled ? t('Please provide sequence data first') : t('Launch the algorithm!'),
    }
  }, [canRun, hasInputErrors, hasRequiredInputs, t])

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

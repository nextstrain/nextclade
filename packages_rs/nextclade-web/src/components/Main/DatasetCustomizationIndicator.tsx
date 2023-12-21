import React, { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { ButtonProps } from 'reactstrap'
import styled from 'styled-components'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { inputCustomizationCounterAtom } from 'src/state/inputs.state'

export interface ButtonCustomizeProps extends ButtonProps {
  isOpen: boolean

  onClick(): void
}

export function DatasetCustomizationIndicator({ ...restProps }) {
  const { t } = useTranslationSafe()
  const inputCustomizationCounter = useRecoilValue(inputCustomizationCounterAtom)
  const text = useMemo(
    () => t('Dataset files currently customized: {{n}}', { n: inputCustomizationCounter }),
    [inputCustomizationCounter, t],
  )

  if (inputCustomizationCounter === 0) {
    return null
  }
  return (
    <DatasetCustomizationIndicatorIcon size={20} title={text} {...restProps}>
      {inputCustomizationCounter}
    </DatasetCustomizationIndicatorIcon>
  )
}

export const DatasetCustomizationIndicatorIcon = styled.span<{ size: number }>`
  color: ${(props) => props.theme.gray200};
  background-color: ${(props) => props.theme.danger};
  width: ${(props) => props.size}px;
  height: ${(props) => props.size}px;
  border-radius: ${(props) => props.size}px;
  margin-left: 0.5rem;
  padding: 0 0.25rem;
`

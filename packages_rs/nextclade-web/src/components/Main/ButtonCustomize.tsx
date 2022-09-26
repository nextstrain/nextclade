import React, { PropsWithChildren, useMemo } from 'react'
import classNames from 'classnames'
import { ButtonProps } from 'reactstrap'
import { IoIosArrowDropdownCircle } from 'react-icons/io'
import styled, { useTheme } from 'styled-components'

import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { ButtonTransparent } from 'src/components/Common/ButtonTransparent'
import { inputCustomizationCounterAtom } from 'src/state/inputs.state'
import { useRecoilValue } from 'recoil'

export const CustomizeButton = styled(ButtonTransparent)`
  display: flex;

  height: 1.6rem;
  padding: 0;
  margin: 0;
  margin-top: 5px;
  font-weight: bold;

  text-decoration: none;
`

export const DatasetCustomizationIndicator = styled.span<{ size: number }>`
  color: ${(props) => props.theme.gray200};
  background-color: ${(props) => props.theme.danger};
  width: ${(props) => props.size}px;
  height: ${(props) => props.size}px;
  border-radius: ${(props) => props.size}px;
  margin-left: 0.5rem;
`

export interface ButtonCustomizeProps extends ButtonProps {
  isOpen: boolean

  onClick(): void
}

export function ButtonCustomize({ isOpen, onClick, ...props }: PropsWithChildren<ButtonCustomizeProps>) {
  const { t } = useTranslationSafe()
  const theme = useTheme()

  const inputCustomizationCounter = useRecoilValue(inputCustomizationCounterAtom)

  const inputCustomizationCounterComponent = useMemo(() => {
    if (inputCustomizationCounter === 0) {
      return null
    }
    return <DatasetCustomizationIndicator size={23}>{inputCustomizationCounter}</DatasetCustomizationIndicator>
  }, [inputCustomizationCounter])

  const iconClassName = useMemo(() => classNames('my-auto mr-1', isOpen ? 'icon-rotate-0' : 'icon-rotate-90'), [isOpen])

  const customizeButtonText = useMemo(
    () => (isOpen ? t('Hide dataset files') : t('Customize dataset files')),
    [isOpen, t],
  )

  return (
    <CustomizeButton type="button" color="link" onClick={onClick} {...props}>
      <IoIosArrowDropdownCircle color={theme.gray650} size={25} className={iconClassName} />
      <span>{customizeButtonText}</span>
      {inputCustomizationCounterComponent}
    </CustomizeButton>
  )
}

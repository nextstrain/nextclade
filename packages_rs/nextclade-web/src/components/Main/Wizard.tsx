import React, { useMemo } from 'react'
import styled from 'styled-components'
import { Button, Col as ColBase, Row as RowBase, Form as FormBase } from 'reactstrap'
import { FaChevronLeft as IconLeft, FaChevronRight as IconRight } from 'react-icons/fa6'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

export const WizardContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
`

export const WizardMain = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
`

export const Footer = styled.div`
  display: flex;
  flex: 0;
`

export const FlexRow = styled(RowBase)`
  height: 100%;
`

export const FlexCol = styled(ColBase)`
  display: flex;
  height: 100%;
`

export interface WizardNavigationBarProps {
  prevDisabled?: boolean
  nextDisabled?: boolean
  onPrev?(): void
  onNext?(): void
}

export function WizardNavigationBar({ onPrev, onNext, prevDisabled, nextDisabled }: WizardNavigationBarProps) {
  const { t } = useTranslationSafe()

  const prev = useMemo(() => {
    if (!onPrev) {
      return null
    }
    return (
      <WizardNavigationButton
        color={prevDisabled ? 'secondary' : 'danger'}
        className="mr-auto"
        onClick={onPrev}
        disabled={prevDisabled}
      >
        <IconLeft size={15} className="mr-1" />
        {t('Previous')}
      </WizardNavigationButton>
    )
  }, [onPrev, prevDisabled, t])

  const next = useMemo(() => {
    if (!onNext) {
      return null
    }
    return (
      <WizardNavigationButton
        color={nextDisabled ? 'secondary' : 'success'}
        className="ml-auto"
        onClick={onNext}
        disabled={nextDisabled}
      >
        {t('Next')}
        <IconRight size={15} className="ml-1" />
      </WizardNavigationButton>
    )
  }, [nextDisabled, onNext, t])

  return (
    <WizardNavigationForm>
      {prev}
      {next}
    </WizardNavigationForm>
  )
}

export const WizardNavigationForm = styled(FormBase)`
  display: flex;
  width: 100%;
  height: 100%;
  margin-top: auto;
  padding: 10px;
  border: 1px #ccc9 solid;
  border-radius: 5px;
`

export const WizardNavigationButton = styled(Button)`
  min-width: 140px;
  min-height: 40px;
  text-align: center;
  vertical-align: middle;
`

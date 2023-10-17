import React, { useCallback, useMemo, useState } from 'react'
import styled from 'styled-components'
import { Layout } from 'src/components/Layout/Layout'
import { Dataset } from '_SchemaRoot'
import { useRouter } from 'next/router'
import { useRecoilState, useRecoilValue } from 'recoil'
import { FaChevronLeft as IconLeft, FaChevronRight as IconRight } from 'react-icons/fa6'
import {
  FlexCol,
  FlexRow,
  Footer,
  WizardContainer,
  WizardMain,
  WizardNavigationButton,
  WizardNavigationForm,
} from 'src/components/Main/Wizard'
import { QuerySequenceFilePicker } from 'src/components/Main/QuerySequenceFilePicker'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { hasAutodetectResultsAtom } from 'src/state/autodetect.state'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { globalErrorAtom } from 'src/state/error.state'
import { DatasetAutosuggestionResultsList } from 'src/components/Main/DatasetSelector'

const Main = styled.div`
  display: flex;
  flex: 1 1 100%;
  overflow: hidden;
  padding: 0;
  margin: 0 auto;

  width: 100%;
  max-width: 1400px;
`

export function DatasetAutodetectPage() {
  return (
    <Layout>
      <Main>
        <WizardAuto />
      </Main>
    </Layout>
  )
}

export function WizardAuto() {
  const { t } = useTranslationSafe()
  const { push } = useRouter()
  const [dataset, setDataset] = useRecoilState(datasetCurrentAtom)
  const [datasetHighlighted, setDatasetHighlighted] = useState<Dataset | undefined>(dataset)

  const onPrevious = useCallback(() => {
    void push('/') // eslint-disable-line no-void
  }, [push])

  const onNext = useCallback(() => {
    setDataset(datasetHighlighted)
    void push('/dataset') // eslint-disable-line no-void
  }, [datasetHighlighted, push, setDataset])

  const hasAutodetectResults = useRecoilValue(hasAutodetectResultsAtom)
  const hasErrors = !!useRecoilValue(globalErrorAtom)

  const { isRunButtonDisabled, runButtonColor, runButtonTooltip } = useMemo(() => {
    const hasDatasetHighlighted = !!datasetHighlighted
    const isRunButtonDisabled = !hasAutodetectResults || !hasDatasetHighlighted || hasErrors
    return {
      isRunButtonDisabled,
      runButtonColor: isRunButtonDisabled ? 'secondary' : 'success',
      runButtonTooltip: isRunButtonDisabled
        ? t('Please provide sequence data and select one of the datasets')
        : t('Go to the next step!'),
    }
  }, [datasetHighlighted, hasAutodetectResults, hasErrors, t])

  return (
    <WizardContainer>
      <WizardMain>
        <FlexRow noGutters>
          <FlexCol lg={6}>
            <DatasetAutosuggestionResultsList
              datasetHighlighted={datasetHighlighted}
              onDatasetHighlighted={setDatasetHighlighted}
            />
          </FlexCol>
          <FlexCol lg={6}>
            <QuerySequenceFilePicker />
          </FlexCol>
        </FlexRow>
      </WizardMain>
      <Footer>
        <WizardNavigationForm>
          <WizardNavigationButton color="danger" className="mr-auto" onClick={onPrevious}>
            <IconLeft size={15} className="mr-1" />
            {t('Previous')}
          </WizardNavigationButton>

          <WizardNavigationButton
            className="ml-auto"
            disabled={isRunButtonDisabled}
            color={runButtonColor}
            onClick={onNext}
            title={runButtonTooltip}
          >
            {t('Next')}
            <IconRight size={15} className="ml-1" />
          </WizardNavigationButton>
        </WizardNavigationForm>
      </Footer>
    </WizardContainer>
  )
}

import { Dataset } from '_SchemaRoot'
import React, { useCallback, useMemo, useState } from 'react'
import { useRecoilState, useRecoilValue, useResetRecoilState, useSetRecoilState } from 'recoil'
import { FlexRight } from 'src/components/FilePicker/FilePickerStyles'
import { DatasetCurrent } from 'src/components/Main/DatasetCurrent'
import { MainSectionTitle } from 'src/components/Main/MainSectionTitle'
import { QuerySequenceFilePicker } from 'src/components/Main/QuerySequenceFilePicker'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { useRunAnalysis } from 'src/hooks/useRunAnalysis'
import { useRecoilToggle } from 'src/hooks/useToggle'
import { AlgorithmInputDefault } from 'src/io/AlgorithmInput'
import { hasAutodetectResultsAtom } from 'src/state/autodetect.state'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { globalErrorAtom, hasInputErrorsAtom } from 'src/state/error.state'
import { hasRequiredInputsAtom, useQuerySeqInputs } from 'src/state/inputs.state'
import { canRunAtom } from 'src/state/results.state'
import { shouldRunAutomaticallyAtom } from 'src/state/settings.state'
import styled from 'styled-components'
import { Button, Col as ColBase, Row as RowBase, Form as FormBase } from 'reactstrap'
import { useUpdatedDatasetIndex } from 'src/io/fetchDatasets'
import { DatasetSelector } from 'src/components/Main/DatasetSelector'
import { FaChevronLeft as IconLeft, FaChevronRight as IconRight } from 'react-icons/fa6'

const Container = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  margin-right: 10px;
`

const Header = styled.div`
  display: flex;
  flex: 0;
  padding-left: 10px;
  margin-top: 10px;
  margin-bottom: 3px;
`

const Main = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
`

const Footer = styled.div`
  display: flex;
  flex: 0;
`

const Row = styled(RowBase)`
  overflow: hidden;
`

const Col = styled(ColBase)`
  overflow: hidden;
`

export function MainInputForm() {
  // This periodically fetches dataset index and updates the list of datasets.
  useUpdatedDatasetIndex()

  return <WizardManualOrAuto />
}

function WizardManualOrAuto() {
  const dataset = useRecoilValue(datasetCurrentAtom)
  const setDataset = useSetRecoilState(datasetCurrentAtom)

  const [datasetHighlighted, setDatasetHighlighted] = useState<Dataset | undefined>()

  const apply = useCallback(() => {
    setDataset(datasetHighlighted)
  }, [datasetHighlighted, setDataset])

  const wizard = useMemo(() => {
    if (!dataset) {
      return (
        <Landing datasetHighlighted={datasetHighlighted} onDatasetHighlighted={setDatasetHighlighted} apply={apply} />
      )
    }
    if (dataset.path === 'autodetect') {
      return (
        <WizardAuto
          datasetHighlighted={datasetHighlighted}
          onDatasetHighlighted={setDatasetHighlighted}
          apply={apply}
        />
      )
    }
    return <WizardManual />
  }, [apply, dataset, datasetHighlighted])

  return (
    <Container>
      <Main>{wizard}</Main>
    </Container>
  )
}

export interface LandingProps {
  datasetHighlighted?: Dataset
  onDatasetHighlighted?(dataset?: Dataset): void
  apply(): void
}

function Landing({ datasetHighlighted, onDatasetHighlighted, apply }: LandingProps) {
  return (
    <Container>
      <Header>
        <MainSectionTitle />
      </Header>
      <Main>
        <DatasetSelector datasetHighlighted={datasetHighlighted} onDatasetHighlighted={onDatasetHighlighted} />
      </Main>
      <Footer>
        <WizardNavigationBar onNext={apply} nextDisabled={!datasetHighlighted} />
      </Footer>
    </Container>
  )
}

function WizardManual() {
  const { t } = useTranslationSafe()

  const [datasetCurrent, setDatasetCurrent] = useRecoilState(datasetCurrentAtom)
  const { addQryInputs } = useQuerySeqInputs()
  const hasRequiredInputs = useRecoilValue(hasRequiredInputsAtom)
  const hasInputErrors = useRecoilValue(hasInputErrorsAtom)
  const { state: shouldRunAutomatically } = useRecoilToggle(shouldRunAutomaticallyAtom)
  const canRun = useRecoilValue(canRunAtom)
  const runAnalysis = useRunAnalysis()

  const setExampleSequences = useCallback(() => {
    if (datasetCurrent) {
      addQryInputs([new AlgorithmInputDefault(datasetCurrent)])
      if (shouldRunAutomatically) {
        runAnalysis()
      }
    }
  }, [addQryInputs, datasetCurrent, runAnalysis, shouldRunAutomatically])

  const { isRunButtonDisabled, runButtonColor, runButtonTooltip } = useMemo(() => {
    const isRunButtonDisabled = !(canRun && hasRequiredInputs) || hasInputErrors
    return {
      isRunButtonDisabled,
      runButtonColor: isRunButtonDisabled ? 'secondary' : 'success',
      runButtonTooltip: isRunButtonDisabled
        ? t('Please provide sequence data for the algorithm')
        : t('Launch the algorithm!'),
    }
  }, [canRun, hasInputErrors, hasRequiredInputs, t])

  const onPrev = useCallback(() => {
    setDatasetCurrent(undefined)
  }, [setDatasetCurrent])

  return (
    <Container>
      <Main>
        <Row noGutters className="flex-column-reverse flex-lg-row">
          <Col lg={6} className="">
            <DatasetCurrent />
          </Col>
          <Col lg={6} className="">
            <QuerySequenceFilePicker />
          </Col>
        </Row>
      </Main>
      <Footer>
        <WizardNavigationForm>
          <WizardNavigationButton color="danger" className="mr-auto" onClick={onPrev}>
            <IconLeft size={15} className="mr-1" />
            {t('Previous')}
          </WizardNavigationButton>

          <FlexRight>
            <Button color="link" onClick={setExampleSequences} disabled={hasInputErrors || !datasetCurrent}>
              {t('Load example')}
            </Button>

            <WizardNavigationButton
              disabled={isRunButtonDisabled}
              color={runButtonColor}
              onClick={runAnalysis}
              title={runButtonTooltip}
            >
              {t('Launch')}
              <IconRight size={15} className="ml-1" />
            </WizardNavigationButton>
          </FlexRight>
        </WizardNavigationForm>
      </Footer>
    </Container>
  )
}

export interface WizardAutoProps {
  datasetHighlighted?: Dataset
  onDatasetHighlighted?(dataset?: Dataset): void
  apply(): void
}

function WizardAuto({ datasetHighlighted, onDatasetHighlighted, apply }: WizardAutoProps) {
  const { t } = useTranslationSafe()
  const resetDataset = useResetRecoilState(datasetCurrentAtom)
  const hasAutodetectResults = useRecoilValue(hasAutodetectResultsAtom)
  const hasErrors = !!useRecoilValue(globalErrorAtom)

  const { isRunButtonDisabled, runButtonColor, runButtonTooltip } = useMemo(() => {
    const isRunButtonDisabled = !hasAutodetectResults || hasErrors
    return {
      isRunButtonDisabled,
      runButtonColor: isRunButtonDisabled ? 'secondary' : 'success',
      runButtonTooltip: isRunButtonDisabled
        ? t('Please provide sequence data and select one of the datasets')
        : t('Go to the next step!'),
    }
  }, [hasAutodetectResults, hasErrors, t])

  return (
    <Container>
      <Main>
        <Row noGutters className="flex-column-reverse flex-lg-row">
          <Col lg={6} className="">
            <DatasetSelector datasetHighlighted={datasetHighlighted} onDatasetHighlighted={onDatasetHighlighted} />
          </Col>
          <Col lg={6} className="">
            <QuerySequenceFilePicker />
          </Col>
        </Row>
      </Main>
      <Footer>
        <WizardNavigationForm>
          <WizardNavigationButton color="danger" className="mr-auto" onClick={resetDataset}>
            <IconLeft size={15} className="mr-1" />
            {t('Previous')}
          </WizardNavigationButton>

          <FlexRight>
            <WizardNavigationButton
              disabled={isRunButtonDisabled}
              color={runButtonColor}
              onClick={apply}
              title={runButtonTooltip}
            >
              {t('Next')}
              <IconRight size={15} className="ml-1" />
            </WizardNavigationButton>
          </FlexRight>
        </WizardNavigationForm>
      </Footer>
    </Container>
  )
}

// function WizardAutoFooter() {
//   const { t } = useTranslationSafe()
//   const { previousStep, nextStep, isLastStep } = useWizard()
//
//   return (
//
//   )
// }
//
// function WizardAutoStep1() {
//   const [datasetHighlighted, setDatasetHighlighted] = useState<Dataset | undefined>()
//   const setDataset = useSetRecoilState(datasetCurrentAtom)
//
//   const apply = useCallback(() => {
//     setDataset(datasetHighlighted)
//   }, [datasetHighlighted, setDataset])
//
//   return (
//
//   )
// }

// function WizardAutoStep2() {
//   return <AutodetectPage />
// }

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

const WizardNavigationForm = styled(FormBase)`
  display: flex;
  width: 100%;
  height: 100%;
  margin-top: auto;
  padding: 10px;
  border: 1px #ccc9 solid;
  border-radius: 5px;
`

const WizardNavigationButton = styled(Button)`
  min-width: 140px;
  min-height: 40px;
  text-align: center;
  vertical-align: middle;
`

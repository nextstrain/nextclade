import React, { useCallback, useEffect, useMemo } from 'react'
import { Layout } from 'src/components/Layout/Layout'
import { useRouter } from 'next/router'
import { useRecoilState, useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { Button } from 'reactstrap'
import {
  Footer,
  WizardContainer,
  WizardMain,
  WizardNavigationButton,
  WizardNavigationForm,
} from 'src/components/Main/Wizard'
import { isDatasetPageVisitedAtom } from 'src/state/navigation.state'
import { WizardManualStep } from 'src/components/Main/WizardManualStep'
import { FaChevronLeft as IconLeft, FaChevronRight as IconRight } from 'react-icons/fa6'
import { ToggleRunAutomatically } from 'src/components/Main/RunPanel'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { useRunAnalysis } from 'src/hooks/useRunAnalysis'
import { useRecoilToggle } from 'src/hooks/useToggle'
import { AlgorithmInputDefault } from 'src/io/AlgorithmInput'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { hasInputErrorsAtom } from 'src/state/error.state'
import { hasRequiredInputsAtom, useQuerySeqInputs } from 'src/state/inputs.state'
import { canRunAtom } from 'src/state/results.state'
import { shouldRunAutomaticallyAtom } from 'src/state/settings.state'

const Main = styled.div`
  display: flex;
  flex: 1 1 100%;
  overflow: hidden;
  padding: 0;
  margin: 0 auto;

  width: 100%;
  max-width: 1400px;
`

export function DatasetPage() {
  return (
    <Layout>
      <Main>
        <WizardManual />
      </Main>
    </Layout>
  )
}

export function WizardManual() {
  const { t } = useTranslationSafe()
  const { back } = useRouter()
  const [datasetCurrent, _setDatasetCurrent] = useRecoilState(datasetCurrentAtom)
  const { addQryInputs } = useQuerySeqInputs()
  const hasRequiredInputs = useRecoilValue(hasRequiredInputsAtom)
  const hasInputErrors = useRecoilValue(hasInputErrorsAtom)
  const { state: shouldRunAutomatically } = useRecoilToggle(shouldRunAutomaticallyAtom)
  const canRun = useRecoilValue(canRunAtom)
  const runAnalysis = useRunAnalysis()
  const { enable: setDatasetPageVisited } = useRecoilToggle(isDatasetPageVisitedAtom)

  useEffect(() => {
    setDatasetPageVisited()
  }, [setDatasetPageVisited])

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

  const onPrevious = useCallback(() => {
    back()
  }, [back])

  return (
    <WizardContainer>
      <WizardMain>
        <WizardManualStep />
      </WizardMain>
      <Footer>
        <WizardNavigationForm>
          <WizardNavigationButton color="danger" className="mr-auto" onClick={onPrevious}>
            <IconLeft size={15} className="mr-1" />
            {t('Previous')}
          </WizardNavigationButton>

          <ToggleRunAutomatically className="mx-2" />

          <Button
            color="link"
            className="mx-2"
            onClick={setExampleSequences}
            disabled={hasInputErrors || !datasetCurrent}
          >
            {t('Load example')}
          </Button>

          <WizardNavigationButton
            disabled={isRunButtonDisabled}
            color={runButtonColor}
            onClick={runAnalysis}
            title={runButtonTooltip}
          >
            {t('Run')}
            <IconRight size={15} className="ml-1" />
          </WizardNavigationButton>
        </WizardNavigationForm>
      </Footer>
    </WizardContainer>
  )
}

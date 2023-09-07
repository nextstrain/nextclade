import React, { useCallback, useMemo } from 'react'
import { Button, Col, Form, FormGroup, Row } from 'reactstrap'
import { useRecoilValue } from 'recoil'
import { QuerySequenceList } from 'src/components/Main/QuerySequenceList'
import { useRunAnalysis } from 'src/hooks/useRunAnalysis'
import { useRunSeqAutodetect } from 'src/hooks/useRunSeqAutodetect'
import { useRecoilToggle } from 'src/hooks/useToggle'
import { canRunAtom } from 'src/state/results.state'
import styled from 'styled-components'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { hasInputErrorsAtom, qrySeqErrorAtom } from 'src/state/error.state'
import { shouldRunAutomaticallyAtom, shouldSuggestDatasetsAtom } from 'src/state/settings.state'
import type { AlgorithmInput } from 'src/types'
import { Toggle } from 'src/components/Common/Toggle'
import { FlexLeft, FlexRight } from 'src/components/FilePicker/FilePickerStyles'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { AlgorithmInputDefault } from 'src/io/AlgorithmInput'
import { FilePicker } from 'src/components/FilePicker/FilePicker'
import { FileIconFasta } from 'src/components/Common/FileIcons'
import { hasRequiredInputsAtom, useQuerySeqInputs } from 'src/state/inputs.state'

const SequenceFilePickerContainer = styled.section`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
`

const ButtonRunStyled = styled(Button)`
  min-width: 160px;
  min-height: 50px;
  margin-left: 1rem;
`

export function QuerySequenceFilePicker() {
  const { t } = useTranslationSafe()

  const datasetCurrent = useRecoilValue(datasetCurrentAtom)
  const { qryInputs, addQryInputs } = useQuerySeqInputs()
  const qrySeqError = useRecoilValue(qrySeqErrorAtom)

  const canRun = useRecoilValue(canRunAtom)
  const { state: shouldRunAutomatically, toggle: toggleRunAutomatically } = useRecoilToggle(shouldRunAutomaticallyAtom)
  const shouldSuggestDatasets = useRecoilValue(shouldSuggestDatasetsAtom)

  const hasRequiredInputs = useRecoilValue(hasRequiredInputsAtom)
  const hasInputErrors = useRecoilValue(hasInputErrorsAtom)

  const icon = useMemo(() => <FileIconFasta />, [])

  const runAnalysis = useRunAnalysis()
  const runAutodetect = useRunSeqAutodetect()

  const setSequences = useCallback(
    (inputs: AlgorithmInput[]) => {
      addQryInputs(inputs)
      if (shouldSuggestDatasets) {
        runAutodetect()
      }
      if (shouldRunAutomatically) {
        runAnalysis()
      }
    },
    [addQryInputs, runAnalysis, runAutodetect, shouldRunAutomatically, shouldSuggestDatasets],
  )

  const setExampleSequences = useCallback(() => {
    if (datasetCurrent) {
      addQryInputs([new AlgorithmInputDefault(datasetCurrent)])
      if (shouldSuggestDatasets) {
        runAutodetect()
      }
      if (shouldRunAutomatically) {
        runAnalysis()
      }
    }
  }, [addQryInputs, datasetCurrent, runAnalysis, runAutodetect, shouldRunAutomatically, shouldSuggestDatasets])

  const { isRunButtonDisabled, runButtonColor, runButtonTooltip } = useMemo(() => {
    const isRunButtonDisabled = !(canRun && hasRequiredInputs) || hasInputErrors
    return {
      isRunButtonDisabled,
      runButtonColor: isRunButtonDisabled ? 'secondary' : 'success',
      runButtonTooltip: isRunButtonDisabled
        ? t('Please provide input files for the algorithm')
        : t('Launch the algorithm!'),
    }
  }, [canRun, hasInputErrors, hasRequiredInputs, t])

  const headerText = useMemo(() => {
    if (qryInputs.length > 0) {
      return t('Add more sequence data')
    }
    return t('Provide sequence data')
  }, [qryInputs.length, t])

  return (
    <SequenceFilePickerContainer>
      <QuerySequenceList />

      <FilePicker
        className="my-3"
        title={headerText}
        icon={icon}
        exampleUrl="https://example.com/sequences.fasta"
        pasteInstructions={t('Enter sequence data in FASTA format')}
        input={undefined}
        error={qrySeqError}
        isInProgress={false}
        onInputs={setSequences}
        multiple
      />

      <Row noGutters className="mt-2">
        <Col className="w-100 d-flex">
          <FlexLeft>
            <Form className="d-flex h-100 mt-1">
              <FormGroup className="my-auto">
                <Toggle
                  identifier="toggle-run-automatically"
                  checked={shouldRunAutomatically}
                  onCheckedChanged={toggleRunAutomatically}
                >
                  <span title="Run Nextclade automatically after sequence data is provided">
                    {t('Run automatically')}
                  </span>
                </Toggle>
              </FormGroup>
            </Form>
          </FlexLeft>

          <FlexRight>
            <Button color="link" onClick={setExampleSequences} disabled={hasInputErrors || !datasetCurrent}>
              {t('Load example')}
            </Button>

            <ButtonRunStyled
              disabled={isRunButtonDisabled}
              color={runButtonColor}
              onClick={runAnalysis}
              title={runButtonTooltip}
            >
              {t('Run')}
            </ButtonRunStyled>
          </FlexRight>
        </Col>
      </Row>
    </SequenceFilePickerContainer>
  )
}

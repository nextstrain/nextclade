import { noop } from 'lodash'
import React, { useCallback, useMemo } from 'react'
import { Button, Col, Form, FormGroup, Row } from 'reactstrap'
import { useRecoilState, useRecoilValue } from 'recoil'
import { MainInputFormSequencesCurrent } from 'src/components/Main/MainInputFormSequencesCurrent'
import { useRunAnalysis } from 'src/hooks/useRunAnalysis'
import { useRunSeqAutodetect } from 'src/hooks/useRunSeqAutodetect'
import { canRunAtom } from 'src/state/results.state'
import styled from 'styled-components'

import { datasetCurrentAtom } from 'src/state/dataset.state'
import { hasInputErrorsAtom, qrySeqErrorAtom } from 'src/state/error.state'
import { shouldRunAutomaticallyAtom } from 'src/state/settings.state'
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

export function MainInputFormSequenceFilePicker() {
  const { t } = useTranslationSafe()

  const datasetCurrent = useRecoilValue(datasetCurrentAtom)
  const { qryInputs, addQryInputs } = useQuerySeqInputs()
  const qrySeqError = useRecoilValue(qrySeqErrorAtom)

  const canRun = useRecoilValue(canRunAtom)
  const [shouldRunAutomatically, setShouldRunAutomatically] = useRecoilState(shouldRunAutomaticallyAtom)
  const hasRequiredInputs = useRecoilValue(hasRequiredInputsAtom)
  const hasInputErrors = useRecoilValue(hasInputErrorsAtom)

  const icon = useMemo(() => <FileIconFasta />, [])

  const runAnalysis = useRunAnalysis()
  const runAutodetect = useRunSeqAutodetect()

  const run = useCallback(() => {
    if (datasetCurrent?.path === 'autodetect') {
      runAutodetect()
    } else {
      runAnalysis()
    }
  }, [datasetCurrent?.path, runAnalysis, runAutodetect])

  const setSequences = useCallback(
    (inputs: AlgorithmInput[]) => {
      addQryInputs(inputs)
      if (shouldRunAutomatically) {
        run()
      }
    },
    [addQryInputs, run, shouldRunAutomatically],
  )

  const setExampleSequences = useCallback(() => {
    if (datasetCurrent) {
      addQryInputs([new AlgorithmInputDefault(datasetCurrent)])
      if (shouldRunAutomatically) {
        run()
      }
    }
  }, [addQryInputs, datasetCurrent, run, shouldRunAutomatically])

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

  const LoadExampleLink = useMemo(() => {
    const cannotLoadExample = hasInputErrors || !datasetCurrent || datasetCurrent.path === 'autodetect'
    return (
      <Button color="link" onClick={setExampleSequences} disabled={cannotLoadExample}>
        {t('Load example')}
      </Button>
    )
  }, [datasetCurrent, hasInputErrors, setExampleSequences, t])

  const onToggleRunAutomatically = useCallback(() => {
    setShouldRunAutomatically((shouldRunAutomatically) => !shouldRunAutomatically)
  }, [setShouldRunAutomatically])

  const headerText = useMemo(() => {
    if (qryInputs.length > 0) {
      return t('Add more sequence data')
    }
    return t('Provide sequence data')
  }, [qryInputs.length, t])

  return (
    <SequenceFilePickerContainer>
      <MainInputFormSequencesCurrent />

      <FilePicker
        className="my-3"
        title={headerText}
        icon={icon}
        exampleUrl="https://example.com/sequences.fasta"
        pasteInstructions={t('Enter sequence data in FASTA format')}
        input={undefined}
        error={qrySeqError}
        isInProgress={false}
        onRemove={noop}
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
                  onCheckedChanged={onToggleRunAutomatically}
                >
                  <span title="Run Nextclade automatically after sequence data is provided">
                    {t('Run automatically')}
                  </span>
                </Toggle>
              </FormGroup>
            </Form>
          </FlexLeft>

          <FlexRight>
            {LoadExampleLink}

            <ButtonRunStyled
              disabled={isRunButtonDisabled}
              color={runButtonColor}
              onClick={run}
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

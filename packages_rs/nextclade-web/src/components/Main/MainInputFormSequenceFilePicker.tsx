import React, { useCallback, useMemo } from 'react'
import { Button, Col, Form, FormGroup, Row } from 'reactstrap'
import { useRecoilState, useRecoilValue, useResetRecoilState } from 'recoil'
import { useRunAnalysis } from 'src/hooks/useRunAnalysis'
import styled from 'styled-components'

import { canRunAtom } from 'src/state/analysisStatusGlobal.state'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { hasInputErrorsAtom, qrySeqErrorAtom } from 'src/state/error.state'
import { shouldRunAutomaticallyAtom } from 'src/state/settings.state'
import type { AlgorithmInput } from 'src/state/algorithm/algorithm.state'
import { Toggle } from 'src/components/Common/Toggle'
import { FlexLeft, FlexRight } from 'src/components/FilePicker/FilePickerStyles'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { AlgorithmInputDefault } from 'src/io/AlgorithmInput'
import { FilePicker } from 'src/components/FilePicker/FilePicker'
import { FileIconFasta } from 'src/components/Common/FileIcons'
import { qrySeqAtom, hasRequiredInputsAtom } from 'src/state/inputs.state'

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
  const [qrySeq, setQrySeq] = useRecoilState(qrySeqAtom)
  const removeQrySeq = useResetRecoilState(qrySeqAtom)
  const qrySeqError = useRecoilValue(qrySeqErrorAtom)

  const canRun = useRecoilValue(canRunAtom)
  const [shouldRunAutomatically, setShouldRunAutomatically] = useRecoilState(shouldRunAutomaticallyAtom)
  const hasRequiredInputs = useRecoilValue(hasRequiredInputsAtom)
  const hasInputErrors = useRecoilValue(hasInputErrorsAtom)

  const isInProgressFasta = useMemo(() => false, []) // TODO: decide whether this is needed at all

  const icon = useMemo(() => <FileIconFasta />, [])

  const run = useRunAnalysis()

  const setSequences = useCallback(
    (input: AlgorithmInput) => {
      setQrySeq(input)

      if (shouldRunAutomatically) {
        run()
      }
    },
    [run, setQrySeq, shouldRunAutomatically],
  )

  const setExampleSequences = useCallback(() => {
    if (datasetCurrent) {
      setQrySeq(new AlgorithmInputDefault(datasetCurrent))

      if (shouldRunAutomatically) {
        run()
      }
    }
  }, [datasetCurrent, run, setQrySeq, shouldRunAutomatically])

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
    const cannotLoadExample = hasRequiredInputs || isInProgressFasta || hasInputErrors || !datasetCurrent
    return (
      <Button color="link" onClick={setExampleSequences} disabled={cannotLoadExample}>
        {t('Load example')}
      </Button>
    )
  }, [datasetCurrent, hasInputErrors, hasRequiredInputs, isInProgressFasta, setExampleSequences, t])

  const onToggleRunAutomatically = useCallback(() => {
    setShouldRunAutomatically((shouldRunAutomatically) => !shouldRunAutomatically)
  }, [setShouldRunAutomatically])

  return (
    <SequenceFilePickerContainer>
      <FilePicker
        title={t('Provide sequence data')}
        icon={icon}
        exampleUrl="https://example.com/sequences.fasta"
        pasteInstructions={t('Enter sequence data in FASTA or plain text format')}
        input={qrySeq}
        error={qrySeqError}
        isInProgress={isInProgressFasta}
        onRemove={removeQrySeq}
        onInput={setSequences}
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

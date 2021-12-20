import { delay } from 'lodash'
import React, { useCallback, useMemo } from 'react'

import { connect } from 'react-redux'
import { Button, Col, Row } from 'reactstrap'
import { FlexRight } from 'src/components/FilePicker/FilePickerStyles'
import styled from 'styled-components'

import type { DatasetFlat } from 'src/algorithms/types'
import type { State } from 'src/state/reducer'
import type { AlgorithmInput, AlgorithmParams } from 'src/state/algorithm/algorithm.state'
import { AlgorithmInputDefault } from 'src/io/AlgorithmInput'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { algorithmRunAsync, removeFasta, setFasta, setIsDirty } from 'src/state/algorithm/algorithm.actions'
import { setShowNewRunPopup } from 'src/state/ui/ui.actions'
import {
  selectCanRun,
  selectCurrentDataset,
  selectHasRequiredInputs,
  selectParams,
  selectIsInProgressFasta,
} from 'src/state/algorithm/algorithm.selectors'
import { FilePicker } from 'src/components/FilePicker/FilePicker'
import { FileIconFasta } from 'src/components/Common/FileIcons'

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

export interface MainInputFormSequenceFilePickerProps {
  params: AlgorithmParams
  datasetCurrent?: DatasetFlat
  canRun: boolean
  hasRequiredInputs: boolean
  isInProgressFasta: boolean
  algorithmRunTrigger(_0: unknown): void
  setShowNewRunPopup(showNewRunPopup: boolean): void
  setIsDirty(isDirty: boolean): void
  setFasta(input: AlgorithmInput): void
  removeFasta(_0: unknown): void
}

const mapStateToProps = (state: State) => ({
  params: selectParams(state),
  datasetCurrent: selectCurrentDataset(state),
  canRun: selectCanRun(state),
  hasRequiredInputs: selectHasRequiredInputs(state),
  isInProgressFasta: selectIsInProgressFasta(state),
})

const mapDispatchToProps = {
  setFasta: setFasta.trigger,
  removeFasta,
  algorithmRunTrigger: algorithmRunAsync.trigger,
  setShowNewRunPopup,
  setIsDirty,
}

export const MainInputFormSequenceFilePicker = connect(
  mapStateToProps,
  mapDispatchToProps,
)(MainInputFormSequenceFilePickerDisconnected)

export function MainInputFormSequenceFilePickerDisconnected({
  params,
  datasetCurrent,
  canRun,
  hasRequiredInputs,
  algorithmRunTrigger,
  setFasta,
  removeFasta,
  isInProgressFasta,
  setShowNewRunPopup,
  setIsDirty,
}: MainInputFormSequenceFilePickerProps) {
  const { t } = useTranslationSafe()

  const run = useCallback(() => {
    setShowNewRunPopup(false)
    setIsDirty(true)
    delay(algorithmRunTrigger, 1000)
  }, [algorithmRunTrigger, setShowNewRunPopup, setIsDirty])

  const setExampleSequences = useCallback(() => {
    if (!datasetCurrent) {
      throw new Error('Internal error: dataset is not ready')
    }
    setFasta(new AlgorithmInputDefault(datasetCurrent))
  }, [datasetCurrent, setFasta])

  const { isRunButtonDisabled, runButtonColor, runButtonTooltip } = useMemo(() => {
    const isRunButtonDisabled = !(canRun && hasRequiredInputs)
    return {
      isRunButtonDisabled,
      runButtonColor: isRunButtonDisabled ? 'secondary' : 'success',
      runButtonTooltip: isRunButtonDisabled
        ? t('Please provide input files for the algorithm')
        : t('Launch the algorithm!'),
    }
  }, [canRun, hasRequiredInputs, t])

  const LoadExampleLink = useMemo(() => {
    if (hasRequiredInputs || isInProgressFasta) {
      return null
    }
    return (
      <Button color="link" onClick={setExampleSequences}>
        <small>{t('Load example')}</small>
      </Button>
    )
  }, [hasRequiredInputs, isInProgressFasta, setExampleSequences, t])

  return (
    <SequenceFilePickerContainer>
      <FilePicker
        title={t('Provide sequence data')}
        icon={<FileIconFasta />}
        exampleUrl="https://example.com/sequences.fasta"
        pasteInstructions={t('Enter sequence data in FASTA or plain text format')}
        input={params.raw.seqData}
        errors={params.errors.seqData}
        isInProgress={isInProgressFasta}
        onRemove={removeFasta}
        onInput={setFasta}
      />

      <Row noGutters className="mt-2">
        <Col className="w-100 d-flex">
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

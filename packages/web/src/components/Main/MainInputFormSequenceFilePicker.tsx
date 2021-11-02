import { delay } from 'lodash'
import React, { useCallback, useMemo } from 'react'

import { connect } from 'react-redux'
import { Button } from 'reactstrap'
import { AlgorithmInput, AlgorithmParams } from 'src/state/algorithm/algorithm.state'
import styled from 'styled-components'

import type { State } from 'src/state/reducer'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { algorithmRunAsync, removeFasta, setFasta, setIsDirty } from 'src/state/algorithm/algorithm.actions'
import { setShowNewRunPopup } from 'src/state/ui/ui.actions'
import { selectCanRun, selectHasRequiredInputs, selectParams } from 'src/state/algorithm/algorithm.selectors'
import { FilePicker } from 'src/components/FilePicker/FilePicker'
import { FileIconFasta } from 'src/components/Common/FileIcons'

const SequenceFilePickerContainer = styled.section`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
`

const ButtonRunStyled = styled(Button)`
  min-width: 100px;
  margin-left: auto;
`

export interface MainInputFormSequenceFilePickerProps {
  params: AlgorithmParams
  canRun: boolean
  hasRequiredInputs: boolean
  algorithmRunTrigger(_0: unknown): void
  setShowNewRunPopup(showNewRunPopup: boolean): void
  setIsDirty(isDirty: boolean): void
  setFasta(input: AlgorithmInput): void
  removeFasta(_0: unknown): void
}

const mapStateToProps = (state: State) => ({
  params: selectParams(state),
  canRun: selectCanRun(state),
  hasRequiredInputs: selectHasRequiredInputs(state),
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
  canRun,
  hasRequiredInputs,
  algorithmRunTrigger,
  setFasta,
  removeFasta,
  setShowNewRunPopup,
  setIsDirty,
}: MainInputFormSequenceFilePickerProps) {
  const { t } = useTranslationSafe()

  const run = useCallback(() => {
    setShowNewRunPopup(false)
    setIsDirty(true)
    delay(algorithmRunTrigger, 1000)
  }, [algorithmRunTrigger, setShowNewRunPopup, setIsDirty])

  const color = useMemo(() => (canRun ? 'success' : 'secondary'), [canRun])
  const title = useMemo(
    () =>
      canRun && hasRequiredInputs ? t('Launch the analysis') : t('Please provide the correct inputs for the algorithm'),
    [canRun, hasRequiredInputs, t],
  )

  return (
    <SequenceFilePickerContainer>
      <FilePicker
        title={t('Provide Sequences')}
        icon={<FileIconFasta />}
        exampleUrl="https://example.com/sequences.fasta"
        pasteInstructions={t('Enter sequence data in FASTA or plain text format')}
        input={params.raw.seqData}
        errors={params.errors.seqData}
        onRemove={removeFasta}
        onInput={setFasta}
      />

      <Button color="link" onClick={run}>
        <small>{t('Load example')}</small>
      </Button>

      <ButtonRunStyled disabled={!canRun} color={color} onClick={run} title={title}>
        {t('Run')}
      </ButtonRunStyled>
    </SequenceFilePickerContainer>
  )
}

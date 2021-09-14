import { delay } from 'lodash'
import React, { useCallback, useMemo } from 'react'

import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Button, Col, Container, Row } from 'reactstrap'
import { FileIconFasta } from 'src/components/Main/UploaderFileIcons'
import { AlgorithmInput, AlgorithmParams } from 'src/state/algorithm/algorithm.state'
import styled from 'styled-components'

import type { State } from 'src/state/reducer'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { algorithmRunAsync, removeFasta, setFasta, setIsDirty } from 'src/state/algorithm/algorithm.actions'
import { setShowNewRunPopup } from 'src/state/ui/ui.actions'
import { ColFlexHorizontal, FilePicker } from 'src/components/Main/FilePicker'
import { selectCanRun, selectHasRequiredInputs, selectParams } from 'src/state/algorithm/algorithm.selectors'

const RowButtonsAdvanced = styled(Row)`
  margin: 5px 7px;
`

const ButtonRunStyled = styled(Button)`
  min-height: 50px;
  min-width: 200px;
  margin-left: auto;
`

export function ButtonsAdvanced({ canRun, run }: { canRun: boolean; run(): void }) {
  const { t } = useTranslation()

  const color = useMemo(() => (canRun ? 'success' : 'secondary'), [canRun])
  const title = useMemo(
    () => (canRun ? t('Launch the analysis') : t('Please provide the correct inputs for the algorithm')),
    [canRun, t],
  )

  return (
    <RowButtonsAdvanced noGutters>
      <ColFlexHorizontal>
        <ButtonRunStyled disabled={!canRun} color={color} onClick={run} title={title}>
          {t('Run')}
        </ButtonRunStyled>
      </ColFlexHorizontal>
    </RowButtonsAdvanced>
  )
}

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

  return (
    <Container fluid className="mt-3 px-0">
      <Row noGutters>
        <Col>
          <h3>{t('Provide sequences')}</h3>
        </Col>
      </Row>

      <Row noGutters>
        <Col>
          <FilePicker
            icon={<FileIconFasta />}
            text={t('Sequences')}
            exampleUrl="https://example.com/sequences.fasta"
            pasteInstructions={t('Enter sequence data in FASTA or plain text format')}
            canCollapse={false}
            defaultCollapsed={false}
            input={params.raw.seqData}
            errors={params.errors.seqData}
            onRemove={removeFasta}
            onInput={setFasta}
          />
          <Button color="link" onClick={run}>
            <small>{t('Show example')}</small>
          </Button>
          <ButtonsAdvanced canRun={canRun && hasRequiredInputs} run={run} />
        </Col>
      </Row>
    </Container>
  )
}

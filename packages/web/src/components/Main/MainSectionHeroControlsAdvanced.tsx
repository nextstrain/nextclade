import React, { useCallback, useMemo } from 'react'

import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Button, Col, Row } from 'reactstrap'
import { FilePickerAdvanced } from 'src/components/Main/FilePickerAdvanced'
import styled from 'styled-components'

import type { State } from 'src/state/reducer'
import type { AlgorithmInput, AlgorithmParams } from 'src/state/algorithm/algorithm.state'
import {
  setIsDirty,
  setFasta,
  setGeneMap,
  setPcrPrimers,
  setQcSettings,
  setRootSeq,
  setTree,
  removeFasta,
  removePcrPrimers,
  removeTree,
  removeQcSettings,
  removeGeneMap,
  removeRootSeq,
  algorithmRunAsync,
} from 'src/state/algorithm/algorithm.actions'
import { setShowNewRunPopup } from 'src/state/ui/ui.actions'
import { selectCanExport, selectIsDirty, selectParams } from 'src/state/algorithm/algorithm.selectors'
import { ColFlexHorizontal } from 'src/components/Main/FilePicker'

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

export interface MainSectionHeroControlsAdvancedProps {
  canRun: boolean
  params: AlgorithmParams
  isDirty: boolean

  setIsDirty(isDirty: boolean): void

  setFasta(input: AlgorithmInput): void

  setTree(input: AlgorithmInput): void

  setRootSeq(input: AlgorithmInput): void

  setQcSettings(input: AlgorithmInput): void

  setGeneMap(input: AlgorithmInput): void

  setPcrPrimers(input: AlgorithmInput): void

  removeFasta(_0: unknown): void

  removeTree(_0: unknown): void

  removeRootSeq(_0: unknown): void

  removeQcSettings(_0: unknown): void

  removeGeneMap(_0: unknown): void

  removePcrPrimers(_0: unknown): void

  algorithmRunTrigger(_0: unknown): void

  setShowNewRunPopup(showNewRunPopup: boolean): void
}

const mapStateToProps = (state: State) => ({
  canRun: state.algorithm.params.seqData !== undefined,
  params: selectParams(state),
  canExport: selectCanExport(state),
  isDirty: selectIsDirty(state),
})

const mapDispatchToProps = {
  setIsDirty,
  setFasta: setFasta.trigger,
  setTree: setTree.trigger,
  setRootSeq: setRootSeq.trigger,
  setQcSettings: setQcSettings.trigger,
  setGeneMap: setGeneMap.trigger,
  setPcrPrimers: setPcrPrimers.trigger,
  removeFasta,
  removeTree,
  removeRootSeq,
  removeQcSettings,
  removeGeneMap,
  removePcrPrimers,
  algorithmRunTrigger: algorithmRunAsync.trigger,
  setShowNewRunPopup,
}

export const MainSectionHeroControlsAdvanced = connect(
  mapStateToProps,
  mapDispatchToProps,
)(MainSectionHeroControlsAdvancedDisconnected)

export function MainSectionHeroControlsAdvancedDisconnected({
  canRun,
  params,
  isDirty,
  setIsDirty,
  setFasta,
  setTree,
  setRootSeq,
  setQcSettings,
  setGeneMap,
  setPcrPrimers,
  removeFasta,
  removeTree,
  removeRootSeq,
  removeQcSettings,
  removeGeneMap,
  removePcrPrimers,
  algorithmRunTrigger,
  setShowNewRunPopup,
}: MainSectionHeroControlsAdvancedProps) {
  const run = useCallback(() => {
    setShowNewRunPopup(false)
    algorithmRunTrigger(undefined)
  }, [algorithmRunTrigger, setShowNewRunPopup])

  return (
    <Row noGutters>
      <Col>
        <ButtonsAdvanced canRun={canRun} run={run} />
        <FilePickerAdvanced />
        <ButtonsAdvanced canRun={canRun} run={run} />
      </Col>
    </Row>
  )
}

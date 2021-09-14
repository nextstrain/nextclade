// import { delay } from 'lodash'
// import React, { useCallback, useMemo } from 'react'
//
// import { connect } from 'react-redux'
// import { useTranslation } from 'react-i18next'
// import { Button, Col, Row } from 'reactstrap'
// import { FilePickerAdvanced } from 'src/components/Main/FilePickerAdvanced'
// import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
// import styled from 'styled-components'
//
// import type { State } from 'src/state/reducer'
//
// import { algorithmRunAsync, setIsDirty } from 'src/state/algorithm/algorithm.actions'
// import { setShowNewRunPopup } from 'src/state/ui/ui.actions'
//
// import { ColFlexHorizontal } from 'src/components/Main/FilePicker'
// import { selectCanRun, selectHasRequiredInputs } from 'src/state/algorithm/algorithm.selectors'
//
// const RowButtonsAdvanced = styled(Row)`
//   margin: 5px 7px;
// `
//
// const ButtonRunStyled = styled(Button)`
//   min-height: 50px;
//   min-width: 200px;
//   margin-left: auto;
// `
//
// export function ButtonsAdvanced({ canRun, run }: { canRun: boolean; run(): void }) {
//   const { t } = useTranslation()
//
//   const color = useMemo(() => (canRun ? 'success' : 'secondary'), [canRun])
//   const title = useMemo(
//     () => (canRun ? t('Launch the analysis') : t('Please provide the correct inputs for the algorithm')),
//     [canRun, t],
//   )
//
//   return (
//     <RowButtonsAdvanced noGutters>
//       <ColFlexHorizontal>
//         <ButtonRunStyled disabled={!canRun} color={color} onClick={run} title={title}>
//           {t('Run')}
//         </ButtonRunStyled>
//       </ColFlexHorizontal>
//     </RowButtonsAdvanced>
//   )
// }
//
// export interface MainSectionHeroControlsAdvancedProps {
//   canRun: boolean
//   hasRequiredInputs: boolean
//
//   algorithmRunTrigger(_0: unknown): void
//
//   setShowNewRunPopup(showNewRunPopup: boolean): void
//
//   setIsDirty(isDirty: boolean): void
// }
//
// const mapStateToProps = (state: State) => ({
//   canRun: selectCanRun(state),
//   hasRequiredInputs: selectHasRequiredInputs(state),
// })
//
// const mapDispatchToProps = {
//   algorithmRunTrigger: algorithmRunAsync.trigger,
//   setShowNewRunPopup,
//   setIsDirty,
// }
//
// export const MainSectionHeroControlsAdvanced = connect(
//   mapStateToProps,
//   mapDispatchToProps,
// )(MainSectionHeroControlsAdvancedDisconnected)
//
// export function MainSectionHeroControlsAdvancedDisconnected({
//   canRun,
//   hasRequiredInputs,
//   algorithmRunTrigger,
//   setShowNewRunPopup,
//   setIsDirty,
// }: MainSectionHeroControlsAdvancedProps) {
//   const { t } = useTranslationSafe()
//
//   const run = useCallback(() => {
//     setShowNewRunPopup(false)
//     setIsDirty(true)
//     delay(algorithmRunTrigger, 1000)
//   }, [algorithmRunTrigger, setShowNewRunPopup, setIsDirty])
//
//   return (
//     <Row noGutters>
//       <Col>
//         <Button color="link" onClick={run}>
//           <small>{t('Show example')}</small>
//         </Button>
//         <ButtonsAdvanced canRun={canRun && hasRequiredInputs} run={run} />
//         <FilePickerAdvanced />
//         <ButtonsAdvanced canRun={canRun && hasRequiredInputs} run={run} />
//       </Col>
//     </Row>
//   )
// }

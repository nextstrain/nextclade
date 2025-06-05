// eslint-disable-next-line import/no-anonymous-default-export
export default {}
// import React, { useCallback, useMemo } from 'react'
// import styled from 'styled-components'
// import { Button, Form as FormBase, FormGroup as FormGroupBase, FormGroupProps } from 'reactstrap'
// import { useRecoilValue } from 'recoil'
// import { useRunAnalysis } from 'src/hooks/useRunAnalysis'
// import { useRunSeqAutodetect } from 'src/hooks/useRunSeqAutodetect'
// import { useRecoilToggle } from 'src/hooks/useToggle'
// import { canRunAtom } from 'src/state/results.state'
// import { datasetsCurrentAtom } from 'src/state/dataset.state'
// import { hasInputErrorsAtom } from 'src/state/error.state'
// import { shouldRunAutomaticallyAtom, shouldSuggestDatasetsOnDatasetPageAtom } from 'src/state/settings.state'
// import { Toggle } from 'src/components/Common/Toggle'
// import { FlexLeft, FlexRight } from 'src/components/FilePicker/FilePickerStyles'
// import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
// import { AlgorithmInputDefault } from 'src/io/AlgorithmInput'
// import { hasRequiredInputsAtom, useQuerySeqInputs } from 'src/state/inputs.state'
//
// export function ToggleRunAutomatically({ ...restProps }: FormGroupProps) {
//   const { t } = useTranslationSafe()
//   const { state: shouldRunAutomatically, toggle: toggleRunAutomatically } = useRecoilToggle(shouldRunAutomaticallyAtom)
//   return (
//     <FormGroup inline {...restProps}>
//       <Toggle
//         identifier="toggle-run-automatically"
//         checked={shouldRunAutomatically}
//         onCheckedChanged={toggleRunAutomatically}
//       >
//         <span title={t('Run Nextclade automatically after sequence data is provided')}>{t('Run automatically')}</span>
//       </Toggle>
//     </FormGroup>
//   )
// }
//
// const FormGroup = styled(FormGroupBase)`
//   display: flex;
//   margin: auto 0;
// `
//
// export function RunPanel() {
//   const { t } = useTranslationSafe()
//
//   const datasetCurrent = useRecoilValue(datasetsCurrentAtom)
//   const { addQryInputs } = useQuerySeqInputs()
//
//   const canRun = useRecoilValue(canRunAtom)
//   const shouldRunAutomatically = useRecoilValue(shouldRunAutomaticallyAtom)
//   const shouldSuggestDatasets = useRecoilValue(shouldSuggestDatasetsOnDatasetPageAtom)
//
//   const hasRequiredInputs = useRecoilValue(hasRequiredInputsAtom)
//   const hasInputErrors = useRecoilValue(hasInputErrorsAtom)
//
//   const runAnalysis = useRunAnalysis()
//   const runAutodetect = useRunSeqAutodetect()
//
//   const setExampleSequences = useCallback(() => {
//     if (datasetCurrent) {
//       addQryInputs([new AlgorithmInputDefault(datasetCurrent)])
//       if (shouldSuggestDatasets) {
//         runAutodetect()
//       }
//       if (shouldRunAutomatically) {
//         runAnalysis()
//       }
//     }
//   }, [addQryInputs, datasetCurrent, runAnalysis, runAutodetect, shouldRunAutomatically, shouldSuggestDatasets])
//
//   const { isRunButtonDisabled, runButtonColor, runButtonTooltip } = useMemo(() => {
//     const isRunButtonDisabled = !(canRun && hasRequiredInputs) || hasInputErrors
//     return {
//       isRunButtonDisabled,
//       runButtonColor: isRunButtonDisabled ? 'secondary' : 'success',
//       runButtonTooltip: isRunButtonDisabled
//         ? t('Please provide sequence data for the algorithm')
//         : t('Launch the algorithm!'),
//     }
//   }, [canRun, hasInputErrors, hasRequiredInputs, t])
//
//   return (
//     <Container>
//       <Form>
//         <FlexLeft>
//           <ToggleRunAutomatically />
//         </FlexLeft>
//
//         <FlexRight>
//           <Button color="link" onClick={setExampleSequences} disabled={hasInputErrors || !datasetCurrent}>
//             {t('Load example')}
//           </Button>
//
//           <ButtonRunStyled
//             disabled={isRunButtonDisabled}
//             color={runButtonColor}
//             onClick={runAnalysis}
//             title={runButtonTooltip}
//           >
//             {t('Run')}
//           </ButtonRunStyled>
//         </FlexRight>
//       </Form>
//     </Container>
//   )
// }
//
// const Container = styled.div`
//   flex: 1;
//   margin-top: auto;
//   margin-bottom: 7px;
//   padding: 7px 0;
//   padding-right: 5px;
// `
//
// const Form = styled(FormBase)`
//   display: flex;
//   width: 100%;
//   height: 100%;
//   margin-top: auto;
//   padding: 10px;
//   border: 1px #ccc9 solid;
//   border-radius: 5px;
// `
//
// // const Container = styled.div`
// //   flex: 1;
// //   margin-top: auto;
// //   margin-bottom: 7px;
// //   padding: 10px;
// //   padding-right: 5px;
// //   box-shadow: 0 3px 20px 3px #0003;
// // `
// //
// // const Form = styled(FormBase)`
// //   display: flex;
// //   width: 100%;
// //   height: 100%;
// //   padding: 10px;
// //   border: 1px #ccc9 solid;
// //   border-radius: 5px;
// // `
//
// const ButtonRunStyled = styled(Button)`
//   min-width: 150px;
//   min-height: 45px;
// `

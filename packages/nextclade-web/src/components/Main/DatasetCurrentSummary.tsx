// import React from 'react'
// import { Col, Row } from 'reactstrap'
// import { useRecoilValue, useResetRecoilState } from 'recoil'
// import { MdClear as IconClearBase } from 'react-icons/md'
// import { ButtonTransparent } from 'src/components/Common/ButtonTransparent'
// import { ButtonLoadExample } from 'src/components/Main/ButtonLoadExample'
// import { DatasetCustomizationsIndicatorLink } from 'src/components/Main/DatasetCustomizationIndicator'
// import { LinkOpenTree } from 'src/components/Main/LinkOpenTree'
// import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
// import styled from 'styled-components'
// import { useUpdatedDataset } from 'src/io/fetchDatasets'
// import { datasetsCurrentAtom } from 'src/state/dataset.state'
// import { DatasetCurrentUpdateNotification } from 'src/components/Main/DatasetCurrentUpdateNotification'
// import { DatasetInfo } from 'src/components/Main/DatasetInfo'
//
// export function DatasetCurrentSummary() {
//   // Periodically checks if there's local update for the current dataset
//   useUpdatedDataset()
//
//   const { t } = useTranslationSafe()
//
//   const dataset = useRecoilValue(datasetsCurrentAtom)
//   const resetDataset = useResetRecoilState(datasetsCurrentAtom)
//
//   if (!dataset) {
//     return null
//   }
//
//   return (
//     <Container>
//       <DatasetCurrentUpdateNotification />
//
//       <Row noGutters>
//         <Col>
//           <Row noGutters>
//             <Col className="d-flex">
//               <ButtonClear onClick={resetDataset} title={t('Reset dataset')}>
//                 <IconClear size={20} />
//               </ButtonClear>
//             </Col>
//           </Row>
//
//           <Row noGutters>
//             <Col>
//               <DatasetInfo dataset={dataset} showSuggestions />
//             </Col>
//           </Row>
//
//           <Row noGutters className="d-flex">
//             <Col className="d-flex mr-auto mt-2">
//               <DatasetCustomizationWrapper>
//                 <DatasetCustomizationsIndicatorLink />
//               </DatasetCustomizationWrapper>
//             </Col>
//           </Row>
//           <Row noGutters className="d-flex w-100">
//             <Col className="d-flex">
//               <div className="d-flex ml-auto">
//                 <LinkOpenTree className="my-auto" dataset={dataset} />
//                 <ButtonLoadExample dataset={dataset} />
//               </div>
//             </Col>
//           </Row>
//         </Col>
//       </Row>
//     </Container>
//   )
// }
//
// const Container = styled.div`
//   display: flex;
//   flex-direction: column;
//   padding: 12px;
//   border: 1px #ccc9 solid;
//   border-radius: 5px;
//   min-height: 200px;
// `
//
// const ButtonClear = styled(ButtonTransparent)`
//   display: inline;
//   margin-left: auto;
//   height: 20px;
//   width: 20px;
// `
//
// const IconClear = styled(IconClearBase)`
//   * {
//     color: ${(props) => props.theme.gray500};
//   }
// `
//
// const DatasetCustomizationWrapper = styled.div`
//   margin-left: 90px;
// `

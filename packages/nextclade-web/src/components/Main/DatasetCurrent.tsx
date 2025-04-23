import React from 'react'
import { UlGeneric } from 'src/components/Common/List'
import { DatasetInfoCompact } from 'src/components/Main/DatasetInfoCompact'
import { isAutodetectRunningAtom, topSuggestedDatasetsAtom } from 'src/state/autodetect.state'
import styled from 'styled-components'

import { useRecoilValue } from 'recoil'

// import { Col, Row, Container as ContainerBase } from 'reactstrap'
// import type { Dataset } from 'src/types'
// import { ButtonLoadExample } from 'src/components/Main/ButtonLoadExample'
// import { ButtonRun } from 'src/components/Main/ButtonRun'
// import { LinkOpenTree } from 'src/components/Main/LinkOpenTree'
// import { useRunAnalysis } from 'src/hooks/useRunAnalysis'
// import { useUpdatedDataset } from 'src/io/fetchDatasets'
// import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
// import { DatasetInfo } from 'src/components/Main/DatasetInfo'
// import { DatasetContentSection } from 'src/components/Main/DatasetContentSection'
// import { DatasetCurrentUpdateNotification } from 'src/components/Main/DatasetCurrentUpdateNotification'
//
// const CurrentDatasetInfoContainer = styled(ContainerBase)`
//   display: flex;
//   flex-direction: column;
//   width: 100%;
//   height: 100%;
// `
//
// const CurrentDatasetInfoHeader = styled.section`
//   display: flex;
//   margin-bottom: 0.5rem;
//   margin-top: 7px;
// `
//
// const DatasetInfoH4 = styled.h4`
//   flex: 1;
//   margin: auto 0;
//   margin-top: 12px;
// `
//
// const CurrentDatasetInfoBody = styled.section`
//   display: flex;
//   flex-direction: column;
//   padding: 12px;
//   border: 1px #ccc9 solid;
//   border-radius: 5px;
// `
//
// const Container = styled.div`
//   display: flex;
//   flex: 1;
//   flex-direction: column;
//   overflow: hidden;
// `
//
// const Header = styled.div`
//   flex: 0;
// `
//
// const Main = styled.div`
//   display: flex;
//   flex: 1;
//   flex-direction: column;
//   overflow: auto;
//   width: 100%;
//
//   margin: 0.5rem 0;
// `

// export function DatasetCurrent({ dataset }: { dataset: Dataset }) {
//   // Periodically checks if there's local update for the current dataset
//   useUpdatedDataset()
//
//   const { t } = useTranslationSafe()
//
//   const run = useRunAnalysis({ isSingle: true })
//
//   if (!dataset) {
//     return null
//   }
//
//   return (
//     <CurrentDatasetInfoContainer>
//       <CurrentDatasetInfoHeader>
//         <DatasetInfoH4>{t('Selected pathogen')}</DatasetInfoH4>
//         <ButtonRun onClick={run} />
//       </CurrentDatasetInfoHeader>
//       <Container>
//         <Header>
//           <CurrentDatasetInfoBody>
//             <DatasetCurrentUpdateNotification dataset={dataset} />
//
//             <Row noGutters className="w-100">
//               <Col className="d-flex">
//                 <DatasetInfo dataset={dataset} />
//               </Col>
//             </Row>
//
//             <Row noGutters className="d-flex w-100">
//               <Col className="d-flex">
//                 <div className="d-flex ml-auto">
//                   <LinkOpenTree className="my-auto" dataset={dataset} />
//                   <ButtonLoadExample dataset={dataset} />
//                 </div>
//               </Col>
//             </Row>
//           </CurrentDatasetInfoBody>
//         </Header>
//
//         <Main>
//           <DatasetContentSection dataset={dataset} />
//         </Main>
//       </Container>
//     </CurrentDatasetInfoContainer>
//   )
// }

export function DatasetCurrentList() {
  const datasets = useRecoilValue(topSuggestedDatasetsAtom)
  const isRunning = useRecoilValue(isAutodetectRunningAtom)
  return (
    <Ul isBusy={isRunning}>
      {datasets?.map((dataset) => (
        <Li key={dataset.path}>
          <DatasetInfoCompact dataset={dataset} />
        </Li>
      ))}
    </Ul>
  )
}

const Ul = styled(UlGeneric)<{ isBusy: boolean }>`
  flex: 1;
  overflow: auto;
  max-height: 320px;
  opacity: ${({ isBusy }) => (isBusy ? 0.5 : 1)};
`

const Li = styled.li`
  margin: 5px 0;

  text-overflow: ellipsis;
  white-space: nowrap;

  border-bottom: 1px solid #ccc !important;

  &:last-child {
    border-bottom: none !important;
  }
`

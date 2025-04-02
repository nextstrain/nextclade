import React from 'react'
// import React, { useEffect, useMemo, useState } from 'react'
// import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
// import { Container as ContainerBase } from 'reactstrap'
// import { SelectDatasetHelp } from 'src/components/Help/SelectDatasetHelp'
// import { DatasetSelectorList } from 'src/components/Main/DatasetSelectorList'
// import { SuggestionAlertDatasetPage } from 'src/components/Main/SuggestionAlertDatasetPage'
// import { SuggestionPanel } from 'src/components/Main/SuggestionPanel'
// import { useDatasetSuggestionResults } from 'src/hooks/useRunSeqAutodetect'
// import { AutodetectRunState, autodetectRunStateAtom } from 'src/state/autodetect.state'
// import { datasetsAtom, datasetsCurrentAtom } from 'src/state/dataset.state'
// import styled from 'styled-components'
// import type { Dataset } from 'src/types'
// import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
// import { SearchBox } from 'src/components/Common/SearchBox'

import { useRecoilValue } from 'recoil'
import { datasetsAtom } from 'src/state/dataset.state'

export function DatasetAutosuggestionResultsList() {
  const datasets = useRecoilValue(datasetsAtom)
  // const setDatasetsCurrent = useSetRecoilState(datasetsCurrentAtom)
  return <div>{JSON.stringify(datasets, null, 2)}</div>
}

// export function DatasetAutosuggestionResultsList() {
//   const [datasetsCurrent, setDatasetsCurrent] = useRecoilState(datasetsCurrentAtom)
//
//   const [autodetectRunState, setAutodetectRunState] = useRecoilState(autodetectRunStateAtom)
//   const { datasetsActive, datasetsInactive, topSuggestion, showSuggestions } = useDatasetSuggestionResults()
//   useEffect(() => {
//     if (autodetectRunState === AutodetectRunState.Done) {
//       setDatasetsCurrent(topSuggestion ? [topSuggestion] : [])
//     }
//   }, [autodetectRunState, setDatasetsCurrent, setAutodetectRunState, topSuggestion])
//
//   const datasetsHighlighted = useMemo(() => datasetsCurrent ?? [], [datasetsCurrent])
//
//   return (
//     <DatasetSelectorImpl
//       datasetsActive={datasetsActive}
//       datasetsInactive={datasetsInactive}
//       datasetsHighlighted={datasetsHighlighted}
//       onDatasetsHighlighted={setDatasetsCurrent}
//       showSuggestions={showSuggestions}
//     />
//   )
// }
//
// export interface DatasetSelectorImplProps {
//   datasetsActive: Dataset[]
//   datasetsInactive?: Dataset[]
//   datasetsHighlighted: Dataset[]
//   onDatasetsHighlighted(dataset: Dataset[]): void
//   showSuggestions?: boolean
// }
//
// export function DatasetSelectorImpl({
//   datasetsActive,
//   datasetsInactive,
//   datasetsHighlighted,
//   onDatasetsHighlighted,
//   showSuggestions,
// }: DatasetSelectorImplProps) {
//   const { t } = useTranslationSafe()
//   const [searchTerm, setSearchTerm] = useState('')
//   return (
//     <Container>
//       <Header>
//         <Title>
//           <H4Inline>{t('Select reference dataset')}</H4Inline>
//           <SelectDatasetHelp />
//         </Title>
//
//         <SearchBox searchTitle={t('Search datasets')} searchTerm={searchTerm} onSearchTermChange={setSearchTerm} />
//       </Header>
//
//       <Header>
//         <div className="w-100 d-flex flex-column">
//           <SuggestionPanel />
//           <SuggestionAlertDatasetPage className="mt-1" />
//         </div>
//       </Header>
//
//       <Main>
//         <DatasetSelectorList
//           datasetsActive={datasetsActive}
//           datasetsInactive={datasetsInactive}
//           datasetsHighlighted={datasetsHighlighted}
//           onDatasetsHighlighted={onDatasetsHighlighted}
//           searchTerm={searchTerm}
//           showSuggestions={showSuggestions}
//         />
//       </Main>
//     </Container>
//   )
// }
//
// const Container = styled(ContainerBase)`
//   display: flex;
//   flex: 1;
//   flex-direction: column;
//   overflow: hidden;
//   margin: 0 auto;
//   max-width: 800px;
// `
//
// const Header = styled.div`
//   display: flex;
//   flex: 0;
//   padding-left: 8px;
//   margin-top: 10px;
//   margin-bottom: 3px;
// `
//
// const Main = styled.div`
//   display: flex;
//   flex: 1;
//   flex-direction: column;
//   overflow: hidden;
// `
//
// const Title = styled.div`
//   display: flex;
//   flex: 1;
// `
//
// const H4Inline = styled.h4`
//   display: inline-flex;
//   margin: auto 0;
// `

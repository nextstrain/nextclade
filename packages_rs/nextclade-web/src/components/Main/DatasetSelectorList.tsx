import { get, isNil, sortBy } from 'lodash'
import { lighten } from 'polished'
import React, { forwardRef, useCallback, useEffect, useMemo, useRef } from 'react'
import { Button } from 'reactstrap'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { ListGenericCss } from 'src/components/Common/List'
import { DatasetInfo } from 'src/components/Main/DatasetInfo'
import { search } from 'src/helpers/search'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { useRunAnalysis } from 'src/hooks/useRunAnalysis'
import { useRunSeqAutodetect } from 'src/hooks/useRunSeqAutodetect'
import { AlgorithmInputDefault } from 'src/io/AlgorithmInput'
import {
  autodetectResultsAtom,
  AutodetectRunState,
  autodetectRunStateAtom,
  groupByDatasets,
} from 'src/state/autodetect.state'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { hasInputErrorsAtom } from 'src/state/error.state'
import { hasRequiredInputsAtom, useQuerySeqInputs } from 'src/state/inputs.state'
import { canRunAtom } from 'src/state/results.state'
import { shouldRunAutomaticallyAtom, shouldSuggestDatasetsAtom } from 'src/state/settings.state'
import type { Dataset } from 'src/types'
import { areDatasetsEqual } from 'src/types'
import styled from 'styled-components'

export interface DatasetSelectorListProps {
  datasets: Dataset[]
  searchTerm: string
  datasetHighlighted?: Dataset

  onDatasetHighlighted(dataset?: Dataset): void
}

export function DatasetSelectorList({
  datasets,
  searchTerm,
  datasetHighlighted,
  onDatasetHighlighted,
}: DatasetSelectorListProps) {
  const onItemClick = useCallback(
    (_dataset: Dataset) => () => {
      /* onDatasetHighlighted(dataset) */
    },
    [],
  )

  const autodetectResults = useRecoilValue(autodetectResultsAtom)
  const [autodetectRunState, setAutodetectRunState] = useRecoilState(autodetectRunStateAtom)

  const autodetectResult = useMemo(() => {
    if (isNil(autodetectResults) || autodetectResults.length === 0) {
      return { itemsStartWith: [], itemsInclude: datasets, itemsNotInclude: [] }
    }

    const recordsByDataset = groupByDatasets(autodetectResults)

    let itemsInclude = datasets.filter((candidate) =>
      Object.entries(recordsByDataset).some(([dataset, _]) => dataset === candidate.path),
    )

    itemsInclude = sortBy(itemsInclude, (dataset) => -get(recordsByDataset, dataset.path, []).length)

    const itemsNotInclude = datasets.filter((candidate) => !itemsInclude.map((it) => it.path).includes(candidate.path))

    return { itemsStartWith: [], itemsInclude, itemsNotInclude }
  }, [autodetectResults, datasets])

  const searchResult = useMemo(() => {
    if (searchTerm.trim().length === 0) {
      return autodetectResult
    }

    return search(
      [...autodetectResult.itemsStartWith, ...autodetectResult.itemsInclude, ...autodetectResult.itemsNotInclude],
      searchTerm,
      (dataset) => [
        dataset.attributes.name.value,
        dataset.attributes.name.valueFriendly ?? '',
        dataset.attributes.reference.value,
        dataset.attributes.reference.valueFriendly ?? '',
      ],
    )
  }, [autodetectResult, searchTerm])

  const { itemsStartWith, itemsInclude, itemsNotInclude } = searchResult

  const itemsRef = useRef<Map<string, HTMLLIElement>>(new Map())

  useEffect(() => {
    const topSuggestion = autodetectResult.itemsInclude[0]
    if (autodetectRunState === AutodetectRunState.Done) {
      onDatasetHighlighted(topSuggestion)
    }
  }, [autodetectRunState, autodetectResult.itemsInclude, onDatasetHighlighted, setAutodetectRunState])

  const ulRef = useRef<HTMLUListElement>(null)
  useEffect(() => ulRef.current?.scrollTo({ top: 0, left: 0, behavior: 'smooth' }), [searchTerm])

  const listItems = useMemo(() => {
    return (
      <>
        {[itemsStartWith, itemsInclude].map((datasets) =>
          datasets.map((dataset) => (
            <DatasetSelectorListItem
              key={dataset.path}
              ref={nodeRefSetOrDelete(itemsRef.current, dataset.path)}
              dataset={dataset}
              onClick={onItemClick(dataset)}
              isCurrent={areDatasetsEqual(dataset, datasetHighlighted)}
            />
          )),
        )}

        {[itemsNotInclude].map((datasets) =>
          datasets.map((dataset) => (
            <DatasetSelectorListItem
              key={dataset.path}
              ref={nodeRefSetOrDelete(itemsRef.current, dataset.path)}
              dataset={dataset}
              onClick={onItemClick(dataset)}
              isCurrent={areDatasetsEqual(dataset, datasetHighlighted)}
              isDimmed
            />
          )),
        )}
      </>
    )
  }, [datasetHighlighted, itemsInclude, itemsNotInclude, itemsStartWith, onItemClick])

  return <Ul ref={ulRef}>{listItems}</Ul>
}

function nodeRefSetOrDelete<T extends HTMLElement>(map: Map<string, T>, key: string) {
  return function nodeRefSetOrDeleteImpl(node: T) {
    if (node) {
      map.set(key, node)
    } else {
      map.delete(key)
    }
  }
}

export const Ul = styled.ul`
  ${ListGenericCss};
  flex: 1;
  overflow: auto;
  border-radius: 0 !important;
`

export const Li = styled.li<{ $active?: boolean; $isDimmed?: boolean }>`
  position: relative;

  opacity: ${(props) => props.$isDimmed && 0.4};
  background-color: transparent;

  margin: 3px 3px !important;
  padding: 0 !important;
  border-radius: 5px !important;

  ${(props) =>
    props.$active &&
    `
    color: ${props.theme.white};
    background-color: ${lighten(0.033)(props.theme.primary)};
    box-shadow: -3px 3px 12px 3px #0005;
    opacity: ${props.$isDimmed && 0.66};
   `};
`

interface DatasetSelectorListItemProps {
  dataset: Dataset
  isCurrent?: boolean
  isDimmed?: boolean
  onClick?: () => void
}

const DatasetSelectorListItem = forwardRef<HTMLLIElement, DatasetSelectorListItemProps>(
  function DatasetSelectorListItemWithRef({ dataset, isDimmed, onClick }, ref) {
    const { t } = useTranslationSafe()

    const setDatasetCurrent = useSetRecoilState(datasetCurrentAtom)
    const shouldRunAutomatically = useRecoilValue(shouldRunAutomaticallyAtom)
    const shouldSuggestDatasets = useRecoilValue(shouldSuggestDatasetsAtom)
    const { addQryInputs } = useQuerySeqInputs()
    const canRun = useRecoilValue(canRunAtom)
    const hasRequiredInputs = useRecoilValue(hasRequiredInputsAtom)
    const hasInputErrors = useRecoilValue(hasInputErrorsAtom)

    const runAnalysis = useRunAnalysis()
    const runSuggestions = useRunSeqAutodetect()
    const run = useCallback(() => {
      setDatasetCurrent(dataset)
      runAnalysis()
    }, [dataset, runAnalysis, setDatasetCurrent])

    const { isRunButtonDisabled, runButtonColor, runButtonTooltip } = useMemo(() => {
      const isRunButtonDisabled = !(canRun && hasRequiredInputs) || hasInputErrors
      return {
        isRunButtonDisabled,
        runButtonColor: isRunButtonDisabled ? 'secondary' : 'success',
        runButtonTooltip: isRunButtonDisabled
          ? t('Please provide sequence data for the algorithm')
          : t('Launch the algorithm!'),
      }
    }, [canRun, hasInputErrors, hasRequiredInputs, t])

    const setExampleSequences = useCallback(() => {
      addQryInputs([new AlgorithmInputDefault(dataset)])
      if (shouldSuggestDatasets) {
        runSuggestions()
      }
      if (shouldRunAutomatically) {
        runAnalysis()
      }
    }, [addQryInputs, dataset, runAnalysis, runSuggestions, shouldRunAutomatically, shouldSuggestDatasets])

    return (
      <Li ref={ref} $isDimmed={isDimmed} onClick={onClick}>
        <DatasetInfo dataset={dataset} />

        <ButtonLoadExample color="link" onClick={setExampleSequences}>
          {t('Load example')}
        </ButtonLoadExample>

        <ButtonRunStyled disabled={isRunButtonDisabled} color={runButtonColor} onClick={run} title={runButtonTooltip}>
          {t('Run')}
        </ButtonRunStyled>
      </Li>
    )
  },
)

const ButtonRunStyled = styled(Button)`
  position: absolute;
  bottom: 10px;
  right: 10px;
  min-width: 120px;
  min-height: 30px;
`

const ButtonLoadExample = styled(Button)`
  position: absolute;
  bottom: 45px;
  right: 2px;
  min-width: 120px;
  min-height: 30px;
`

export const FlexRight = styled.div`
  position: absolute;
`

export const FlexLeft = styled.div`
  margin-right: auto;
`

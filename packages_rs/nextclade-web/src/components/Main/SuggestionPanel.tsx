import { isNil } from 'lodash'
import React, { useMemo } from 'react'
import { Button, Form as FormBase, FormGroup as FormGroupBase, Spinner, UncontrolledAlert } from 'reactstrap'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { Toggle } from 'src/components/Common/Toggle'
import { unreachable } from 'src/helpers/unreachable'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { useRunSeqAutodetect } from 'src/hooks/useRunSeqAutodetect'
import { useResetSuggestions } from 'src/hooks/useResetSuggestions'
import { useRecoilToggle } from 'src/hooks/useToggle'
import {
  autodetectResultsAtom,
  AutodetectRunState,
  autodetectRunStateAtom,
  groupByDatasets,
  hasAutodetectResultsAtom,
  numberAutodetectResultsAtom,
} from 'src/state/autodetect.state'
import { datasetsAtom, minimizerIndexVersionAtom } from 'src/state/dataset.state'
import { hasRequiredInputsAtom } from 'src/state/inputs.state'
import { shouldSuggestDatasetsOnDatasetPageAtom } from 'src/state/settings.state'

export function SuggestionPanel() {
  const minimizerIndexVersion = useRecoilValue(minimizerIndexVersionAtom)
  const autodetectRunState = useRecoilValue(autodetectRunStateAtom)

  if (isNil(minimizerIndexVersion)) {
    return null
  }

  switch (autodetectRunState) {
    case AutodetectRunState.Idle:
      return <SuggestionPanelIdle />
    case AutodetectRunState.Started:
      return <SuggestionPanelStarted />
    case AutodetectRunState.Done:
      return <SuggestionPanelDone />
    case AutodetectRunState.Failed:
      return <SuggestionPanelFailed />
    default: {
      return unreachable(autodetectRunState)
    }
  }
}

export function ButtonSuggest() {
  const { t } = useTranslationSafe()
  const hasRequiredInputs = useRecoilValue(hasRequiredInputsAtom)
  const runSuggest = useRunSeqAutodetect()
  const hasAutodetectResults = useRecoilValue(hasAutodetectResultsAtom)

  const { text, canRun, color, title } = useMemo(() => {
    const canRun = hasRequiredInputs
    return {
      text: hasAutodetectResults ? t('Re-suggest') : t('Suggest'),
      canRun,
      color: !canRun ? 'secondary' : 'primary',
      title: !canRun
        ? t('Please provide sequence data for the algorithm')
        : hasAutodetectResults
        ? t('Re-launch suggestions engine!')
        : t('Launch suggestions engine!'),
    }
  }, [hasAutodetectResults, hasRequiredInputs, t])

  return (
    <ButtonRunStyled onClick={runSuggest} disabled={!canRun} color={color} title={title}>
      {text}
    </ButtonRunStyled>
  )
}

export function ButtonSuggestionsReset() {
  const { t } = useTranslationSafe()
  const resetAutodetectResults = useResetSuggestions()
  const hasAutodetectResults = useRecoilValue(hasAutodetectResultsAtom)

  return (
    <ButtonResetStyled color="link" onClick={resetAutodetectResults} disabled={!hasAutodetectResults}>
      {t('Reset')}
    </ButtonResetStyled>
  )
}

export function SuggestionPanelIdle() {
  return (
    <Container>
      <Form>
        <FlexLeft>
          <Alert color="none" fade={false} className="d-flex" closeClassName="d-none">
            <div>
              <p className="m-0">
                <AutosuggestionToggle />
              </p>
              <p className="m-0">{'\u00A0'}</p>
            </div>
          </Alert>
        </FlexLeft>
        <FlexRight>
          <ButtonSuggest />
        </FlexRight>
      </Form>
    </Container>
  )
}

export function SuggestionPanelStarted() {
  const { t } = useTranslationSafe()
  const numberAutodetectResults = useRecoilValue(numberAutodetectResultsAtom)

  return (
    <Container>
      <Form>
        <Alert color="none" fade={false} className="d-flex" closeClassName="d-none">
          <Spinner className="my-auto mr-3" />
          <div>
            <p className="m-0">{t('Searching matching datasets')}</p>
            <p className="m-0">{t(`${numberAutodetectResults} sequences`)}</p>
          </div>
        </Alert>
      </Form>
    </Container>
  )
}

export function SuggestionPanelDone() {
  const { t } = useTranslationSafe()
  const { datasets } = useRecoilValue(datasetsAtom)
  const autodetectResults = useRecoilValue(autodetectResultsAtom)
  const numSuggestedDatasets = useMemo(() => {
    if (!autodetectResults) {
      return 0
    }
    const recordsByDataset = groupByDatasets(autodetectResults)
    return datasets.filter((candidate) =>
      Object.entries(recordsByDataset).some(([dataset, _]) => dataset === candidate.path),
    ).length
  }, [autodetectResults, datasets])

  const text = useMemo(() => {
    if (numSuggestedDatasets === 0) {
      return (
        <Alert color="warning" fade={false} closeClassName="d-none">
          <p className="my-0">{t('No matching datasets found.')}</p>
          <p className="my-0">{t('Consider contributing a new dataset.')}</p>
        </Alert>
      )
    }
    return (
      <Alert color="none" fade={false} closeClassName="d-none">
        <p className="my-0">{t(`${numSuggestedDatasets} dataset(s) appear to match your data.`)}</p>
        <p className="my-0">{t('Select the one to use.')}</p>
      </Alert>
    )
  }, [numSuggestedDatasets, t])

  return (
    <Container>
      <Form>
        <FlexLeft>{text}</FlexLeft>
        <FlexRight>
          <ButtonSuggestionsReset />
          <ButtonSuggest />
        </FlexRight>
      </Form>
    </Container>
  )
}

export function SuggestionPanelFailed() {
  const { t } = useTranslationSafe()
  return (
    <Container>
      <Form>
        <FlexLeft>
          <Alert color="danger" fade={false} closeClassName="d-none">
            <p className="m-0">{t('Suggestion engine failed.')}</p>
            <p className="m-0">{t('Please report this issue.')}</p>
          </Alert>
        </FlexLeft>
        <FlexRight>
          <ButtonSuggestionsReset />
          <ButtonSuggest />
        </FlexRight>
      </Form>
    </Container>
  )
}

const Container = styled.div`
  flex: 1;
`

const Form = styled(FormBase)`
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 45px;
  padding: 10px;
  border: 1px #ccc9 solid;
  border-radius: 5px;
`

export const FlexLeft = styled.div`
  display: flex;
  flex: 1;
  margin-right: auto;
  vertical-align: middle;
`

export const FlexRight = styled.div`
  margin-left: auto;
`

const Alert = styled(UncontrolledAlert)`
  margin: 0;
  width: 100%;
  padding: 0.5rem 1rem;
`

const ButtonRunStyled = styled(Button)`
  width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
`

const ButtonResetStyled = styled(Button)`
  margin: 0 1rem;
  max-width: 100px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
`

export function AutosuggestionToggle({ ...restProps }) {
  const { t } = useTranslationSafe()
  const { state: shouldSuggestDatasets, toggle: toggleSuggestDatasets } = useRecoilToggle(
    shouldSuggestDatasetsOnDatasetPageAtom,
  )
  return (
    <FormGroup {...restProps}>
      <Toggle
        identifier="toggle-suggest-datasets"
        checked={shouldSuggestDatasets}
        onCheckedChanged={toggleSuggestDatasets}
      >
        <span
          title={t(
            'Enable suggestion of best matching pathogen datasets. Please add sequence data to launch suggestion engine.',
          )}
        >
          {t('Suggest automatically')}
        </span>
      </Toggle>
    </FormGroup>
  )
}

const FormGroup = styled(FormGroupBase)`
  margin: auto 0;
`

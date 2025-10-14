import { isNil } from 'lodash'
import React, { useMemo } from 'react'
import { Button, Form as FormBase, FormGroup as FormGroupBase, Spinner } from 'reactstrap'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { Toggle } from 'src/components/Common/Toggle'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { useResetSuggestionsAndCurrentDataset } from 'src/hooks/useResetSuggestions'
import { useRunSeqAutodetect } from 'src/hooks/useRunSeqAutodetect'
import { useRecoilToggle } from 'src/hooks/useToggle'
import {
  AutodetectRunState,
  autodetectRunStateAtom,
  hasAutodetectResultsAtom,
  hasTopSuggestedDatasetsAtom,
  isAutodetectRunningAtom,
} from 'src/state/autodetect.state'
import { minimizerIndexVersionAtom } from 'src/state/dataset.state'
import { hasRequiredInputsAtom } from 'src/state/inputs.state'
import { shouldSuggestDatasetsOnDatasetPageAtom } from 'src/state/settings.state'

export function SuggestionPanel() {
  const minimizerIndexVersion = useRecoilValue(minimizerIndexVersionAtom)

  if (isNil(minimizerIndexVersion)) {
    return null
  }

  return (
    <Container>
      <Form>
        <FlexLeft>
          <AutosuggestionToggle />
        </FlexLeft>
        <FlexRight>
          <ButtonSuggestionsReset />
          <ButtonSuggest />
        </FlexRight>
      </Form>
    </Container>
  )
}

export function ButtonSuggest() {
  const { t } = useTranslationSafe()
  const hasRequiredInputs = useRecoilValue(hasRequiredInputsAtom)
  const runSuggest = useRunSeqAutodetect({ shouldSetCurrentDataset: true })
  const hasAutodetectResults = useRecoilValue(hasAutodetectResultsAtom)
  const autodetectRunState = useRecoilValue(autodetectRunStateAtom)

  const { text, disabled, color, title } = useMemo(() => {
    const canRun = hasRequiredInputs
    const isRunning = autodetectRunState === AutodetectRunState.Started
    return {
      text: isRunning ? (
        <span>
          <Spinner size="sm" />
          <span className="ml-2">{t('Suggesting')}</span>
        </span>
      ) : hasAutodetectResults ? (
        t('Re-suggest')
      ) : (
        t('Suggest')
      ),
      disabled: !canRun || isRunning,
      color: !canRun ? 'secondary' : 'primary',
      title: isRunning
        ? t('Running')
        : !canRun
        ? t('Please provide sequence data for the algorithm')
        : hasAutodetectResults
        ? t('Re-launch suggestions engine!')
        : t('Launch suggestions engine!'),
    }
  }, [autodetectRunState, hasAutodetectResults, hasRequiredInputs, t])

  return (
    <ButtonRunStyled onClick={runSuggest} disabled={disabled} color={color} title={title}>
      {text}
    </ButtonRunStyled>
  )
}

export function ButtonSuggestionsReset() {
  const { t } = useTranslationSafe()
  const resetAutodetectResults = useResetSuggestionsAndCurrentDataset()
  const hasAutodetectResults = useRecoilValue(hasAutodetectResultsAtom)
  const hasTopSuggestedDatasets = useRecoilValue(hasTopSuggestedDatasetsAtom)
  const isAutodetectRunning = useRecoilValue(isAutodetectRunningAtom)

  const disabled = isAutodetectRunning || !(hasAutodetectResults && hasTopSuggestedDatasets)

  return (
    <ButtonResetStyled color="link" onClick={resetAutodetectResults} disabled={disabled}>
      {t('Reset')}
    </ButtonResetStyled>
  )
}

const Container = styled.div`
  flex: 1;
`

const Form = styled(FormBase)`
  display: flex;
  width: 100%;
  min-height: 38px;
  padding: 0 5px;
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

const ButtonRunStyled = styled(Button)`
  width: 140px;
  height: 38px;
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
          className="my-auto"
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

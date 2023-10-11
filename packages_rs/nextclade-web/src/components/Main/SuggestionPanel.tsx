import { isNil } from 'lodash'
import React, { useMemo } from 'react'
import { useRunSeqAutodetect } from 'src/hooks/useRunSeqAutodetect'
import { hasRequiredInputsAtom } from 'src/state/inputs.state'
import styled from 'styled-components'
import { Button, Form as FormBase, FormGroup } from 'reactstrap'
import { useRecoilValue, useResetRecoilState } from 'recoil'
import { Toggle } from 'src/components/Common/Toggle'
import { FlexLeft, FlexRight } from 'src/components/FilePicker/FilePickerStyles'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { useRecoilToggle } from 'src/hooks/useToggle'
import { autodetectResultsAtom, hasAutodetectResultsAtom } from 'src/state/autodetect.state'
import { minimizerIndexVersionAtom } from 'src/state/dataset.state'
import { shouldSuggestDatasetsAtom } from 'src/state/settings.state'

export function SuggestionPanel() {
  const { t } = useTranslationSafe()
  const minimizerIndexVersion = useRecoilValue(minimizerIndexVersionAtom)
  const resetAutodetectResults = useResetRecoilState(autodetectResultsAtom)
  const hasAutodetectResults = useRecoilValue(hasAutodetectResultsAtom)
  const hasRequiredInputs = useRecoilValue(hasRequiredInputsAtom)
  const runSuggest = useRunSeqAutodetect()

  const { canRun, runButtonColor, runButtonTooltip } = useMemo(() => {
    const canRun = hasRequiredInputs
    return {
      canRun,
      runButtonColor: !canRun ? 'secondary' : 'success',
      runButtonTooltip: !canRun ? t('Please provide sequence data for the algorithm') : t('Launch suggestions engine!'),
    }
  }, [hasRequiredInputs, t])

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
          <Button color="link" onClick={resetAutodetectResults} disabled={!hasAutodetectResults}>
            {t('Reset suggestions')}
          </Button>

          <ButtonRunStyled onClick={runSuggest} disabled={!canRun} color={runButtonColor} title={runButtonTooltip}>
            {t('Suggest')}
          </ButtonRunStyled>
        </FlexRight>
      </Form>
    </Container>
  )
}

const Container = styled.div`
  flex: 1;
  margin-top: auto;
  margin-bottom: 7px;
  padding: 7px 0;
  padding-left: 5px;
`

const Form = styled(FormBase)`
  display: flex;
  width: 100%;
  height: 100%;
  margin-top: auto;
  padding: 10px;
  border: 1px #ccc9 solid;
  border-radius: 5px;
`

const ButtonRunStyled = styled(Button)`
  min-width: 150px;
  min-height: 45px;
`

function AutosuggestionToggle() {
  const { t } = useTranslationSafe()
  const { state: shouldSuggestDatasets, toggle: toggleSuggestDatasets } = useRecoilToggle(shouldSuggestDatasetsAtom)
  return (
    <FormGroup>
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

import React, { useCallback } from 'react'
import {
  FormGroup as ReactstrapFormGroup,
  Input as ReactstrapInput,
  Label as ReactstrapLabel,
  FormGroupProps as ReactstrapFormGroupProps,
  InputProps as ReactstrapInputProps,
  LabelProps as ReactstrapLabelProps,
  Card as ReactstrapCard,
  CardBody as ReactstrapCardBody,
  CardHeader as ReactstrapCardHeader,
  CardBodyProps as ReactstrapCardBodyProps,
  CardHeaderProps as ReactstrapCardHeaderProps,
  CardProps as ReactstrapCardProps,
  Collapse,
  Form,
  Input,
} from 'reactstrap'
import styled from 'styled-components'
import { useRecoilValue } from 'recoil'

import {
  aaFilterAtom,
  cladesFilterAtom,
  mutationsFilterAtom,
  seqNamesFilterAtom,
  showBadFilterAtom,
  showErrorsFilterAtom,
  showGoodFilterAtom,
  showMediocreFilterAtom,
} from 'src/state/resultFilters.state'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { isResultsFilterPanelCollapsedAtom } from 'src/state/settings.state'
import { useRecoilStateDeferred } from 'src/hooks/useRecoilStateDeferred'

export const Card = styled(ReactstrapCard)<ReactstrapCardProps>`
  box-shadow: 1px 1px 3px 2px rgba(128, 128, 128, 0.5);
`

export const CardHeader = styled(ReactstrapCardHeader)<ReactstrapCardHeaderProps>`
  background-color: #495057;
  color: #fff;
  height: 36px;
  font-size: 1rem;
  line-height: 1rem;
`

export const CardBody = styled(ReactstrapCardBody)<ReactstrapCardBodyProps>`
  background-color: #495057;
  display: flex;
  width: 100%;
  padding: 3px 3px;
`

export const FormGroup = styled(ReactstrapFormGroup)<ReactstrapFormGroupProps>`
  display: flex;
  flex-direction: column;
  background-color: transparent;
  flex-grow: 1;
  flex-basis: 22%;
`

export const FormSection = styled(Form)<ReactstrapFormGroupProps>`
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  padding: 5px 10px;
  margin: 5px;
  border-radius: 3px;
`

export const Label = styled(ReactstrapLabel)<ReactstrapLabelProps>``

export const InputText = styled(ReactstrapInput)<ReactstrapInputProps>`
  padding: 5px 7px;
  font-size: 0.75rem;

  ::placeholder {
    color: rgba(168, 182, 200, 0.67);
  }

  &:hover::placeholder {
    color: rgba(168, 182, 200, 1);
  }
`

export const InputCheckbox = styled(ReactstrapInput)<ReactstrapInputProps>``

export function ResultsFilter() {
  const { t } = useTranslationSafe()

  const isResultsFilterPanelCollapsed = useRecoilValue(isResultsFilterPanelCollapsedAtom)

  // TODO: we could use a map (object) and refer to filters by name,
  // in order to reduce code duplication in the state, callbacks and components being rendered
  const [seqNamesFilter, setSeqNamesFilter] = useRecoilStateDeferred(seqNamesFilterAtom)
  const [mutationsFilter, setMutationsFilter] = useRecoilStateDeferred(mutationsFilterAtom)
  const [cladesFilter, setCladesFilter] = useRecoilStateDeferred(cladesFilterAtom)
  const [aaFilter, setAAFilter] = useRecoilStateDeferred(aaFilterAtom)
  const [showGood, setShowGood] = useRecoilStateDeferred(showGoodFilterAtom)
  const [showMediocre, setShowMediocre] = useRecoilStateDeferred(showMediocreFilterAtom)
  const [showBad, setShowBad] = useRecoilStateDeferred(showBadFilterAtom)
  const [showErrors, setShowErrors] = useRecoilStateDeferred(showErrorsFilterAtom)

  const handleSeqNamesFilterChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target
      setSeqNamesFilter(value)
    },
    [setSeqNamesFilter],
  )

  const handleMutationsFilterChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target
      setMutationsFilter(value)
    },
    [setMutationsFilter],
  )

  const handleAAFilterChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target
      setAAFilter(value)
    },
    [setAAFilter],
  )

  const handleCladesFilterChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target
      setCladesFilter(value)
    },
    [setCladesFilter],
  )

  const handleSetShowGood = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { checked } = event.target
      setShowGood(checked)
    },
    [setShowGood],
  )

  const handleSetShowMediocre = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { checked } = event.target
      setShowMediocre(checked)
    },
    [setShowMediocre],
  )

  const handleSetShowBad = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { checked } = event.target
      setShowBad(checked)
    },
    [setShowBad],
  )

  const handleSetShowErrors = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { checked } = event.target
      setShowErrors(checked)
    },
    [setShowErrors],
  )

  return (
    <Collapse isOpen={!isResultsFilterPanelCollapsed}>
      <Card>
        {/* <CardHeader>{t('Results filter')}</CardHeader> */}

        <CardBody>
          <FormSection>
            <Label>
              {t('By sequence name')}
              <InputText
                type="text"
                placeholder="Ex.: Wuhan, WH"
                value={seqNamesFilter}
                onChange={handleSeqNamesFilterChange}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-gramm="false"
              />
            </Label>
          </FormSection>

          <FormSection>
            <Label>
              {t('By nucleotide mutations')}
              <InputText
                type="text"
                placeholder="Ex.: C3037T, .A"
                value={mutationsFilter}
                onChange={handleMutationsFilterChange}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-gramm="false"
              />
            </Label>
          </FormSection>

          <FormSection>
            <Label>
              {t('By aminoacid changes')}
              <InputText
                type="text"
                placeholder="Ex.: ORF1b:P314L, S:, :84, ORF1b:P314-"
                value={aaFilter}
                onChange={handleAAFilterChange}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-gramm="false"
              />
            </Label>
          </FormSection>

          <FormSection>
            <Label>
              {t('By clades')}
              <InputText
                type="text"
                placeholder="Ex.: 19B, 20"
                value={cladesFilter}
                onChange={handleCladesFilterChange}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-gramm="false"
              />
            </Label>
          </FormSection>

          <FormSection>
            <FormGroup check>
              <Label check>
                <Input type="checkbox" checked={showGood} onChange={handleSetShowGood} />
                <span>{t('Good quality')}</span>
              </Label>
            </FormGroup>
            <FormGroup check>
              <Label check>
                <Input type="checkbox" checked={showMediocre} onChange={handleSetShowMediocre} />
                {t('Mediocre quality')}
              </Label>
            </FormGroup>
            <FormGroup check>
              <Label check>
                <Input type="checkbox" checked={showBad} onChange={handleSetShowBad} />
                {t('Bad quality')}
              </Label>
            </FormGroup>
            <FormGroup check>
              <Label check>
                <Input type="checkbox" checked={showErrors} onChange={handleSetShowErrors} />
                {t('Has errors')}
              </Label>
            </FormGroup>
          </FormSection>
        </CardBody>
      </Card>
    </Collapse>
  )
}

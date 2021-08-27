import React from 'react'

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
} from 'reactstrap'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'

import { State } from 'src/state/reducer'
import {
  setAAFilter,
  setCladesFilter,
  setMutationsFilter,
  setSeqNamesFilter,
  setShowBad,
  setShowErrors,
  setShowGood,
  setShowMediocre,
} from 'src/state/algorithm/algorithm.actions'
import { setFilterPanelCollapsed } from 'src/state/ui/ui.actions'
import { QCFilters } from 'src/filtering/filterByQCIssues'

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
  background-color: #fff;
  flex-grow: 1;
  flex-basis: 22%;
`

export const FormSection = styled(FormGroup)<ReactstrapFormGroupProps>`
  font-size: 0.85rem;
  padding: 5px 10px;
  margin: 5px;
  border-radius: 3px;
`

export const Label = styled(ReactstrapLabel)<ReactstrapLabelProps>`
  width: 100%;
  font-size: 0.85rem;
`

export const InputText = styled(ReactstrapInput)<ReactstrapInputProps>`
  width: 100%;
  height: 30px;
  padding: 5px 7px;
  font-size: 0.75rem;

  ::placeholder {
    color: rgba(168, 182, 200, 0.67);
  }

  &:hover::placeholder {
    color: rgba(168, 182, 200, 1);
  }
`

export const InputCheckbox = styled(ReactstrapInput)<ReactstrapInputProps>`
  padding-bottom: 3px;
`

const mapStateToProps = (state: State) => ({
  filterPanelCollapsed: state.ui.filterPanelCollapsed,
  seqNamesFilter: state.algorithm.filters.seqNamesFilter ?? '',
  mutationsFilter: state.algorithm.filters.mutationsFilter ?? '',
  aaFilter: state.algorithm.filters.aaFilter ?? '',
  cladesFilter: state.algorithm.filters.cladesFilter ?? '',
  showGood: state.algorithm.filters.showGood,
  showMediocre: state.algorithm.filters.showMediocre,
  showBad: state.algorithm.filters.showBad,
  showErrors: state.algorithm.filters.showErrors,
})

const mapDispatchToProps = {
  setFilterPanelCollapsed,
  setSeqNamesFilter,
  setMutationsFilter,
  setAAFilter,
  setCladesFilter,
  setShowGood,
  setShowMediocre,
  setShowBad,
  setShowErrors,
}

export const ResultsFilter = connect(mapStateToProps, mapDispatchToProps)(ResultsFilterDisconnected)

export interface ResultsFilterProps extends QCFilters {
  filterPanelCollapsed: boolean
  seqNamesFilter: string
  mutationsFilter: string
  aaFilter: string
  cladesFilter: string
  setFilterPanelCollapsed(collapsed: boolean): void
  setSeqNamesFilter(namesFilter?: string): void
  setMutationsFilter(mutationsFilter?: string): void
  setAAFilter(aaFilter?: string): void
  setCladesFilter(cladesFilter?: string): void
  setShowGood(checked: boolean): void
  setShowMediocre(checked: boolean): void
  setShowBad(checked: boolean): void
  setShowErrors(checked: boolean): void
}

export function ResultsFilterDisconnected({
  filterPanelCollapsed,
  setFilterPanelCollapsed,
  seqNamesFilter,
  setSeqNamesFilter,
  mutationsFilter,
  aaFilter,
  showGood,
  showMediocre,
  showBad,
  showErrors,
  setMutationsFilter,
  setAAFilter,
  cladesFilter,
  setCladesFilter,
  setShowGood,
  setShowMediocre,
  setShowBad,
  setShowErrors,
}: ResultsFilterProps) {
  const { t } = useTranslation()

  function handleSeqNamesFilterChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { value } = event.target
    setSeqNamesFilter(value)
  }

  function handleMutationsFilterChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { value } = event.target
    setMutationsFilter(value)
  }

  function handleAAFilterChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { value } = event.target
    setAAFilter(value)
  }

  function handleCladesFilterChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { value } = event.target
    setCladesFilter(value)
  }

  function handleSetShowGood(event: React.ChangeEvent<HTMLInputElement>) {
    const { checked } = event.target
    setShowGood(checked)
  }

  function handleSetShowMediocre(event: React.ChangeEvent<HTMLInputElement>) {
    const { checked } = event.target
    setShowMediocre(checked)
  }

  function handleSetShowBad(event: React.ChangeEvent<HTMLInputElement>) {
    const { checked } = event.target
    setShowBad(checked)
  }

  function handleSetShowErrors(event: React.ChangeEvent<HTMLInputElement>) {
    const { checked } = event.target
    setShowErrors(checked)
  }

  return (
    <Collapse isOpen={!filterPanelCollapsed}>
      <Card>
        <CardHeader>{t('Results filter')}</CardHeader>

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
            <Label>
              {t('By quality')}
              <FormGroup check>
                <Label check>
                  <InputCheckbox type="checkbox" checked={showGood} onChange={handleSetShowGood} />
                  {t('Good quality')}
                </Label>
              </FormGroup>

              <FormGroup check>
                <Label check>
                  <InputCheckbox type="checkbox" checked={showMediocre} onChange={handleSetShowMediocre} />
                  {t('Mediocre quality')}
                </Label>
              </FormGroup>

              <FormGroup check>
                <Label check>
                  <InputCheckbox type="checkbox" checked={showBad} onChange={handleSetShowBad} />
                  {t('Bad quality')}
                </Label>
              </FormGroup>

              <FormGroup check>
                <Label check>
                  <InputCheckbox type="checkbox" checked={showErrors} onChange={handleSetShowErrors} />
                  {t('Has errors')}
                </Label>
              </FormGroup>
            </Label>
          </FormSection>
        </CardBody>
      </Card>
    </Collapse>
  )
}

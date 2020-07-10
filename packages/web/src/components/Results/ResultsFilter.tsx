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
  setSeqNamesFilter,
  setMutationsFilter,
  setAAFilter,
  setCladesFilter,
  setHasErrorsFilter,
  setHasNoQcIssuesFilter,
  setHasQcIssuesFilter,
} from 'src/state/algorithm/algorithm.actions'
import { setFilterPanelCollapsed } from 'src/state/ui/ui.actions'

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
  seqNamesFilter: state.algorithm.seqNamesFilter ?? '',
  mutationsFilter: state.algorithm.mutationsFilter ?? '',
  aaFilter: state.algorithm.aaFilter ?? '',
  cladesFilter: state.algorithm.cladesFilter ?? '',
  hasNoQcIssuesFilter: state.algorithm.hasNoQcIssuesFilter,
  hasQcIssuesFilter: state.algorithm.hasQcIssuesFilter,
  hasErrorsFilter: state.algorithm.hasErrorsFilter,
})

const mapDispatchToProps = {
  setFilterPanelCollapsed,
  setSeqNamesFilter,
  setMutationsFilter,
  setAAFilter,
  setCladesFilter,
  setHasNoQcIssuesFilter,
  setHasQcIssuesFilter,
  setHasErrorsFilter,
}

export const ResultsFilter = connect(mapStateToProps, mapDispatchToProps)(ResultsFilterDisconnected)

export interface ResultsFilterProps {
  filterPanelCollapsed: boolean
  seqNamesFilter: string
  mutationsFilter: string
  aaFilter: string
  cladesFilter: string
  hasQcIssuesFilter: boolean
  hasNoQcIssuesFilter: boolean
  hasErrorsFilter: boolean
  setFilterPanelCollapsed(collapsed: boolean): void
  setSeqNamesFilter(namesFilter?: string): void
  setMutationsFilter(mutationsFilter?: string): void
  setAAFilter(aaFilter?: string): void
  setCladesFilter(cladesFilter?: string): void
  setHasNoQcIssuesFilter(checked: boolean): void
  setHasQcIssuesFilter(checked: boolean): void
  setHasErrorsFilter(checked: boolean): void
}

export function ResultsFilterDisconnected({
  filterPanelCollapsed,
  setFilterPanelCollapsed,
  seqNamesFilter,
  setSeqNamesFilter,
  mutationsFilter,
  aaFilter,
  hasQcIssuesFilter,
  hasNoQcIssuesFilter,
  hasErrorsFilter,
  setMutationsFilter,
  setAAFilter,
  cladesFilter,
  setCladesFilter,
  setHasNoQcIssuesFilter,
  setHasQcIssuesFilter,
  setHasErrorsFilter,
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

  function handleHasNoQcIssuesFilterChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { checked } = event.target
    setHasNoQcIssuesFilter(checked)
  }

  function handleHasQcIssuesFilterChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { checked } = event.target
    setHasQcIssuesFilter(checked)
  }

  function handleHasErrorsFilterChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { checked } = event.target
    setHasErrorsFilter(checked)
  }

  return (
    <Collapse isOpen={filterPanelCollapsed}>
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
                placeholder="Ex.: ORF1b:P314L, S:, :84"
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
              {t('By QC status')}
              <FormGroup check>
                <Label check>
                  <InputCheckbox
                    type="checkbox"
                    checked={hasNoQcIssuesFilter}
                    onChange={handleHasNoQcIssuesFilterChange}
                  />
                  {t('Has no issues')}
                </Label>
              </FormGroup>

              <FormGroup check>
                <Label check>
                  <InputCheckbox type="checkbox" checked={hasQcIssuesFilter} onChange={handleHasQcIssuesFilterChange} />
                  {t('Has issues')}
                </Label>
              </FormGroup>

              <FormGroup check>
                <Label check>
                  <InputCheckbox type="checkbox" checked={hasErrorsFilter} onChange={handleHasErrorsFilterChange} />
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

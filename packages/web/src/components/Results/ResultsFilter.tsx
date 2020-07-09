import React from 'react'

import { FormGroup, Input, Label } from 'reactstrap'
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

const mapStateToProps = (state: State) => ({
  seqNamesFilter: state.algorithm.seqNamesFilter ?? '',
  mutationsFilter: state.algorithm.mutationsFilter ?? '',
  aaFilter: state.algorithm.aaFilter ?? '',
  cladesFilter: state.algorithm.cladesFilter ?? '',
  hasNoQcIssuesFilter: state.algorithm.hasNoQcIssuesFilter,
  hasQcIssuesFilter: state.algorithm.hasQcIssuesFilter,
  hasErrorsFilter: state.algorithm.hasErrorsFilter,
})

const mapDispatchToProps = {
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
  seqNamesFilter: string
  mutationsFilter: string
  aaFilter: string
  cladesFilter: string
  hasQcIssuesFilter: boolean
  hasNoQcIssuesFilter: boolean
  hasErrorsFilter: boolean
  setSeqNamesFilter(namesFilter?: string): void
  setMutationsFilter(mutationsFilter?: string): void
  setAAFilter(aaFilter?: string): void
  setCladesFilter(cladesFilter?: string): void
  setHasNoQcIssuesFilter(checked: boolean): void
  setHasQcIssuesFilter(checked: boolean): void
  setHasErrorsFilter(checked: boolean): void
}

export function ResultsFilterDisconnected({
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
    <div>
      <div>
        <label htmlFor="seq-name-filter">{t('Sequence names')}</label>
        <Input
          name="seq-name-filter"
          type="text"
          value={seqNamesFilter}
          onChange={handleSeqNamesFilterChange}
          autoComplete="off"
        />
      </div>

      <div>
        <label htmlFor="mutation-filter">{t('Mutations')}</label>
        <Input
          name="mutation-filter"
          type="text"
          value={mutationsFilter}
          onChange={handleMutationsFilterChange}
          autoComplete="off"
        />
      </div>

      <div>
        <label htmlFor="aa-mutation-filter">{t('Aminoacid changes')}</label>
        <Input
          name="aa-mutation-filter"
          type="text"
          value={aaFilter}
          onChange={handleAAFilterChange}
          autoComplete="off"
        />
      </div>

      <div>
        <label htmlFor="clade-filter">{t('Clades')}</label>
        <Input
          name="clade-filter"
          type="text"
          value={cladesFilter}
          onChange={handleCladesFilterChange}
          autoComplete="off"
        />
      </div>

      <div>
        <FormGroup check>
          <Label check>
            <Input type="checkbox" checked={hasNoQcIssuesFilter} onChange={handleHasNoQcIssuesFilterChange} />
            {t('Has no QC issues')}
          </Label>
        </FormGroup>

        <FormGroup check>
          <Label check>
            <Input type="checkbox" checked={hasQcIssuesFilter} onChange={handleHasQcIssuesFilterChange} />
            {t('Has QC issues')}
          </Label>
        </FormGroup>

        <FormGroup check>
          <Label check>
            <Input type="checkbox" checked={hasErrorsFilter} onChange={handleHasErrorsFilterChange} />
            {t('Has errors')}
          </Label>
        </FormGroup>
      </div>
    </div>
  )
}

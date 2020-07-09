import React from 'react'

import { Input } from 'reactstrap'
import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'

import { State } from 'src/state/reducer'
import { setMutationsFilter, setCladesFilter } from 'src/state/algorithm/algorithm.actions'

const mapStateToProps = (state: State) => ({
  cladesFilter: state.algorithm.cladesFilter,
  mutationsFilter: state.algorithm.mutationsFilter,
})

const mapDispatchToProps = {
  setMutationsFilter,
  setCladesFilter,
}

export const ResultsFilter = connect(mapStateToProps, mapDispatchToProps)(ResultsFilterDisconnected)

export interface ResultsFilterProps {
  mutationsFilter?: string
  cladesFilter?: string
  setMutationsFilter(filter?: string): void
  setCladesFilter(cladesFilter?: string): void
}

export function ResultsFilterDisconnected({
  mutationsFilter,
  setMutationsFilter,
  cladesFilter,
  setCladesFilter,
}: ResultsFilterProps) {
  const { t } = useTranslation()

  function handleMutationsFilterChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { value } = event.target
    setMutationsFilter(value)
  }

  function handleCladesFilterChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { value } = event.target
    setCladesFilter(value)
  }

  return (
    <div>
      <div>
        <label htmlFor="mutation-filter">{t('Mutations')}</label>
        <Input
          name="mutation-filter"
          type="text"
          value={mutationsFilter ?? ''}
          onChange={handleMutationsFilterChange}
          autoComplete="off"
        />
      </div>

      <div>
        <label htmlFor="clade-filter">{t('Clades')}</label>
        <Input
          name="clade-filter"
          type="text"
          value={cladesFilter ?? ''}
          onChange={handleCladesFilterChange}
          autoComplete="off"
        />
      </div>
    </div>
  )
}

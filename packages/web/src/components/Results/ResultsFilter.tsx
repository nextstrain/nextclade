import React from 'react'

import { Input } from 'reactstrap'
import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'

import { State } from 'src/state/reducer'
import { setSeqNamesFilter, setMutationsFilter, setCladesFilter } from 'src/state/algorithm/algorithm.actions'

const mapStateToProps = (state: State) => ({
  seqNamesFilter: state.algorithm.seqNamesFilter,
  mutationsFilter: state.algorithm.mutationsFilter,
  cladesFilter: state.algorithm.cladesFilter,
})

const mapDispatchToProps = {
  setSeqNamesFilter,
  setMutationsFilter,
  setCladesFilter,
}

export const ResultsFilter = connect(mapStateToProps, mapDispatchToProps)(ResultsFilterDisconnected)

export interface ResultsFilterProps {
  seqNamesFilter?: string
  mutationsFilter?: string
  cladesFilter?: string
  setSeqNamesFilter(namesFilter?: string): void
  setMutationsFilter(mutationsFilter?: string): void
  setCladesFilter(cladesFilter?: string): void
}

export function ResultsFilterDisconnected({
  seqNamesFilter,
  setSeqNamesFilter,
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

  function handleSeqNamesFilterChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { value } = event.target
    setSeqNamesFilter(value)
  }

  return (
    <div>
      <div>
        <label htmlFor="seq-name-filter">{t('Seq-names')}</label>
        <Input
          name="seq-name-filter"
          type="text"
          value={seqNamesFilter ?? ''}
          onChange={handleSeqNamesFilterChange}
          autoComplete="off"
        />
      </div>

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

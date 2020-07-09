import React from 'react'

import { Input } from 'reactstrap'
import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'

import { State } from 'src/state/reducer'
import { setMutationsFilter } from 'src/state/algorithm/algorithm.actions'

const mapStateToProps = (state: State) => ({
  mutationsFilter: state.algorithm.mutationsFilter,
})

const mapDispatchToProps = {
  setMutationsFilter: (mutationsFilter?: string) => setMutationsFilter(mutationsFilter),
}

export const ResultsFilter = connect(mapStateToProps, mapDispatchToProps)(ResultsFilterDisconnected)

export interface ResultsFilterProps {
  mutationsFilter?: string
  setMutationsFilter(filter?: string): void
}

export function ResultsFilterDisconnected({ mutationsFilter, setMutationsFilter }: ResultsFilterProps) {
  const { t } = useTranslation()

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { value } = event.target
    setMutationsFilter(value)
  }

  return (
    <div>
      <label htmlFor="mutation-filter">{t('Mutations')}</label>
      <Input
        name="mutation-filter"
        type="text"
        value={mutationsFilter ?? ''}
        onChange={handleChange}
        autoComplete="off"
      />
    </div>
  )
}

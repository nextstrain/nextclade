import React, { useCallback } from 'react'

import { connect } from 'react-redux'

import type { Gene } from 'src/algorithms/types'
import type { State } from 'src/state/reducer'

import { selectGeneMap } from 'src/state/algorithm/algorithm.selectors'

export interface SequenceSelectorProps {
  geneMap?: Gene[]
  viewedGene: string

  setViewedGene(gene: string): void
}

const mapStateToProps = (state: State) => ({
  geneMap: selectGeneMap(state),
})

const mapDispatchToProps = {}

export const SequenceSelector = connect(mapStateToProps, mapDispatchToProps)(SequenceSelectorDisconnected)

export function SequenceSelectorDisconnected({ geneMap, viewedGene, setViewedGene }: SequenceSelectorProps) {
  let geneNames = ['Sequence']
  if (geneMap) {
    geneNames = [...geneNames, ...geneMap.map((gene) => gene.geneName)]
  }

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setViewedGene(e.target.value)
    },
    [setViewedGene],
  )

  return (
    <select name="sequence-view-gene-dropdown" id="sequence-view-gene-dropdown" onChange={onChange} value={viewedGene}>
      {geneNames.map((gene) => (
        <option key={gene} value={gene}>
          {gene}
        </option>
      ))}
    </select>
  )
}

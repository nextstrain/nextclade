import React, { useCallback, useMemo } from 'react'

import { connect } from 'react-redux'

import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

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
  const { t } = useTranslationSafe()

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

  const getOptionText = useCallback(
    (gene: string) => {
      if (gene === 'Sequence') {
        return t('Sequence')
      }

      return t('Gene {{geneName}}', { geneName: gene })
    },
    [t],
  )

  return (
    <select name="sequence-view-gene-dropdown" id="sequence-view-gene-dropdown" onChange={onChange} value={viewedGene}>
      {geneNames.map((gene) => (
        <option key={gene} value={gene}>
          {getOptionText(gene)}
        </option>
      ))}
    </select>
  )
}

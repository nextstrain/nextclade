import React, { useCallback } from 'react'

import { connect } from 'react-redux'
import styled from 'styled-components'

import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

import type { Gene } from 'src/algorithms/types'
import type { State } from 'src/state/reducer'
import { selectGeneMap } from 'src/state/algorithm/algorithm.selectors'
import { GENE_OPTION_NUC_SEQUENCE } from 'src/constants'

const Select = styled.select`
  text-align: center;
  margin: auto;
  border-radius: 3px;
  height: 30px;
  min-width: 150px;
  text-align-last: center;
`

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

  let geneNames = [GENE_OPTION_NUC_SEQUENCE]
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
      if (gene === GENE_OPTION_NUC_SEQUENCE) {
        return t('Nucleotide sequence')
      }

      return t('Gene {{geneName}}', { geneName: gene })
    },
    [t],
  )

  return (
    <Select name="sequence-view-gene-dropdown" id="sequence-view-gene-dropdown" onChange={onChange} value={viewedGene}>
      {geneNames.map((gene) => (
        <option key={gene} value={gene}>
          {getOptionText(gene)}
        </option>
      ))}
    </Select>
  )
}

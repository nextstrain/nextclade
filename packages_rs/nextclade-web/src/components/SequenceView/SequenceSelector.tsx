import React, { useCallback, useMemo } from 'react'
import { viewedGeneAtom } from 'src/state/seqViewSettings.state'
import styled from 'styled-components'
import { GENE_OPTION_NUC_SEQUENCE } from 'src/constants'
import { useRecoilCallback, useRecoilValue } from 'recoil'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { cdsNamesAtom } from 'src/state/results.state'

const Select = styled.select`
  text-align: center;
  margin: auto;
  border-radius: 3px;
  height: 30px;
  min-width: 150px;
  text-align-last: center;
`

export function SequenceSelector() {
  const { t } = useTranslationSafe()

  const cdsNames = useRecoilValue(cdsNamesAtom)

  const viewedGene = useRecoilValue(viewedGeneAtom)
  const onChangeGene = useRecoilCallback(
    ({ set }) =>
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        set(viewedGeneAtom, e.target.value)
      },
    [],
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

  const geneOptions = useMemo(() => {
    return [GENE_OPTION_NUC_SEQUENCE, ...cdsNames].map((gene) => {
      return (
        <option key={gene} value={gene}>
          {getOptionText(gene)}
        </option>
      )
    })
  }, [cdsNames, getOptionText])

  return (
    <Select
      name="sequence-view-gene-dropdown"
      id="sequence-view-gene-dropdown"
      onChange={onChangeGene}
      value={viewedGene}
    >
      {geneOptions}
    </Select>
  )
}

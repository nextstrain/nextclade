import { desaturate } from 'polished'
import React, { useCallback, useMemo } from 'react'
import { FormGroup } from 'reactstrap'
import { useRecoilCallback, useRecoilState, useRecoilValue } from 'recoil'
import { Multitoggle } from 'src/components/Common/Multitoggle'
import { GENE_OPTION_NUC_SEQUENCE } from 'src/constants'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { cdsNamesAtom } from 'src/state/results.state'
import { isInNucleotideViewAtom, SeqViewMode, seqViewModeAtom, viewedGeneAtom } from 'src/state/seqViewSettings.state'
import styled, { useTheme } from 'styled-components'

const Select = styled.select`
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
    <>
      <Select
        name="sequence-view-gene-dropdown"
        id="sequence-view-gene-dropdown"
        onChange={onChangeGene}
        value={viewedGene}
      >
        {geneOptions}
      </Select>
      <div>
        <SeqViewModeSwitch />
      </div>
    </>
  )
}

export function SeqViewModeSwitch() {
  const { t } = useTranslationSafe()
  const theme = useTheme()
  const [seqViewMode, setSeqViewMode] = useRecoilState(seqViewModeAtom)
  const isInNucleotideView = useRecoilValue(isInNucleotideViewAtom)

  const seqViewModes = useMemo(
    () => [
      {
        value: SeqViewMode.Nuc,
        label: t('Nuc'),
        color: desaturate(0.175)(theme.primary),
      },
      {
        value: SeqViewMode.NucPlusAa,
        label: t('Nuc & AA'),
        color: desaturate(0.2)(theme.purple),
      },
      {
        value: SeqViewMode.Aa,
        label: t('AA'),
        color: desaturate(0.33)(theme.danger),
      },
    ],
    [t, theme.danger, theme.primary, theme.purple],
  )

  return useMemo(() => {
    if (isInNucleotideView) {
      return null
    }

    return (
      <FormGroup>
        <Multitoggle<SeqViewMode> options={seqViewModes} value={seqViewMode} onChange={setSeqViewMode} itemWidth={80} />
      </FormGroup>
    )
  }, [isInNucleotideView, seqViewMode, seqViewModes, setSeqViewMode])
}

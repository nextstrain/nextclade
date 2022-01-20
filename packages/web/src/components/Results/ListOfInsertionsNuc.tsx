import React, { useMemo } from 'react'

import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import type { NucleotideInsertion } from 'src/algorithms/types'
import { TableSlimWithBorders } from 'src/components/Common/TableSlim'
import { truncateString } from 'src/helpers/truncateString'

const INSERTION_MAX_LENGTH = 50 as const

const InsertionsTable = styled(TableSlimWithBorders)`
  min-width: 300px;
`

const ThFragment = styled.td`
  min-width: 200px;
`

const TdFragment = styled.td`
  min-width: 200px;
  font-family: ${(props) => props.theme.font.monospace};
`

export interface ListOfInsertionsNucProps {
  insertions: NucleotideInsertion[]
  totalInsertions: number
}

export function ListOfInsertionsNuc({ insertions, totalInsertions }: ListOfInsertionsNucProps) {
  const { t } = useTranslation()

  const { thead, tbody } = useMemo(() => {
    const thead = (
      <tr>
        <th className="text-center">{t('After ref pos.')}</th>
        <th className="text-center">{t('Length')}</th>
        <ThFragment className="text-center">{t('Nuc. fragment')}</ThFragment>
      </tr>
    )

    const tbody = insertions.map(({ pos, ins }) => (
      <tr key={pos}>
        <td className="text-center">{pos + 1}</td>
        <td className="text-center">{ins.length}</td>
        <TdFragment className="text-left">{truncateString(ins, INSERTION_MAX_LENGTH)}</TdFragment>
      </tr>
    ))

    return { thead, tbody }
  }, [insertions, t])

  if (insertions.length === 0) {
    return null
  }

  return (
    <>
      <InsertionsTable>
        <thead>{thead}</thead>
        <tbody>{tbody}</tbody>
      </InsertionsTable>
    </>
  )
}

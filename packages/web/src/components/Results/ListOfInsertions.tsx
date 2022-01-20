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

const ThNormal = styled.td`
  width: 80px;
`

const ThFragment = styled.td`
  min-width: 200px;
`

const TdNormal = styled.td`
  min-width: 80px;
  font-family: ${(props) => props.theme.font.monospace};
`

const TdFragment = styled.td`
  min-width: 200px;
  font-family: ${(props) => props.theme.font.monospace};
`

export interface ListOfInsertionsNucProps {
  insertions: NucleotideInsertion[]
  totalInsertions: number
}

export function ListOfInsertions({ insertions, totalInsertions }: ListOfInsertionsNucProps) {
  const { t } = useTranslation()

  const { thead, tbody } = useMemo(() => {
    const thead = (
      <tr>
        <ThNormal className="text-center">{t('After ref pos.')}</ThNormal>
        <ThNormal className="text-center">{t('Length')}</ThNormal>
        <ThFragment className="text-center">{t('Inserted fragment')}</ThFragment>
      </tr>
    )

    const tbody = insertions.map(({ pos, ins }) => (
      <tr key={pos}>
        <TdNormal className="text-center">{pos + 1}</TdNormal>
        <TdNormal className="text-center">{ins.length}</TdNormal>
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

import React from 'react'

import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import { Table, TableCell, TableCellName, TableCellText, TableRow } from 'src/components/Results/ResultsTable'
import { GeneMap, GENE_MAP_HEIGHT_PX } from 'src/components/GeneMap/GeneMap'

export const GeneMapTableRow = styled(TableRow)`
  height: ${GENE_MAP_HEIGHT_PX}px;
  border: 1px solid #b3b3b3aa;
  background-color: #dadfe5;
`

export function GeneMapTable() {
  const { t } = useTranslation()

  return (
    <Table>
      <GeneMapTableRow>
        <TableCellName basis="500px" shrink={0}>
          <TableCellText>{t('Genome annotation')}</TableCellText>
        </TableCellName>
        <TableCell grow={1} shrink={1} className="w-100">
          <GeneMap />
        </TableCell>
      </GeneMapTableRow>
    </Table>
  )
}

import React from 'react'

import { useTranslation } from 'react-i18next'

import type { NucleotideInsertion } from 'src/algorithms/types'
import { TableSlim, TableSlimWithBorders } from 'src/components/Common/TableSlim'

const INSERTION_MAX_LENGTH = 30 as const

export function truncateString(s: string, maxLen: number) {
  const truncatedText = '... (truncated)'
  const targetLength = maxLen - truncatedText.length
  if (s.length > targetLength) {
    return s.slice(0, targetLength).concat(truncatedText)
  }
  return s
}

export interface ListOfInsertionsProps {
  insertions: NucleotideInsertion[]
  totalInsertions: number
}

export function ListOfInsertions({ insertions, totalInsertions }: ListOfInsertionsProps) {
  const { t } = useTranslation()

  return (
    <>
      <TableSlim borderless className="mb-1">
        <tbody>
          <tr>
            <td>{t('Number of insertions')}</td>
            <td>{insertions.length}</td>
          </tr>

          <tr>
            <td>{t('Total length of insertions')}</td>
            <td>{totalInsertions}</td>
          </tr>
        </tbody>
      </TableSlim>

      {insertions.length > 0 && (
        <TableSlimWithBorders className="mb-1">
          <thead>
            <tr>
              <th className="text-center">{t('After pos.')}</th>
              <th className="text-center">{t('Length')}</th>
              <th className="text-center">{t('Nuc. fragment')}</th>
            </tr>
          </thead>

          <tbody>
            {insertions.map(({ pos, ins }) => (
              <tr key={pos}>
                <td className="text-center">{pos}</td>
                <td className="text-center">{ins.length}</td>
                <td className="text-left">{truncateString(ins, INSERTION_MAX_LENGTH)}</td>
              </tr>
            ))}
          </tbody>
        </TableSlimWithBorders>
      )}
    </>
  )
}

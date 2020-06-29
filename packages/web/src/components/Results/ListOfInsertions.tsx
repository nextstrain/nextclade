import React from 'react'

import { useTranslation } from 'react-i18next'
import type { DeepReadonly } from 'ts-essentials'

import type { NucleotideLocation } from 'src/algorithms/types'
import { GAP } from 'src/algorithms/nucleotides'
import { truncateList } from 'src/components/Results/truncateList'
import { formatMutation } from 'src/helpers/formatMutation'

const LIST_OF_INSERTIONS_MAX_ITEMS = 10 as const

export interface ListOfInsertionsProps {
  readonly insertions: DeepReadonly<NucleotideLocation[]>
}

export function ListOfInsertions({ insertions }: ListOfInsertionsProps) {
  const { t } = useTranslation()

  let insertionItems = insertions.map(({ pos, nuc }) => {
    const mut = formatMutation({ pos, refNuc: GAP, queryNuc: nuc })
    return <li key={mut}>{mut}</li>
  })

  insertionItems = truncateList(insertionItems, LIST_OF_INSERTIONS_MAX_ITEMS, t('...more'))

  return (
    <div>
      <div>{t('Insertions:')}</div>
      <ul>{insertionItems}</ul>
    </div>
  )
}

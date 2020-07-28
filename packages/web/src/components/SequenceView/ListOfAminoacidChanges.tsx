import React from 'react'

import type { DeepReadonly } from 'ts-essentials'
import { useTranslation } from 'react-i18next'

import { formatAAMutation } from 'src/helpers/formatMutation'

import { AminoacidSubstitution } from 'src/algorithms/types'

export interface ListOfAminoacidChangesProps {
  readonly aminoacidChanges: DeepReadonly<AminoacidSubstitution[]>
}

export function ListOfAminoacidChanges({ aminoacidChanges }: ListOfAminoacidChangesProps) {
  const { t } = useTranslation()

  const totalChanges = aminoacidChanges.length

  const aminoacidMutationItems = aminoacidChanges.map(({ queryAA, codon, refAA, gene }) => {
    const notation = formatAAMutation({ gene, refAA, codon, queryAA })
    return <li key={notation}>{notation}</li>
  })

  return (
    <div>
      {t('Aminoacid changes ({{totalChanges}})', { totalChanges })}
      <ul>{aminoacidMutationItems}</ul>
    </div>
  )
}

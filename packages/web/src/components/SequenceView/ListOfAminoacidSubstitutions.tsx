import React from 'react'

import type { DeepReadonly } from 'ts-essentials'
import { useTranslation } from 'react-i18next'

import type { AminoacidSubstitution } from 'src/algorithms/types'
import { formatAAMutation } from 'src/helpers/formatMutation'

export interface ListOfAminoacidChangesProps {
  readonly aminoacidSubstitutions: DeepReadonly<AminoacidSubstitution[]>
}

export function ListOfAminoacidSubstitutions({ aminoacidSubstitutions }: ListOfAminoacidChangesProps) {
  const { t } = useTranslation()

  const totalChanges = aminoacidSubstitutions.length

  const aminoacidMutationItems = aminoacidSubstitutions.map((sub) => {
    const notation = formatAAMutation(sub)
    return <li key={notation}>{notation}</li>
  })

  return (
    <div>
      {t('Aminoacid substitutions ({{totalChanges}})', { totalChanges })}
      <ul>{aminoacidMutationItems}</ul>
    </div>
  )
}

import React from 'react'

import type { NucleotideSubstitution } from 'src/algorithms/types'
import { ListOfMutationsGeneric } from 'src/components/Results/ListOfMutationsGeneric'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

export interface ListOfMutationsProps {
  substitutions: NucleotideSubstitution[]
}

export function ListOfMutations({ substitutions }: ListOfMutationsProps) {
  const { t } = useTranslationSafe()

  const totalMutations = substitutions.length

  return (
    <>
      <tr>
        <td colSpan={2}>{t('Nucleotide mutations ({{totalMutations}})', { totalMutations })}</td>
      </tr>

      <tr>
        <td colSpan={2}>
          <ListOfMutationsGeneric substitutions={substitutions} />
        </td>
      </tr>
    </>
  )
}

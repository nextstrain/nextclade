import React from 'react'

import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'

import type { PcrPrimerChange } from 'src/types'
import { Li, Ul } from 'src/components/Common/List'
import { NucleotideMutationBadge } from 'src/components/Common/MutationBadge'
import { formatMutation } from 'src/helpers/formatMutation'

export interface ListOfPcrPrimerChangesProps {
  pcrPrimerChanges: PcrPrimerChange[]
  totalPcrPrimerChanges: number
}

export function ListOfPcrPrimerChanges({ pcrPrimerChanges, totalPcrPrimerChanges }: ListOfPcrPrimerChangesProps) {
  const { t } = useTranslation()

  const items = pcrPrimerChanges.map(({ primer, substitutions }) => {
    const { name } = primer
    return (
      <Li key={name}>
        {t(`in "${name}":`)}
        <Ul>
          {substitutions.map((mut) => {
            const notation = formatMutation(mut)
            return <Li key={notation}>{<NucleotideMutationBadge mutation={mut} />}</Li>
          })}
        </Ul>
      </Li>
    )
  })

  return (
    <>
      <tr>
        <td colSpan={2}>{t('PCR primer changes ({{totalChanges}})', { totalChanges: totalPcrPrimerChanges })}</td>
      </tr>

      <tr>
        <td colSpan={2}>
          <Ul>{items}</Ul>
        </td>
      </tr>
    </>
  )
}

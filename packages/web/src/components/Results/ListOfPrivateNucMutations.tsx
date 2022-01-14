import React, { useMemo } from 'react'

import { PrivateMutations, convertSimpleSubToSub, convertDelToSubLabeled, convertDelToSub } from 'src/algorithms/types'

import { ListOfMutationsGeneric } from 'src/components/Results/ListOfMutationsGeneric'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { ListOfMutationsLabeled } from './ListOfMutationsLabeled'

export interface ListOfPrivateNucMutationsProps {
  privateNucMutations: PrivateMutations
}

export function ListOfPrivateNucMutations({ privateNucMutations }: ListOfPrivateNucMutationsProps) {
  const { t } = useTranslationSafe()

  const { reversions, labeled, unlabeled, totalMutations } = useMemo(() => {
    const {
      reversionSubstitutions,
      reversionDeletions,
      labeledSubstitutions,
      labeledDeletions,
      unlabeledSubstitutions,
    } = privateNucMutations

    // NOTE: Convert NucleotideDeletionSimple to NucleotideSubstitutionSimple,
    // and then everything to NucleotideSubstitutions, so that it's easier to render badge components.
    const reversions = [...reversionSubstitutions, ...reversionDeletions.map(convertDelToSub)].map(
      convertSimpleSubToSub,
    )

    const labeled = [...labeledSubstitutions, ...labeledDeletions.map(convertDelToSubLabeled)]

    // NOTE: we ignore unlabeled deletions. There are too many of them
    // TODO: consider converting deletions to ranges, as in the "Gap" column.
    const unlabeled = unlabeledSubstitutions.map(convertSimpleSubToSub)

    const totalMutations = reversions.length + labeled.length + unlabeled.length

    return { reversions, labeled, unlabeled, totalMutations }
  }, [privateNucMutations])

  return (
    <>
      <tr>
        <td colSpan={2}>{t('Private nucleotide mutations ({{totalMutations}})', { totalMutations })}</td>
      </tr>

      {reversions.length > 0 && (
        <>
          <tr>
            <td colSpan={2}>{t('Reversions')}</td>
          </tr>
          <tr>
            <td colSpan={2}>
              <ListOfMutationsGeneric substitutions={reversions} />
            </td>
          </tr>
        </>
      )}

      {labeled.length > 0 && (
        <>
          <tr>
            <td colSpan={2}>{t('Labeled')}</td>
          </tr>
          <ListOfMutationsLabeled mutationsLabeled={labeled} />
        </>
      )}

      {unlabeled.length > 0 && (
        <>
          <tr>
            <td colSpan={2}>{t('Unlabeled')}</td>
          </tr>
          <tr>
            <td colSpan={2}>
              <ListOfMutationsGeneric substitutions={unlabeled} />
            </td>
          </tr>
        </>
      )}
    </>
  )
}

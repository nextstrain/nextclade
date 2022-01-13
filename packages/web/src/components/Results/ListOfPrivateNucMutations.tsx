import React from 'react'

import type { PrivateMutations } from 'src/algorithms/types'
import { NucleotideMutationBadge } from 'src/components/Common/MutationBadge'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

export interface ListOfPrivateNucMutationsProps {
  privateNucMutations: PrivateMutations
}

export function ListOfPrivateNucMutations({ privateNucMutations }: ListOfPrivateNucMutationsProps) {
  const { t } = useTranslationSafe()

  const {
    reversionSubstitutions,
    reversionDeletions,
    labeledSubstitutions,
    labeledDeletions,
    unlabeledSubstitutions,
    unlabeledDeletions,
  } = privateNucMutations

  const reversions = [...reversionSubstitutions, ...reversionDeletions.map((del) => ({ ...del, qry: '-' }))]
  const labeled = [
    ...labeledSubstitutions,
    ...labeledDeletions.map((labeled) => ({ ...labeled, substitution: { ...labeled.deletion, qry: '-' } })),
  ]
  const unlabeled = [
    ...unlabeledSubstitutions,
    // ...unlabeledDeletions.map((del) => ({ ...del, qry: '-' }))
  ]
  const totalMutations = reversions.length + labeled.length + unlabeled.length

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
              {reversions.map(({ ref, pos, qry }) => (
                <div key={pos}>
                  <NucleotideMutationBadge mutation={{ refNuc: ref, pos, queryNuc: qry }} />
                </div>
              ))}
            </td>
          </tr>
        </>
      )}

      {labeled.length > 0 && (
        <>
          <tr>
            <td colSpan={2}>{t('Labeled')}</td>
          </tr>
          {labeled.map(({ substitution: { ref, pos, qry }, labels }) => (
            <tr key={pos}>
              <td>
                <NucleotideMutationBadge mutation={{ refNuc: ref, pos, queryNuc: qry }} />
              </td>
              <td>{labels.join(', ')}</td>
            </tr>
          ))}
        </>
      )}

      {unlabeled.length > 0 && (
        <>
          <tr>
            <td colSpan={2}>{t('Unlabeled')}</td>
          </tr>
          <tr>
            <td colSpan={2}>
              {unlabeled.map(({ ref, pos, qry }) => (
                <div key={pos}>
                  <NucleotideMutationBadge mutation={{ refNuc: ref, pos, queryNuc: qry }} />
                </div>
              ))}
            </td>
          </tr>
        </>
      )}
    </>
  )
}

import React from 'react'

import { connect } from 'react-redux'

import type { AminoacidSubstitution, Gene } from 'src/algorithms/types'
import type { State } from 'src/state/reducer'
import { formatAAMutation } from 'src/helpers/formatMutation'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { splitToRows } from 'src/components/Results/splitToRows'
import { TableSlim } from 'src/components/Common/TableSlim'
import { AminoacidMutationBadge } from 'src/components/Common/MutationBadge'
import { selectGeneMap } from 'src/state/algorithm/algorithm.selectors'

export interface ListOfAminoacidMutationsProps {
  aminoacidSubstitutions: AminoacidSubstitution[]
  geneMap?: Gene[]
}

const mapStateToProps = (state: State) => ({
  geneMap: selectGeneMap(state),
})

const mapDispatchToProps = {}

export const ListOfAminoacidSubstitutions = connect(
  mapStateToProps,
  mapDispatchToProps,
)(ListOfAminoacidMutationsDisconnected)

export function ListOfAminoacidMutationsDisconnected({
  aminoacidSubstitutions,
  geneMap,
}: ListOfAminoacidMutationsProps) {
  const { t } = useTranslationSafe()

  if (!geneMap) {
    return null
  }

  const totalMutations = aminoacidSubstitutions.length
  const maxRows = 6
  const substitutionsSelected = aminoacidSubstitutions.slice(0, 20)

  const columns = splitToRows(substitutionsSelected, { maxRows })

  let moreText
  if (totalMutations > substitutionsSelected.length) {
    moreText = t('(truncated)')
  }

  return (
    <>
      <tr>
        <td colSpan={2}>{t('Aminoacid mutations ({{totalMutations}})', { totalMutations })}</td>
      </tr>

      <tr>
        <td colSpan={2}>
          <TableSlim>
            <tbody>
              {columns.map((col, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <tr key={i}>
                  {col.map((item) => (
                    <td key={formatAAMutation(item)}>
                      <AminoacidMutationBadge mutation={item} geneMap={geneMap} />
                    </td>
                  ))}
                </tr>
              ))}

              {moreText && (
                <tr>
                  <td colSpan={maxRows} className="text-center">
                    {moreText}
                  </td>
                </tr>
              )}
            </tbody>
          </TableSlim>
        </td>
      </tr>
    </>
  )
}

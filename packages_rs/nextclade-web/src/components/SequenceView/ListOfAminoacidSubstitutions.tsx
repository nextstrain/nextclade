import React from 'react'

import copy from 'fast-copy'
import { connect } from 'react-redux'

import type { AminoacidSubstitution, Gene } from 'src/algorithms/types'
import type { State } from 'src/state/reducer'
import { formatAAMutation } from 'src/helpers/formatMutation'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { splitToRows } from 'src/components/Results/splitToRows'
import { TableSlim } from 'src/components/Common/TableSlim'
import { AminoacidMutationBadge } from 'src/components/Common/MutationBadge'
import { selectCurrentDataset, selectGeneMap } from 'src/state/algorithm/algorithm.selectors'
import { sortByGenes } from './sortByGenes'

export interface ListOfAminoacidMutationsProps {
  aminoacidSubstitutions: AminoacidSubstitution[]
  geneMap?: Gene[]
  geneOrderPreference: string[]
}

const mapStateToProps = (state: State) => ({
  geneMap: selectGeneMap(state),
  geneOrderPreference: selectCurrentDataset(state)?.geneOrderPreference ?? [],
})

const mapDispatchToProps = {}

export const ListOfAminoacidSubstitutions = connect(
  mapStateToProps,
  mapDispatchToProps,
)(ListOfAminoacidMutationsDisconnected)

export function ListOfAminoacidMutationsDisconnected({
  aminoacidSubstitutions,
  geneMap,
  geneOrderPreference,
}: ListOfAminoacidMutationsProps) {
  const { t } = useTranslationSafe()

  if (!geneMap) {
    return null
  }

  const totalMutations = aminoacidSubstitutions.length
  const maxRows = Math.min(8, totalMutations)
  const numCols = 8
  const substitutionsSelected = copy(aminoacidSubstitutions)
    .sort(sortByGenes(geneOrderPreference))
    .slice(0, maxRows * numCols)

  const columns = splitToRows(substitutionsSelected, { maxRows })

  let moreText
  if (totalMutations > substitutionsSelected.length) {
    moreText = t('(truncated)')
  }

  return (
    <div className="d-flex">
      <div className="mr-auto">
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
      </div>
    </div>
  )
}

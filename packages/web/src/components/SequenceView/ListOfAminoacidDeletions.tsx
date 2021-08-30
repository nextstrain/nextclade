import React from 'react'

import copy from 'fast-copy'
import { connect } from 'react-redux'

import type { AminoacidDeletion, Gene } from 'src/algorithms/types'
import type { State } from 'src/state/reducer'
import { formatAADeletion } from 'src/helpers/formatMutation'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { splitToRows } from 'src/components/Results/splitToRows'
import { TableSlim } from 'src/components/Common/TableSlim'
import { AminoacidMutationBadge } from 'src/components/Common/MutationBadge'
import { selectCurrentDataset, selectGeneMap } from 'src/state/algorithm/algorithm.selectors'
import { sortByGenes } from './sortByGenes'

export interface ListOfAminoacidDeletionsProps {
  aminoacidDeletions: AminoacidDeletion[]
  geneMap?: Gene[]
  geneOrderPreference: string[]
}

const mapStateToProps = (state: State) => ({
  geneMap: selectGeneMap(state),
  geneOrderPreference: selectCurrentDataset(state)?.geneOrderPreference ?? [],
})

const mapDispatchToProps = {}

export const ListOfAminoacidDeletions = connect(
  mapStateToProps,
  mapDispatchToProps,
)(ListOfAminoacidDeletionsDisconnected)

export function ListOfAminoacidDeletionsDisconnected({
  aminoacidDeletions,
  geneMap,
  geneOrderPreference,
}: ListOfAminoacidDeletionsProps) {
  const { t } = useTranslationSafe()

  if (!geneMap) {
    return null
  }

  const totalDeletions = aminoacidDeletions.length
  const maxRows = 6
  const deletionsSelected = copy(aminoacidDeletions).sort(sortByGenes(geneOrderPreference)).slice(0, 90)

  const columns = splitToRows(deletionsSelected, { maxRows })

  let moreText
  if (totalDeletions > deletionsSelected.length) {
    moreText = t('(truncated)')
  }

  return (
    <>
      <tr>
        <td colSpan={2}>{t('Aminoacid deletions ({{totalDeletions}})', { totalDeletions })}</td>
      </tr>

      <tr>
        <td colSpan={2}>
          <TableSlim>
            <tbody>
              {columns.map((col, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <tr key={i}>
                  {col.map((item) => (
                    <td key={formatAADeletion(item)}>
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

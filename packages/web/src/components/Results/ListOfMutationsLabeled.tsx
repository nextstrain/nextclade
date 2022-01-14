import React, { useMemo } from 'react'
import { convertSimpleSubToSub } from 'src/algorithms/types'

import type { NucleotideSubstitutionSimpleLabeled } from 'src/algorithms/types'
import { TableSlim } from 'src/components/Common/TableSlim'
import { NucleotideMutationBadge } from 'src/components/Common/MutationBadge'

export interface ListOfMutationsLabeledProps {
  mutationsLabeled: NucleotideSubstitutionSimpleLabeled[]
}

export function ListOfMutationsLabeled({ mutationsLabeled }: ListOfMutationsLabeledProps) {
  const labeledMutationRows = useMemo(
    () =>
      mutationsLabeled.map(({ substitution, labels }) => {
        const substitutionConverted = convertSimpleSubToSub(substitution)

        let labelsTruncated = labels
        let labelsTruncatedStr = ''
        if (labels.length > 6) {
          labelsTruncated = labels.slice(0, 7)
          labelsTruncatedStr = ', ...more'
        }
        labelsTruncatedStr = `${labelsTruncated.join(', ')}${labelsTruncatedStr}`

        return (
          <tr key={substitutionConverted.pos}>
            <td>
              <NucleotideMutationBadge mutation={substitutionConverted} />
            </td>
            <td>{labelsTruncatedStr}</td>
          </tr>
        )
      }),
    [mutationsLabeled],
  )

  return (
    <TableSlim>
      <tbody>{labeledMutationRows}</tbody>
    </TableSlim>
  )
}

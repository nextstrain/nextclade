import React, { useMemo } from 'react'

import { uniq } from 'lodash'
import styled from 'styled-components'

import type { NucSubLabeled } from 'src/types'
import { TableSlim } from 'src/components/Common/TableSlim'
import { NucleotideMutationBadge } from 'src/components/Common/MutationBadge'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

const MutationLabelBadge = styled.span`
  background-color: ${(props) => props.theme.gray300};
  border-radius: 3px;
  box-shadow: ${(props) => props.theme.shadows.slight};
  margin: 3px 5px;
  padding: 0 3px;
  font-family: ${(props) => props.theme.font.monospace};
`

export interface MutationLabelProps {
  label: string
}

export function MutationLabelBadgeComponent({ label }: MutationLabelProps) {
  return <MutationLabelBadge>{label}</MutationLabelBadge>
}

export interface ListOfMutationsLabeledProps {
  mutationsLabeled: NucSubLabeled[]
}

export function ListOfMutationsLabeled({ mutationsLabeled }: ListOfMutationsLabeledProps) {
  const { t } = useTranslationSafe()

  const labeledMutationRows = useMemo(
    () =>
      mutationsLabeled.map(({ substitution, labels }) => {
        let labelsTruncated = uniq(labels)
        let labelsTruncatedStr = ''
        if (labels.length > 6) {
          labelsTruncated = labels.slice(0, 7)
          labelsTruncatedStr = ', ...more'
        }

        const labelComponents = labelsTruncated.map((label) => (
          <MutationLabelBadgeComponent key={label} label={label} />
        ))

        return (
          <tr key={substitution.pos}>
            <td>
              <NucleotideMutationBadge mutation={substitution} />
            </td>
            <td>
              <span>{labelComponents}</span>
              <span>{labelsTruncatedStr}</span>
            </td>
          </tr>
        )
      }),
    [mutationsLabeled],
  )

  return (
    <div className="d-flex">
      <div className="mr-auto">
        <TableSlim>
          <thead>
            <tr>
              <th>{t('Mutation')}</th>
              <th>{t('Labels')}</th>
            </tr>
          </thead>
          <tbody>{labeledMutationRows}</tbody>
        </TableSlim>
      </div>
    </div>
  )
}

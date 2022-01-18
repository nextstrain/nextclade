import React, { useMemo, useState } from 'react'
import { convertPrivateMutations } from 'src/algorithms/types'
import { ListOfMutationsGeneric } from 'src/components/Results/ListOfMutationsGeneric'

import { getSafeId } from 'src/helpers/getSafeId'
import { TableSlim } from 'src/components/Common/TableSlim'
import { ColumnCladeProps } from 'src/components/Results/ColumnClade'
import { Tooltip } from 'src/components/Results/Tooltip'
import { ListOfAminoacidSubstitutions } from 'src/components/SequenceView/ListOfAminoacidSubstitutions'
import { ListOfPrivateNucMutations } from 'src/components/Results/ListOfPrivateNucMutations'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

export function ColumnMutations({ sequence }: ColumnCladeProps) {
  const { t } = useTranslationSafe()
  const [showTooltip, setShowTooltip] = useState(false)

  const { seqName, substitutions, aaSubstitutions, privateNucMutations } = sequence
  const id = getSafeId('mutations-label', { seqName })

  const privateNucMutationsInternal = useMemo(() => convertPrivateMutations(privateNucMutations), [privateNucMutations])

  return (
    <div id={id} className="w-100" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      {substitutions.length}
      <Tooltip isOpen={showTooltip} target={id} wide fullWidth>
        <TableSlim borderless className="mb-1">
          <thead />
          <tbody>
            <tr>
              <th>{t('Nucleotide substitutions rel. to reference ({{n}})', { n: substitutions.length })}</th>
            </tr>
            <tr>
              <td>
                <ListOfMutationsGeneric substitutions={substitutions} />
              </td>
            </tr>

            <tr>
              <th>{t('Aminoacid substitutions rel. to reference ({{n}})', { n: aaSubstitutions.length })}</th>
            </tr>
            <tr>
              <td>
                <ListOfAminoacidSubstitutions aminoacidSubstitutions={aaSubstitutions} />
              </td>
            </tr>

            <tr>
              <th>{t('Private mutations rel. to tree ({{n}})', { n: privateNucMutationsInternal.totalMutations })}</th>
            </tr>
            <tr>
              <td>
                <ListOfPrivateNucMutations privateNucMutationsInternal={privateNucMutationsInternal} />
              </td>
            </tr>
          </tbody>
        </TableSlim>
      </Tooltip>
    </div>
  )
}

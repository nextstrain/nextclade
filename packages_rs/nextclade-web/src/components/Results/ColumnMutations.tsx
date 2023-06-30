import React, { useCallback, useMemo, useState } from 'react'

import { convertPrivateMutations } from 'src/types'
import { ListOfMutationsGeneric } from 'src/components/Results/ListOfMutationsGeneric'
import { getSafeId } from 'src/helpers/getSafeId'
import { TableSlim } from 'src/components/Common/TableSlim'
import { ColumnCladeProps } from 'src/components/Results/ColumnClade'
import { Tooltip } from 'src/components/Results/Tooltip'
import { ListOfAminoacidSubstitutions } from 'src/components/SequenceView/ListOfAminoacidSubstitutions'
import { ListOfPrivateNucMutations } from 'src/components/Results/ListOfPrivateNucMutations'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

export function ColumnMutations({ analysisResult }: ColumnCladeProps) {
  const { t } = useTranslationSafe()
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const { index, seqName, substitutions, aaSubstitutions, privateNucMutations } = analysisResult
  const id = getSafeId('mutations-label', { index, seqName })

  const privateNucMutationsInternal = useMemo(() => convertPrivateMutations(privateNucMutations), [privateNucMutations])

  return (
    <div id={id} className="w-100" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {substitutions.length}
      <Tooltip isOpen={showTooltip} target={id} wide fullWidth>
        <TableSlim borderless className="mb-1">
          <thead />
          <tbody>
            <tr>
              <th>{t('Nucleotide substitutions rel. to reference ({{ n }})', { n: substitutions.length })}</th>
            </tr>
            <tr>
              <td>
                <ListOfMutationsGeneric substitutions={substitutions} />
              </td>
            </tr>

            <tr>
              <th>{t('Aminoacid substitutions rel. to reference ({{ n }})', { n: aaSubstitutions.length })}</th>
            </tr>
            <tr>
              <td>
                <ListOfAminoacidSubstitutions aminoacidSubstitutions={aaSubstitutions} />
              </td>
            </tr>

            <tr>
              <th>
                {t('Private mutations rel. to tree ({{ n }})', { n: privateNucMutationsInternal.totalMutations })}
              </th>
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

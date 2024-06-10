import React, { useCallback, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { currentRefNodeNameAtom } from 'src/state/results.state'
import { getAaMutations, getNucMutations } from 'src/types'
import type { ColumnCladeProps } from 'src/components/Results/ColumnClade'
import { getSafeId } from 'src/helpers/getSafeId'
import { TableSlim } from 'src/components/Common/TableSlim'
import { Tooltip } from 'src/components/Results/Tooltip'
import { ListOfNucMuts } from 'src/components/Results/ListOfNucMuts'
import { ListOfAaSubs } from 'src/components/SequenceView/ListOfAaSubs'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

export function ColumnMutations({ analysisResult }: ColumnCladeProps) {
  const { t } = useTranslationSafe()
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const { index, seqName } = analysisResult
  const id = getSafeId('mutations-label', { index, seqName })

  const refNodeName = useRecoilValue(currentRefNodeNameAtom)
  const { subs } = getNucMutations(analysisResult, refNodeName)
  const { aaSubs } = getAaMutations(analysisResult, refNodeName)

  const nodeName = useMemo(() => {
    if (refNodeName === '_root') {
      return t('reference')
    }
    if (refNodeName === '_parent') {
      return t('parent')
    }
    return `"${refNodeName}"`
  }, [refNodeName, t])

  return (
    <div id={id} className="w-100" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {subs.length}
      <Tooltip isOpen={showTooltip} target={id} wide fullWidth>
        <TableSlim borderless className="mb-1">
          <thead />
          <tbody>
            <tr>
              <th>
                {t('Nucleotide mutations relative to {{ what }} ({{ quantity }})', {
                  what: nodeName,
                  quantity: subs.length,
                })}
              </th>
            </tr>
            <tr>
              <td>
                <ListOfNucMuts analysisResult={analysisResult} />
              </td>
            </tr>

            <tr>
              <th>
                {t('Aminoacid substitutions rel. to {{ what }} ({{ quantity }})', {
                  what: nodeName,
                  quantity: aaSubs.length,
                })}
              </th>
            </tr>
            <tr>
              <td>
                <ListOfAaSubs analysisResult={analysisResult} />
              </td>
            </tr>
          </tbody>
        </TableSlim>
      </Tooltip>
    </div>
  )
}

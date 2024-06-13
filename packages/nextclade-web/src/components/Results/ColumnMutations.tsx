import React, { useCallback, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { REF_NODE_PARENT, REF_NODE_ROOT } from 'src/constants'
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
  const nucMuts = getNucMutations(analysisResult, refNodeName)
  const aaMuts = getAaMutations(analysisResult, refNodeName)

  const nodeName = useMemo(() => {
    if (refNodeName === REF_NODE_ROOT) {
      return t('reference')
    }
    if (refNodeName === REF_NODE_PARENT) {
      return t('parent')
    }
    return refNodeName
  }, [refNodeName, t])

  if (!nucMuts) {
    return (
      <div className="d-flex w-100 h-100">
        <div className="d-flex m-auto">{t('N/A')}</div>
      </div>
    )
  }

  return (
    <div id={id} className="w-100" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {nucMuts.subs.length}
      <Tooltip isOpen={showTooltip} target={id} wide fullWidth>
        <TableSlim borderless className="mb-1">
          <thead />
          <tbody>
            <tr>
              <th>
                {t('Nucleotide mutations relative to "{{ what }}" ({{ quantity }})', {
                  what: nodeName,
                  quantity: nucMuts?.subs.length,
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
                {t('Aminoacid substitutions relative to "{{ what }}" ({{ quantity }})', {
                  what: nodeName,
                  quantity: aaMuts?.aaSubs.length,
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

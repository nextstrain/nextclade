import React, { useCallback, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { REF_NODE_CLADE_FOUNDER, REF_NODE_PARENT, REF_NODE_ROOT } from 'src/constants'
import { findCladeNodeAttrFounderInfo, getAaMutations, getNucMutations } from 'src/helpers/relativeMuts'
import { currentRefNodeNameAtom } from 'src/state/results.state'
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

  const { index, seqName, refName, nearestNodeName, refNodeSearchResults, cladeFounderInfo, cladeNodeAttrFounderInfo } =
    analysisResult
  const id = getSafeId('mutations-label', { index, seqName })

  const nodeSearchName = useRecoilValue(currentRefNodeNameAtom)
  const nucMuts = getNucMutations(analysisResult, nodeSearchName)
  const aaMuts = getAaMutations(analysisResult, nodeSearchName)

  const { searchNameFriendly, nodeName } = useMemo(() => {
    if (nodeSearchName === REF_NODE_ROOT) {
      return { searchNameFriendly: t('reference'), nodeName: refName }
    }
    if (nodeSearchName === REF_NODE_PARENT) {
      return { searchNameFriendly: t('parent'), nodeName: nearestNodeName }
    }
    if (nodeSearchName === REF_NODE_CLADE_FOUNDER) {
      return { searchNameFriendly: t('clade founder'), nodeName: cladeFounderInfo?.nodeName }
    }
    const cladeNodeAttr = findCladeNodeAttrFounderInfo(cladeNodeAttrFounderInfo, nodeSearchName)
    if (cladeNodeAttr) {
      return {
        searchNameFriendly: t('Founder of {{ attr }}', { attr: cladeNodeAttr.key }),
        nodeName: cladeFounderInfo?.nodeName,
      }
    }
    const nodeName =
      refNodeSearchResults.find((r) => r.search.name === nodeSearchName)?.result?.match?.nodeName ?? t('unknown')
    const searchNameFriendly =
      refNodeSearchResults.find((r) => r.search.name === nodeSearchName)?.search.displayName ?? t('unknown')
    return { searchNameFriendly, nodeName }
  }, [
    nodeSearchName,
    cladeNodeAttrFounderInfo,
    refNodeSearchResults,
    t,
    refName,
    nearestNodeName,
    cladeFounderInfo?.nodeName,
  ])

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
                {t('{{ quantity }} nucleotide mutations relative to "{{ what }}" ("{{ node }}")', {
                  what: searchNameFriendly,
                  node: nodeName,
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
                {t('{{ quantity }} aminoacid mutations relative to "{{ what }}" ("{{ node }}")', {
                  what: searchNameFriendly,
                  node: nodeName,
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

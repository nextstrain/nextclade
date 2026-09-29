import React, { useCallback, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { REF_NODE_CLADE_FOUNDER, REF_NODE_PARENT, REF_NODE_ROOT } from 'src/constants'
import { findCladeNodeAttrFounderInfo, getAaMutations, getNucMutations } from 'src/helpers/relativeMuts'
import { viewedDatasetNameAtom } from 'src/state/dataset.state'
import { currentRefNodeNameAtom, refNodesAtom } from 'src/state/results.state'
import type { ColumnCladeProps } from 'src/components/Results/ColumnClade'
import type { AnalysisResult } from 'src/types'
import { getSafeId } from 'src/helpers/getSafeId'
import { Tooltip } from 'src/components/Results/Tooltip'
import { ListOfNucMuts } from 'src/components/Results/ListOfNucMuts'
import { ListOfAaMuts } from 'src/components/Results/ListOfAaMuts'
import { ListOfMutationsGeneric } from 'src/components/Results/ListOfMutationsGeneric'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { TableSlim } from 'src/components/Common/TableSlim'

const PatternList = styled.div`
  border-top: 1px solid ${(props) => props.theme.gray300};
  margin-top: 0.5rem;
  padding-top: 0.5rem;
`

const PatternSection = styled.section`
  border-top: 1px solid ${(props) => props.theme.gray800};
  margin-top: 0.7rem;
  padding-top: 0.6rem;

  &:first-child {
    border-top: none;
    margin-top: 0;
    padding-top: 0;
  }
`

const PatternName = styled.div`
  font-weight: 700;
`

const PatternDescription = styled.div`
  color: ${(props) => props.theme.gray600};
  font-size: 0.85em;
  margin-bottom: 0.35rem;
`

const PatternSummary = styled.div`
  font-size: 0.85em;
  margin-bottom: 0.25rem;
`

const PatternClusters = styled.div`
  font-size: 0.85em;
`

/** Number of cluster ranges listed before the list is truncated */
const MAX_CLUSTER_RANGES = 16

function MutationPatternsSection({ analysisResult }: { analysisResult: AnalysisResult }) {
  const { t } = useTranslationSafe()
  const patterns = analysisResult.mutationPatterns?.results ?? []

  if (patterns.length === 0) {
    return null
  }

  return (
    <PatternList>
      {patterns.map((pattern) => {
        const typeCounts = pattern.eventTypeCounts
          .map(({ refNuc, qryNuc, count }) => `${refNuc}>${qryNuc}: ${count}`)
          .join(', ')
        const clusterRanges = pattern.clusters
          .slice(0, MAX_CLUSTER_RANGES)
          .map(({ start, end, count }) => `${start + 1}-${end + 1} (${count})`)
          .join(', ')
        return (
          <PatternSection key={pattern.id}>
            <PatternName>{pattern.name || t('Mutation pattern')}</PatternName>
            {pattern.description && <PatternDescription>{pattern.description}</PatternDescription>}

            <PatternSummary>
              {t('{{ n }} private mutations relative to parent match this pattern', { n: pattern.counts.matches })}
              {typeCounts && ` (${typeCounts})`}
            </PatternSummary>

            {pattern.matches.length > 0 && <ListOfMutationsGeneric substitutions={pattern.matches} />}

            {pattern.clusters.length > 0 && (
              <PatternClusters>
                {t('Clusters ({{ n }}): {{ ranges }}', { n: pattern.clusters.length, ranges: clusterRanges })}
                {pattern.clusters.length > MAX_CLUSTER_RANGES && ` ${t('(truncated)')}`}
              </PatternClusters>
            )}
          </PatternSection>
        )
      })}
    </PatternList>
  )
}

export function ColumnMutations({ analysisResult }: ColumnCladeProps) {
  const { t } = useTranslationSafe()
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const { index, seqName, refName, nearestNodeName, refNodeSearchResults, cladeFounderInfo, cladeNodeAttrFounderInfo } =
    analysisResult
  const id = getSafeId('mutations-label', { index, seqName })

  const datasetName = useRecoilValue(viewedDatasetNameAtom)
  const refNodes = useRecoilValue(refNodesAtom({ datasetName }))
  const nodeSearchName = useRecoilValue(currentRefNodeNameAtom({ datasetName }))
  const nucMuts = getNucMutations(analysisResult, nodeSearchName ?? REF_NODE_ROOT)
  const aaMuts = getAaMutations(analysisResult, nodeSearchName ?? REF_NODE_ROOT)

  const { searchNameFriendly, nodeName } = useMemo(() => {
    const builtins = refNodes?.builtins
    if (nodeSearchName === REF_NODE_ROOT) {
      return {
        searchNameFriendly: builtins?.[REF_NODE_ROOT]?.displayName ?? t('reference'),
        nodeName: refName,
      }
    }
    if (nodeSearchName === REF_NODE_PARENT) {
      return {
        searchNameFriendly: builtins?.[REF_NODE_PARENT]?.displayName ?? t('parent'),
        nodeName: nearestNodeName,
      }
    }
    if (nodeSearchName === REF_NODE_CLADE_FOUNDER) {
      return {
        searchNameFriendly: builtins?.[REF_NODE_CLADE_FOUNDER]?.displayName ?? t('clade founder'),
        nodeName: cladeFounderInfo?.nodeName,
      }
    }
    const cladeNodeAttr = findCladeNodeAttrFounderInfo(cladeNodeAttrFounderInfo, nodeSearchName ?? REF_NODE_ROOT)
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
    refNodes?.builtins,
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
                <ListOfAaMuts analysisResult={analysisResult} />
              </td>
            </tr>
          </tbody>
        </TableSlim>

        {nodeSearchName === REF_NODE_PARENT && <MutationPatternsSection analysisResult={analysisResult} />}
      </Tooltip>
    </div>
  )
}

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
import { NucleotideMutationBadge } from 'src/components/Common/MutationBadge'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { TableSlim } from 'src/components/Common/TableSlim'
import type { MutationPatternEventMatch } from 'src/gen/_SchemaRoot'

const PatternList = styled.div`
  border-top: 1px solid #dee2e6;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
`

const PatternSection = styled.section`
  border-top: 1px solid #343a40;
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

const ClusterCard = styled.div`
  background: rgba(255, 140, 0, 0.06);
  border: 1px solid rgba(255, 140, 0, 0.2);
  border-radius: 3px;
  padding: 0.25rem 0.4rem;

  &:not(:last-child) {
    margin-bottom: 0.35rem;
  }
`

const ClusterTitle = styled.div`
  font-weight: 700;
  font-size: 0.85em;
  margin-bottom: 2px;
`

const ClusterBadgeGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
`

function MutationPatternsSection({ analysisResult }: { analysisResult: AnalysisResult }) {
  const { t } = useTranslationSafe()
  const { mutationPatterns, privateNucMutations } = analysisResult

  if (!mutationPatterns?.results?.length || privateNucMutations.privateSubstitutions.length === 0) {
    return null
  }

  const visiblePatterns = mutationPatterns.results.filter((pattern) => pattern.clusters.length > 0)

  if (visiblePatterns.length === 0) {
    return null
  }

  return (
    <PatternList>
      {visiblePatterns.map((pattern) => (
        <PatternSection key={pattern.id}>
          <PatternName>{pattern.name || t('Mutation pattern')}</PatternName>
          {pattern.description && <PatternDescription>{pattern.description}</PatternDescription>}

          {pattern.clusters.map((cluster) => (
            <ClusterCard key={`${cluster.start}-${cluster.end}`}>
              <ClusterTitle>
                {t('{{start}}-{{end}} ({{count}} events)', {
                  start: cluster.start + 1,
                  end: cluster.end + 1,
                  count: cluster.count,
                })}
              </ClusterTitle>
              <ClusterBadgeGrid>
                {cluster.events.map((event) => (
                  <MutationPatternEventBadge key={mutationPatternEventKey(event)} event={event} />
                ))}
              </ClusterBadgeGrid>
            </ClusterCard>
          ))}
        </PatternSection>
      ))}
    </PatternList>
  )
}

function MutationPatternEventBadge({ event }: { event: MutationPatternEventMatch }) {
  switch (event.type) {
    case 'nucSubstitution':
      return <NucleotideMutationBadge mutation={event} />
  }
}

function mutationPatternEventKey(event: MutationPatternEventMatch): string {
  switch (event.type) {
    case 'nucSubstitution':
      return `${event.type}:${event.pos}:${event.refNuc}:${event.qryNuc}`
  }
  throw new Error(`Unknown mutation pattern event type: ${event.type}`)
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

        <MutationPatternsSection analysisResult={analysisResult} />
      </Tooltip>
    </div>
  )
}

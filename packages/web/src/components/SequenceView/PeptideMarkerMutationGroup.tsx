import React, { SVGProps, useState } from 'react'

import { useTranslation } from 'react-i18next'
import { Row, Col } from 'reactstrap'
import { connect } from 'react-redux'

import { AA_MIN_WIDTH_PX } from 'src/constants'

import type { Gene } from 'src/algorithms/types'
import type { State } from 'src/state/reducer'
import { selectGeneMap } from 'src/state/algorithm/algorithm.selectors'
import { getAminoacidColor } from 'src/helpers/getAminoacidColor'
import { formatRange } from 'src/helpers/formatRange'
import { getSafeId } from 'src/helpers/getSafeId'
import type { AminoacidChange, AminoacidChangesGroup } from 'src/components/SequenceView/groupAdjacentAminoacidChanges'
import { AminoacidMutationBadge, NucleotideMutationBadge } from 'src/components/Common/MutationBadge'
import { TableSlim } from 'src/components/Common/TableSlim'
import { Tooltip } from 'src/components/Results/Tooltip'
import { PeptideContext } from './PeptideContext'

export interface PeptideMarkerMutationProps {
  change: AminoacidChange
  parentGroup: AminoacidChangesGroup
  pixelsPerAa: number
}

export function PeptideMarkerMutation({ change, parentGroup, pixelsPerAa, ...restProps }: PeptideMarkerMutationProps) {
  const { codon, queryAA } = change
  const { codonAaRange } = parentGroup

  const pos = codon - codonAaRange.begin
  const x = pos * pixelsPerAa
  const fill = getAminoacidColor(queryAA)

  return <rect fill={fill} stroke="#777a" strokeWidth={0.5} x={x} width={pixelsPerAa} height="30" {...restProps} />
}

export interface PeptideMarkerMutationGroupProps extends SVGProps<SVGSVGElement> {
  seqName: string
  group: AminoacidChangesGroup
  pixelsPerAa: number
  geneMap?: Gene[]
}

const mapStateToProps = (state: State) => ({
  geneMap: selectGeneMap(state),
})

const mapDispatchToProps = {}

function PeptideMarkerMutationGroupDisconnected({
  seqName,
  group,
  pixelsPerAa,
  geneMap,
  ...restProps
}: PeptideMarkerMutationGroupProps) {
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)

  const { gene, changes, codonAaRange, nucSubstitutions, nucDeletions } = group
  const id = getSafeId('aa-mutation-group-marker', { seqName, gene, begin: codonAaRange.begin })
  const minWidth = (AA_MIN_WIDTH_PX * 6) / (5 + changes.length)
  const pixelsPerAaAdjusted = Math.max(minWidth, pixelsPerAa)
  const width = changes.length * Math.max(pixelsPerAaAdjusted, pixelsPerAa)
  const x = codonAaRange.begin * pixelsPerAa - pixelsPerAaAdjusted / 2

  let changesHead = changes
  let changesTail: typeof changes = []
  if (changes.length > 6) {
    changesHead = changes.slice(0, 3)
    changesTail = changes.slice(-3)
  }

  const totalNucChanges = nucSubstitutions.length + nucDeletions.length

  return (
    <g id={id}>
      <rect fill="#999a" x={x - 0.5} y={-10} width={width + 1} stroke="#aaaa" strokeWidth={0.5} height={32} />
      <svg x={x} y={-9.5} height={29} {...restProps}>
        <g onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
          {changes.map((change) => (
            <PeptideMarkerMutation
              key={change.codon}
              change={change}
              parentGroup={group}
              pixelsPerAa={pixelsPerAaAdjusted}
            />
          ))}

          <Tooltip target={id} isOpen={showTooltip} wide fullWidth>
            <TableSlim borderless className="mb-1">
              <thead />
              <tbody>
                <tr>
                  <td colSpan={2}>
                    <h5>{seqName}</h5>
                  </td>
                </tr>

                <tr className="mb-2">
                  <td colSpan={2}>
                    <h6>{t('Aminoacid changes ({{count}})', { count: changes.length })}</h6>
                  </td>
                </tr>

                <>
                  {changesHead.map((change) => (
                    <tr key={change.codon}>
                      <td>{change.type === 'substitution' ? t('Substitution') : t('Deletion')}</td>
                      <td>
                        <AminoacidMutationBadge mutation={change} geneMap={geneMap ?? []} />
                      </td>
                    </tr>
                  ))}
                </>

                {changesTail.length > 0 && (
                  <tr>
                    <td>{'...'}</td>
                    <td>{'...'}</td>
                  </tr>
                )}

                <>
                  {changesTail.length > 0 &&
                    changesTail.map((change) => (
                      <tr key={change.codon}>
                        <td>{change.type === 'substitution' ? t('Substitution') : t('Deletion')}</td>
                        <td>
                          <AminoacidMutationBadge mutation={change} geneMap={geneMap ?? []} />
                        </td>
                      </tr>
                    ))}
                </>

                {totalNucChanges > 0 && (
                  <tr>
                    <td colSpan={2}>
                      <h6 className="mt-3">{t('Nucleotide changes nearby ({{count}})', { count: totalNucChanges })}</h6>
                    </td>
                  </tr>
                )}

                <>
                  {nucSubstitutions.map((mut) => (
                    <tr key={mut.pos}>
                      <td>{t('Substitution')}</td>
                      <td>{<NucleotideMutationBadge mutation={mut} />}</td>
                    </tr>
                  ))}
                </>

                <>
                  {nucDeletions.map((del) => (
                    <tr key={del.start}>
                      <td>{t('Deletion')}</td>
                      <td>{formatRange(del.start, del.start + del.length)}</td>
                    </tr>
                  ))}
                </>

                <tr>
                  <td colSpan={2}>
                    <Row noGutters className="mt-3">
                      <Col>
                        <h6>{'Context'}</h6>
                      </Col>
                    </Row>

                    <Row noGutters>
                      <Col>
                        <PeptideContext group={group} />
                      </Col>
                    </Row>
                  </td>
                </tr>
              </tbody>
            </TableSlim>
          </Tooltip>
        </g>
      </svg>
    </g>
  )
}

export const PeptideMarkerMutationGroupUnmemoed = connect(
  mapStateToProps,
  mapDispatchToProps,
)(PeptideMarkerMutationGroupDisconnected)

export const PeptideMarkerMutationGroup = React.memo(PeptideMarkerMutationGroupUnmemoed)

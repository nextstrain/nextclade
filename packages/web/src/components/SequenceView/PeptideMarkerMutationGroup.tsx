import React, { SVGProps, useState } from 'react'

import { useTranslation } from 'react-i18next'
import { Row, Col, Table as ReactstrapTable } from 'reactstrap'
import styled from 'styled-components'
import { connect } from 'react-redux'

import { AA_MIN_WIDTH_PX } from 'src/constants'

import type { Gene } from 'src/algorithms/types'
import type { State } from 'src/state/reducer'
import { selectGeneMap } from 'src/state/algorithm/algorithm.selectors'
import { getAminoacidColor } from 'src/helpers/getAminoacidColor'
import { getSafeId } from 'src/helpers/getSafeId'
import type { AminoacidChange, AminoacidChangesGroup } from 'src/components/SequenceView/groupAdjacentAminoacidChanges'
import { AminoacidMutationBadge } from 'src/components/Common/MutationBadge'
import { Tooltip } from 'src/components/Results/Tooltip'
import { PeptideContext } from './PeptideContext'

export const Table = styled(ReactstrapTable)`
  & td {
    padding: 0 0.5rem;
  }

  & tr {
    margin: 0;
    padding: 0;
  }
`

export interface PeptideMarkerMutationProps {
  change: AminoacidChange
  parentGroup: AminoacidChangesGroup
  pixelsPerAa: number
}

export function PeptideMarkerMutation({ change, parentGroup, pixelsPerAa, ...restProps }: PeptideMarkerMutationProps) {
  const { codon, queryAA } = change
  const { codonAaRange } = parentGroup

  const pos = codon - codonAaRange.begin
  const x = pos * Math.max(AA_MIN_WIDTH_PX, pixelsPerAa)
  const width = Math.max(AA_MIN_WIDTH_PX, pixelsPerAa)
  const fill = getAminoacidColor(queryAA)

  return <rect fill={fill} stroke="#777a" strokeWidth={0.5} x={x} width={width} height="30" {...restProps} />
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

  const { gene, changes, codonAaRange } = group
  const id = getSafeId('aa-mutation-group-marker', { seqName, gene, begin: codonAaRange.begin })
  const x = codonAaRange.begin * pixelsPerAa
  const width = changes.length * Math.max(AA_MIN_WIDTH_PX, pixelsPerAa)

  return (
    <g id={id}>
      <rect fill="#999a" x={x - 0.5} y={-10} width={width + 1} stroke="#aaaa" strokeWidth={0.5} height={32} />
      <svg x={x} y={-9.5} height={29} {...restProps}>
        <g onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
          {changes.map((change) => (
            <PeptideMarkerMutation key={change.codon} change={change} parentGroup={group} pixelsPerAa={pixelsPerAa} />
          ))}

          <Tooltip target={id} isOpen={showTooltip} wide fullWidth>
            <Table borderless className="mb-1">
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
                  {changes.map((change) => (
                    <tr key={change.codon}>
                      <td>{change.type === 'substitution' ? t('Substitution') : t('Deletion')}</td>
                      <td>
                        <AminoacidMutationBadge mutation={change} geneMap={geneMap ?? []} />
                      </td>
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
            </Table>
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

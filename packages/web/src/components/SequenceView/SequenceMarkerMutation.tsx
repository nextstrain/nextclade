import React, { SVGProps, useState } from 'react'

import { useTranslation } from 'react-i18next'
import { Row, Col, Table as ReactstrapTable } from 'reactstrap'
import styled from 'styled-components'
import { connect } from 'react-redux'

import { BASE_MIN_WIDTH_PX } from 'src/constants'

import type { Gene, NucleotideSubstitution } from 'src/algorithms/types'
import type { State } from 'src/state/reducer'

import { selectGeneMap } from 'src/state/algorithm/algorithm.selectors'

import { getNucleotideColor } from 'src/helpers/getNucleotideColor'
import { formatMutation } from 'src/helpers/formatMutation'

import { Tooltip } from 'src/components/Results/Tooltip'
import { getSafeId } from 'src/helpers/getSafeId'
import { ListOfPcrPrimersChanged } from 'src/components/SequenceView/ListOfPcrPrimersChanged'
import { AminoacidMutationBadge } from 'src/components/Common/MutationBadge'

export const Table = styled(ReactstrapTable)`
  & td {
    padding: 0 0.5rem;
  }

  & tr {
    margin: 0;
    padding: 0;
  }
`

export interface SequenceMarkerMutationProps extends SVGProps<SVGRectElement> {
  seqName: string
  substitution: NucleotideSubstitution
  pixelsPerBase: number
  geneMap?: Gene[]
}

const mapStateToProps = (state: State) => ({
  geneMap: selectGeneMap(state),
})

const mapDispatchToProps = {}

export const SequenceMarkerMutationUnmemoed = connect(
  mapStateToProps,
  mapDispatchToProps,
)(SequenceMarkerMutationDisconnected)

function SequenceMarkerMutationDisconnected({
  seqName,
  substitution,
  pixelsPerBase,
  geneMap,
  ...rest
}: SequenceMarkerMutationProps) {
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)

  if (!geneMap) {
    return null
  }

  const { pos, queryNuc, aaSubstitutions, aaDeletions, pcrPrimersChanged } = substitution
  const id = getSafeId('mutation-marker', { seqName, ...substitution })

  const mut = formatMutation(substitution)

  const fill = getNucleotideColor(queryNuc)
  const x = pos * pixelsPerBase
  const width = Math.max(BASE_MIN_WIDTH_PX, pixelsPerBase)

  const totalAaChanges = aaSubstitutions.length + aaDeletions.length

  return (
    <rect
      id={id}
      fill={fill}
      x={x}
      y={-10}
      width={width}
      height="30"
      {...rest}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Tooltip target={id} isOpen={showTooltip} fullWidth>
        <Table borderless className="mb-1">
          <thead />
          <tbody>
            <tr>
              <td colSpan={2}>
                <h6>{t('Nucleotide substitution: {{mutation}}', { mutation: mut })}</h6>
              </td>
            </tr>

            {totalAaChanges > 0 && (
              <tr>
                <td colSpan={2}>
                  <h6 className="mt-1">{t('Aminoacid changes nearby:')}</h6>
                </td>
              </tr>
            )}

            <>
              {aaSubstitutions.map((mut) => (
                <tr key={mut.codon}>
                  <td>{t('Aminoacid substitution')}</td>
                  <td>
                    <AminoacidMutationBadge mutation={mut} geneMap={geneMap} />
                  </td>
                </tr>
              ))}
            </>

            <>
              {aaDeletions.map((del) => (
                <tr key={del.queryContext}>
                  <td>{t('Aminoacid deletion')}</td>
                  <td>
                    <AminoacidMutationBadge mutation={del} geneMap={geneMap} />
                  </td>
                </tr>
              ))}
            </>

            <tr>
              <td colSpan={2}>
                {pcrPrimersChanged.length > 0 && (
                  <Row noGutters>
                    <Col>
                      <ListOfPcrPrimersChanged pcrPrimersChanged={pcrPrimersChanged} />
                    </Col>
                  </Row>
                )}
              </td>
            </tr>
          </tbody>
        </Table>
      </Tooltip>
    </rect>
  )
}

export const SequenceMarkerMutation = React.memo(SequenceMarkerMutationUnmemoed)

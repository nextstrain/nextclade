import React, { SVGProps, useState } from 'react'

import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'

import { BASE_MIN_WIDTH_PX } from 'src/constants'

import type { FrameShift, Gene } from 'src/algorithms/types'
import type { State } from 'src/state/reducer'
import { selectGeneMap } from 'src/state/algorithm/algorithm.selectors'

import { Tooltip } from 'src/components/Results/Tooltip'
import { TableSlim } from 'src/components/Common/TableSlim'
import { formatRange } from 'src/helpers/formatRange'
import { getSafeId } from 'src/helpers/getSafeId'

const frameShiftColor = '#eb0d2a'
const frameShiftBorderColor = '#ffff00'

export interface PeptideMarkerFrameShiftProps extends SVGProps<SVGRectElement> {
  seqName: string
  frameShift: FrameShift
  pixelsPerAa: number
  geneMap?: Gene[]
}

const mapStateToProps = (state: State) => ({
  geneMap: selectGeneMap(state),
})

const mapDispatchToProps = {}

export const PeptideMarkerFrameShiftUnmemoed = connect(
  mapStateToProps,
  mapDispatchToProps,
)(PeptideMarkerFrameShiftDisconnected)

function PeptideMarkerFrameShiftDisconnected({
  seqName,
  frameShift,
  pixelsPerAa,
  geneMap,
  ...rest
}: PeptideMarkerFrameShiftProps) {
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)

  if (!geneMap) {
    return null
  }

  const { geneName, nucAbs, codon } = frameShift
  const id = getSafeId('frame-shift-aa-marker', { seqName, ...frameShift })

  const gene = geneMap.find((gene) => geneName === gene.geneName)
  if (!gene) {
    return null
  }

  const nucLength = nucAbs.end - nucAbs.begin
  const codonLength = codon.end - codon.begin

  const x = codon.begin * pixelsPerAa
  let width = codonLength * pixelsPerAa
  width = Math.max(width, BASE_MIN_WIDTH_PX)

  const codonRangeStr = formatRange(codon.begin, codon.end)
  const nucRangeStr = formatRange(nucAbs.begin, nucAbs.end)

  return (
    <g id={id}>
      <rect
        fill={frameShiftBorderColor}
        x={x - 1}
        y={1.75}
        width={width + 2}
        stroke={frameShiftBorderColor}
        strokeWidth={0.5}
        height={7}
      />
      <rect
        id={id}
        fill={frameShiftColor}
        x={x}
        y={2.5}
        width={width}
        height="5"
        {...rest}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Tooltip target={id} isOpen={showTooltip} fullWidth>
          <h5>{t('Frame shift')}</h5>

          <TableSlim borderless className="mb-1">
            <thead />
            <tbody>
              <tr>
                <td>{t('Nucleotide range')}</td>
                <td>{nucRangeStr}</td>
              </tr>

              <tr>
                <td>{t('Nucleotide length')}</td>
                <td>{nucLength}</td>
              </tr>

              <tr>
                <td>{t('Gene')}</td>
                <td>{geneName}</td>
              </tr>

              <tr>
                <td>{t('Codon range')}</td>
                <td>{codonRangeStr}</td>
              </tr>

              <tr>
                <td>{t('Codon length')}</td>
                <td>{codonLength}</td>
              </tr>
            </tbody>
          </TableSlim>
        </Tooltip>
      </rect>
    </g>
  )
}

export const PeptideMarkerFrameShift = React.memo(PeptideMarkerFrameShiftUnmemoed)

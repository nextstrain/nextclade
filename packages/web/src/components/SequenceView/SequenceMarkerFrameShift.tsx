import React, { SVGProps, useState } from 'react'

import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'

import { BASE_MIN_WIDTH_PX } from 'src/constants'

import type { FrameShiftResult, Gene } from 'src/algorithms/types'
import type { State } from 'src/state/reducer'
import { selectGeneMap } from 'src/state/algorithm/algorithm.selectors'

import { Tooltip } from 'src/components/Results/Tooltip'
import { TableSlim } from 'src/components/Common/TableSlim'
import { formatRange } from 'src/helpers/formatRange'
import { getSafeId } from 'src/helpers/getSafeId'

const frameShiftColor = '#eb0d2a'
const frameShiftBorderColor = '#ffff00'

export interface MissingViewProps extends SVGProps<SVGRectElement> {
  seqName: string
  frameShift: FrameShiftResult
  pixelsPerBase: number
  geneMap?: Gene[]
}

const mapStateToProps = (state: State) => ({
  geneMap: selectGeneMap(state),
})

const mapDispatchToProps = {}

export const SequenceMarkerFrameShiftUnmemoed = connect(
  mapStateToProps,
  mapDispatchToProps,
)(SequenceMarkerFrameShiftDisconnected)

function SequenceMarkerFrameShiftDisconnected({
  seqName,
  frameShift,
  pixelsPerBase,
  geneMap,
  ...rest
}: MissingViewProps) {
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)

  if (!geneMap) {
    return null
  }

  const {
    geneName,
    frameShiftRange: { begin: beginRel, end: endRel },
  } = frameShift
  const id = getSafeId('frame-shift-marker', { seqName, ...frameShift })

  const gene = geneMap.find((gene) => geneName === gene.geneName)
  if (!gene) {
    return null
  }

  const begin = gene.start + beginRel
  const end = gene.start + endRel
  const length = endRel - beginRel

  const x = begin * pixelsPerBase
  let width = (end - begin) * pixelsPerBase
  width = Math.max(width, BASE_MIN_WIDTH_PX)

  const rangeStr = formatRange(begin, end)

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
                <td>{t('Gene')}</td>
                <td>{geneName}</td>
              </tr>

              <tr>
                <td>{t('Nucleotide range')}</td>
                <td>{rangeStr}</td>
              </tr>

              <tr>
                <td>{t('Length')}</td>
                <td>{length}</td>
              </tr>
            </tbody>
          </TableSlim>
        </Tooltip>
      </rect>
    </g>
  )
}

export const SequenceMarkerFrameShift = React.memo(SequenceMarkerFrameShiftUnmemoed)

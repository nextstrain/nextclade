import React, { SVGProps, useCallback, useMemo, useState } from 'react'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import { useRecoilValue } from 'recoil'
import { viewedDatasetNameAtom } from 'src/state/dataset.state'
import type { FrameShift, Range } from 'src/types'
import { TableRowSpacer, TableSlim } from 'src/components/Common/TableSlim'
import { Tooltip } from 'src/components/Results/Tooltip'
import { BASE_MIN_WIDTH_PX } from 'src/constants'
import { formatRange, formatRangeMaybeEmpty } from 'src/helpers/formatRange'
import { getSafeId } from 'src/helpers/getSafeId'
import { SeqMarkerState, seqMarkerFrameShiftStateAtom } from 'src/state/seqViewSettings.state'
import { cdsAtom } from 'src/state/results.state'

const frameShiftColor = '#eb0d2a'
const frameShiftBorderColor = '#ffff00'

export interface FrameShiftMarkerProps extends SVGProps<SVGRectElement> {
  index: number
  seqName: string
  frameShift: FrameShift
  pixelsPerBase: number
}

export const SequenceMarkerFrameShift = React.memo(SequenceMarkerFrameShiftUnmemoed)

function SequenceMarkerFrameShiftUnmemoed({ index, seqName, frameShift, pixelsPerBase }: FrameShiftMarkerProps) {
  const { cdsName, nucAbs, codon, gapsTrailing, gapsLeading } = frameShift

  const frameShiftSegments = useMemo(
    () =>
      nucAbs.map((nucAbs) => {
        const id = getSafeId('frame-shift-nuc-marker', {
          index,
          seqName,
          codon,
          nucAbs,
          gapsTrailing,
          gapsLeading,
          pixelsPerBase,
        })

        return (
          <SequenceMarkerFrameShiftSegment
            key={id}
            identifier={id}
            index={index}
            cdsName={cdsName}
            codon={codon}
            nucAbs={nucAbs}
            gapsTrailing={gapsTrailing}
            gapsLeading={gapsLeading}
            pixelsPerBase={pixelsPerBase}
          />
        )
      }),
    [codon, gapsLeading, gapsTrailing, cdsName, index, nucAbs, pixelsPerBase, seqName],
  )

  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{frameShiftSegments}</>
}

export interface FrameShiftMarkerSegmentProps extends SVGProps<SVGRectElement> {
  identifier: string
  index: number
  cdsName: string
  codon: Range
  nucAbs: Range
  gapsTrailing: Range
  gapsLeading: Range
  pixelsPerBase: number
}

function SequenceMarkerFrameShiftSegment({
  identifier,
  cdsName,
  codon,
  nucAbs,
  gapsTrailing,
  gapsLeading,
  pixelsPerBase,
}: FrameShiftMarkerSegmentProps) {
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const seqMarkerFrameShiftState = useRecoilValue(seqMarkerFrameShiftStateAtom)
  const datasetName = useRecoilValue(viewedDatasetNameAtom)
  const cds = useRecoilValue(cdsAtom({ datasetName, cdsName }))
  if (!cds || seqMarkerFrameShiftState === SeqMarkerState.Off) {
    return null
  }

  const nucLength = nucAbs.end - nucAbs.begin
  const codonLength = codon.end - codon.begin

  let width = nucLength * pixelsPerBase
  width = Math.max(width, BASE_MIN_WIDTH_PX)
  const halfNuc = Math.max(pixelsPerBase, BASE_MIN_WIDTH_PX) / 2 // Anchor on the center of the first nuc
  const x = nucAbs.begin * pixelsPerBase - halfNuc

  const codonRangeStr = formatRange(codon)
  const nucRangeStr = formatRange(nucAbs)

  return (
    <g>
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
        id={identifier}
        fill={frameShiftColor}
        x={x}
        y={2.5}
        width={width}
        height="5"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <Tooltip target={identifier} isOpen={showTooltip} fullWidth>
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
                <td>{cdsName}</td>
              </tr>

              <tr>
                <td>{t('Codon range')}</td>
                <td>{codonRangeStr}</td>
              </tr>

              <tr className="pb-3">
                <td>{t('Codon length')}</td>
                <td>{codonLength}</td>
              </tr>

              <TableRowSpacer />

              <tr>
                <td>{t('Leading deleted codon range')}</td>
                <td>{formatRangeMaybeEmpty(gapsLeading)}</td>
              </tr>

              <tr>
                <td>{t('Trailing deleted codon range')}</td>
                <td>{formatRangeMaybeEmpty(gapsTrailing)}</td>
              </tr>
            </tbody>
          </TableSlim>
        </Tooltip>
      </rect>
    </g>
  )
}

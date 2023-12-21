import { groupBy, isEmpty, isNil } from 'lodash'
import { transparentize } from 'polished'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ReactResizeDetectorDimensions, withResizeDetector } from 'react-resize-detector'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { isInNucleotideViewAtom, viewedCdsAtom } from 'src/state/seqViewSettings.state'
import styled from 'styled-components'
import { BASE_MIN_WIDTH_PX } from 'src/constants'
import type { Cds, CdsSegment } from 'src/types'
import { cdsSegmentAaLength, cdsSegmentNucLength, rangeLen } from 'src/types'
import { cdsesAtom, genomeSizeAtom } from 'src/state/results.state'
import { Tooltip } from 'src/components/Results/Tooltip'
import { formatCodonLength, formatRange } from 'src/helpers/formatRange'
import { getSafeId } from 'src/helpers/getSafeId'
import { getAxisLength } from 'src/components/GeneMap/getAxisLength'
import { TableSlim } from 'src/components/Common/TableSlim'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { ColoredSquare } from 'src/components/Common/ColoredSquare'

const GENE_MAP_MARGIN = 5
const GENE_HEIGHT_PX = 15
const GENE_STRAND_SPACING = 10

export function getGeneMapDimensions(cdsSegments: CdsSegment[], isGlobal: boolean) {
  const frames = Object.keys(groupBy(cdsSegments, (cdsSeg) => (isGlobal ? cdsSeg.frame : cdsSeg.phase)))
  const hasFrames = frames.length > 1

  const strands = Object.keys(groupBy(cdsSegments, (cdsSeg) => cdsSeg.strand))
  const hasStrands = strands.length > 1

  const geneFrameOffset = GENE_HEIGHT_PX / 2
  let geneStrandOffset = geneFrameOffset * 3

  let geneMapHeight = GENE_MAP_MARGIN + GENE_HEIGHT_PX
  if (hasFrames && hasStrands) {
    geneMapHeight += geneFrameOffset * 3 + geneStrandOffset + GENE_STRAND_SPACING
    geneStrandOffset += GENE_STRAND_SPACING
  } else if (hasStrands) {
    geneMapHeight += geneStrandOffset + GENE_STRAND_SPACING
  } else if (hasFrames) {
    geneMapHeight += geneFrameOffset * 3
  } else {
    geneMapHeight += geneFrameOffset * 3
  }

  return {
    geneFrameOffset,
    geneStrandOffset,
    geneMapHeight,
  }
}

export const GeneMapWrapper = styled.div<{ $height: number }>`
  display: flex;
  width: 100%;
  height: ${(props) => props.$height}px;
  padding: 0;
  margin: 0 auto;
`

export const GeneMapSVG = styled.svg`
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0 auto;
`

export interface CdsSegmentViewProps {
  cds: Cds
  segIndex: number
  cdsSeg: CdsSegment
  pixelsPerBase: number
  global: boolean
  geneFrameOffset: number
  geneStrandOffset: number
}

export function CdsSegmentView({
  cds,
  segIndex,
  cdsSeg,
  pixelsPerBase,
  global,
  geneFrameOffset,
  geneStrandOffset,
}: CdsSegmentViewProps) {
  const { t } = useTranslationSafe()
  const [showTooltip, setShowTooltip] = useState(false)

  const setViewedGene = useSetRecoilState(viewedCdsAtom)

  const [hovered, setHovered] = useState(false)
  const [timeoutId, setTimeoutId] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (!hovered && timeoutId) {
      clearInterval(timeoutId)
    }
  }, [hovered, timeoutId])

  const setHoveredSmart = useCallback(
    (value: boolean) => {
      let timeout
      if (value) {
        setHovered(true)
        timeout = setInterval(() => {
          setShowTooltip(true)
        }, 500)

        setTimeoutId(timeout as unknown as number)
      } else {
        setHovered(false)
        setShowTooltip(false)
      }
    },
    [setHovered, setShowTooltip],
  )

  const openTooltip = useCallback(() => setHoveredSmart(true), [setHoveredSmart])
  const closeTooltip = useCallback(() => setHoveredSmart(false), [setHoveredSmart])

  const { name, color, range, rangeLocal, frame, phase, strand } = cdsSeg
  const lengthNucsOrCodons = global ? cdsSegmentNucLength(cdsSeg) : cdsSegmentAaLength(cdsSeg)
  const width = Math.max(BASE_MIN_WIDTH_PX, lengthNucsOrCodons * pixelsPerBase) - 1 // `-1` to make border visible
  const x = (global ? range.begin : rangeLocal.begin / 3) * pixelsPerBase + 1 // `+1 to make border visible`

  const id = getSafeId('cds-segment', { ...cdsSeg })
  const stroke = hovered ? '#000' : '#555'

  const frameOrPhase = global ? frame : phase
  let y = geneFrameOffset * frameOrPhase
  if (strand === '-') {
    y += geneStrandOffset
  }

  const onClick = useCallback(() => {
    clearInterval(timeoutId)
    setHovered(false)
    setViewedGene(name)
  }, [name, setViewedGene, timeoutId])

  return (
    <rect
      id={id}
      fill={transparentize(0.5)(color ?? '#999')}
      x={x}
      y={y}
      width={width}
      height={GENE_HEIGHT_PX}
      onMouseEnter={openTooltip}
      onMouseLeave={closeTooltip}
      onClick={onClick}
      stroke={stroke}
      strokeWidth={1}
      cursor="pointer"
    >
      <Tooltip target={id} isOpen={showTooltip} onClick={closeTooltip} wide>
        <TableSlim borderless>
          <tbody>
            <tr>
              <td>{'CDS'}</td>
              <td className="d-flex">
                <ColoredSquare color={cds.color ?? '#999'} size="1rem" />
                <span className="ml-2">{cds.name}</span>
              </td>
            </tr>

            <tr>
              <td>{t('{{cds}} fragment:', { cds: 'CDS' })}</td>
              <td>{`${segIndex + 1} of ${cds.segments.length}`}</td>
            </tr>

            <tr>
              <td>{t('Strand:')}</td>
              <td>{strand}</td>
            </tr>

            <tr>
              <td>{t('Global nuc. range')}</td>
              <td>{formatRange(range)}</td>
            </tr>

            <tr>
              <td>{t('Local nuc. range')}</td>
              <td>{formatRange(rangeLocal)}</td>
            </tr>

            <tr>
              <td>{t('Length (nuc)')}</td>
              <td>{rangeLen(range)}</td>
            </tr>

            <tr>
              <td>{t('Length (AA)')}</td>
              <td>{formatCodonLength(rangeLen(range))}</td>
            </tr>

            <tr>
              <td>{t('Phase')}</td>
              <td>{phase + 1}</td>
            </tr>

            <tr>
              <td>{t('Frame')}</td>
              <td>{frame + 1}</td>
            </tr>

            {cds.exceptions.length > 0 && (
              <tr>
                <td>{t('Notes')}</td>
                <td>{cds.exceptions}</td>
              </tr>
            )}
          </tbody>
        </TableSlim>
      </Tooltip>
    </rect>
  )
}

export type GeneMapProps = ReactResizeDetectorDimensions

export function GeneMapUnsized({ width = 0, height = 0 }: GeneMapProps) {
  const cdsesAll = useRecoilValue(cdsesAtom)
  const genomeSize = useRecoilValue(genomeSizeAtom)
  const viewedGene = useRecoilValue(viewedCdsAtom)
  const isInNucView = useRecoilValue(isInNucleotideViewAtom)

  const svgConfig = useMemo(() => {
    const cdses = isInNucView ? cdsesAll : cdsesAll.filter((cds) => cds.name === viewedGene)
    if (isEmpty(cdses)) {
      return undefined
    }

    const length = getAxisLength(genomeSize, viewedGene, cdses)
    const pixelsPerBase = width / length
    const cdsSegments = cdses.flatMap((cds) => cds.segments)
    const { geneFrameOffset, geneStrandOffset, geneMapHeight } = getGeneMapDimensions(cdsSegments, isInNucView)
    const viewBox = `0 ${-GENE_MAP_MARGIN} ${width} ${geneMapHeight}`

    const cdsSegViews = cdses.map((cds) =>
      cds.segments.map((cdsSeg, segIndex) => {
        return (
          <CdsSegmentView
            key={getSafeId('cds-segment', { ...cdsSeg })}
            cds={cds}
            segIndex={segIndex}
            cdsSeg={cdsSeg}
            global={isInNucView}
            pixelsPerBase={pixelsPerBase}
            geneFrameOffset={geneFrameOffset}
            geneStrandOffset={geneStrandOffset}
          />
        )
      }),
    )

    return { viewBox, cdsSegViews, geneMapHeight }
  }, [cdsesAll, genomeSize, isInNucView, viewedGene, width])

  if (!width || !height || isNil(svgConfig)) {
    return (
      <GeneMapWrapper $height={1}>
        <GeneMapSVG viewBox={`0 0 50 50`} />
      </GeneMapWrapper>
    )
  }

  const { viewBox, cdsSegViews, geneMapHeight } = svgConfig

  return (
    <GeneMapWrapper $height={geneMapHeight}>
      <GeneMapSVG viewBox={viewBox}>{cdsSegViews}</GeneMapSVG>
    </GeneMapWrapper>
  )
}

export const GeneMap = withResizeDetector(GeneMapUnsized, { handleWidth: true, handleHeight: true })

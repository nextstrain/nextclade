import { groupBy } from 'lodash'
import React, { SVGProps, useCallback, useEffect, useMemo, useState } from 'react'
import { ReactResizeDetectorDimensions, withResizeDetector } from 'react-resize-detector'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { geneLength } from 'src/algorithms/types'
import styled from 'styled-components'

import { BASE_MIN_WIDTH_PX, GENE_OPTION_NUC_SEQUENCE } from 'src/constants'
import type { Gene } from 'src/algorithms/types'
import { Tooltip } from 'src/components/Results/Tooltip'
import { formatRange } from 'src/helpers/formatRange'
import { getSafeId } from 'src/helpers/getSafeId'
import { getAxisLength } from 'src/components/GeneMap/getAxisLength'
import { TableSlim } from 'src/components/Common/TableSlim'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { ColoredSquare } from 'src/components/Common/ColoredSquare'
import { geneMapAtom, genomeSizeAtom } from 'src/state/results.state'
import { viewedGeneAtom } from 'src/state/settings.state'

const GENE_MAP_MARGIN = 5
const GENE_HEIGHT_PX = 15
const GENE_STRAND_SPACING = 10

export function getGeneMapDimensions(genes: Gene[]) {
  const frames = Object.keys(groupBy(genes, (gene) => gene.frame))
  const hasFrames = frames.length > 1

  const strands = Object.keys(groupBy(genes, (gene) => gene.strand))
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

export interface GeneViewProps extends SVGProps<SVGRectElement> {
  gene: Gene
  single: boolean
  pixelsPerBase: number
  geneFrameOffset: number
  geneStrandOffset: number
}

export function GeneView({ gene, single, pixelsPerBase, geneFrameOffset, geneStrandOffset, ...rest }: GeneViewProps) {
  const { t } = useTranslationSafe()
  const [showTooltip, setShowTooltip] = useState(false)

  const setViewedGene = useSetRecoilState(viewedGeneAtom)

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
        }, 2000)

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

  const { geneName, color, start, end, frame, strand } = gene // prettier-ignore
  const length = geneLength(gene)
  const width = Math.max(BASE_MIN_WIDTH_PX, length * pixelsPerBase)
  const x = single ? 0 : start * pixelsPerBase
  const id = getSafeId('gene', { ...gene })
  const stroke = hovered ? '#222' : undefined

  let y = geneFrameOffset * frame
  if (strand === '-') {
    y += geneStrandOffset
  }

  const onClick = useCallback(() => {
    clearInterval(timeoutId)
    setHovered(false)
    setViewedGene(geneName)
  }, [geneName, setViewedGene, timeoutId])

  return (
    <rect
      id={id}
      fill={color}
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
      {...rest}
    >
      <Tooltip target={id} isOpen={showTooltip} onClick={closeTooltip}>
        <TableSlim borderless>
          <tbody>
            <tr>
              <td>{t('Gene')}</td>
              <td className="d-flex">
                <ColoredSquare color={color} size="1rem" />
                <span className="ml-2">{geneName}</span>
              </td>
            </tr>

            <tr>
              <td>{t('Strand:')}</td>
              <td>{strand}</td>
            </tr>

            <tr>
              <td>{t('Nuc. range')}</td>
              <td>{formatRange(start, end)}</td>
            </tr>

            <tr>
              <td>{t('Length (nuc)')}</td>
              <td>{length}</td>
            </tr>

            <tr>
              <td>{t('Length (AA)')}</td>
              <td>{Math.round(length / 3)}</td>
            </tr>

            <tr>
              <td>{t('Frame')}</td>
              <td>{frame + 1}</td>
            </tr>

            <tr>
              <td colSpan={2}>
                <small>{t('Click on a gene or its tooltip to switch to gene view.')}</small>
              </td>
            </tr>
          </tbody>
        </TableSlim>
      </Tooltip>
    </rect>
  )
}

export type GeneMapProps = ReactResizeDetectorDimensions

export function GeneMapUnsized({ width = 0, height = 0 }: GeneMapProps) {
  const geneMap = useRecoilValue(geneMapAtom)
  const genomeSize = useRecoilValue(genomeSizeAtom)
  const viewedGene = useRecoilValue(viewedGeneAtom)

  const { viewBox, geneViews, geneMapHeight } = useMemo(() => {
    const length = getAxisLength(genomeSize, viewedGene, geneMap)
    const pixelsPerBase = width / length
    const single = viewedGene !== GENE_OPTION_NUC_SEQUENCE

    let geneMapFiltered: Gene[] = []
    if (!single) {
      geneMapFiltered = geneMap
    } else {
      const gene = geneMap.find((gene) => gene.geneName === viewedGene)
      if (gene) {
        geneMapFiltered = [gene]
      }
    }

    const { geneFrameOffset, geneStrandOffset, geneMapHeight } = getGeneMapDimensions(geneMapFiltered)

    const geneViews = geneMapFiltered.map((gene) => {
      return (
        <GeneView
          key={gene.geneName}
          gene={gene}
          single={single}
          pixelsPerBase={pixelsPerBase}
          geneFrameOffset={geneFrameOffset}
          geneStrandOffset={geneStrandOffset}
        />
      )
    })

    const viewBox = `0 ${-GENE_MAP_MARGIN} ${width} ${geneMapHeight}`

    return { viewBox, geneViews, geneMapHeight }
  }, [geneMap, genomeSize, viewedGene, width])

  if (!width || !height) {
    return (
      <GeneMapWrapper $height={1}>
        <GeneMapSVG viewBox={`0 0 50 50`} />
      </GeneMapWrapper>
    )
  }

  return (
    <GeneMapWrapper $height={geneMapHeight}>
      <GeneMapSVG viewBox={viewBox}>{geneViews}</GeneMapSVG>
    </GeneMapWrapper>
  )
}

export const GeneMap = withResizeDetector(GeneMapUnsized, {
  handleWidth: true,
  handleHeight: true,
  refreshRate: 300,
  refreshMode: 'debounce',
})

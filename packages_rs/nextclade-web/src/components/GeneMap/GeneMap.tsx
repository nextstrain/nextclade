import React, { SVGProps, useCallback, useEffect, useState } from 'react'
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

export const GENE_MAP_HEIGHT_PX = 35
export const GENE_HEIGHT_PX = 15
export const GENE_STRAND_SHIFT = 5
export const geneMapY = -GENE_MAP_HEIGHT_PX / 2

export const GeneMapWrapper = styled.div`
  display: flex;
  width: 100%;
  height: ${GENE_MAP_HEIGHT_PX}px;
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
}

export function GeneView({ gene, single, pixelsPerBase, ...rest }: GeneViewProps) {
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

  const { geneName, color, start, end, frame } = gene // prettier-ignore
  const length = geneLength(gene)
  const width = Math.max(BASE_MIN_WIDTH_PX, length * pixelsPerBase)
  const x = single ? 0 : start * pixelsPerBase
  const id = getSafeId('gene', { ...gene })
  const strand = gene.strand == '-' ? 0 : 1
  const stroke = hovered ? '#222' : undefined

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
      y={-10 + 7.5 * frame + GENE_STRAND_SHIFT * strand}
      width={width}
      height={GENE_HEIGHT_PX - GENE_STRAND_SHIFT}
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

export function GeneMapUnsized({ width, height }: GeneMapProps) {
  const geneMap = useRecoilValue(geneMapAtom)
  const genomeSize = useRecoilValue(genomeSizeAtom)
  const viewedGene = useRecoilValue(viewedGeneAtom)

  if (!width || !height) {
    return (
      <GeneMapWrapper>
        <GeneMapSVG viewBox={`0 -25 50 50`} />
      </GeneMapWrapper>
    )
  }

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

  const geneViews = geneMapFiltered.map((gene) => {
    return <GeneView key={gene.geneName} gene={gene} single={single} pixelsPerBase={pixelsPerBase} />
  })

  return (
    <GeneMapWrapper>
      <GeneMapSVG viewBox={`0 ${geneMapY} ${width} ${GENE_MAP_HEIGHT_PX}`}>
        <rect fill="transparent" x={0} y={geneMapY} width={width} height={GENE_MAP_HEIGHT_PX} />
        {geneViews}
      </GeneMapSVG>
    </GeneMapWrapper>
  )
}

export const GeneMap = withResizeDetector(GeneMapUnsized, {
  handleWidth: true,
  handleHeight: true,
  refreshRate: 300,
  refreshMode: 'debounce',
})

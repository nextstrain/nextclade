import React, { SVGProps, useState } from 'react'

import { connect } from 'react-redux'
import { ReactResizeDetectorDimensions, withResizeDetector } from 'react-resize-detector'
import { Table as ReactstrapTable } from 'reactstrap'
import { selectGeneMap, selectGenomeSize } from 'src/state/algorithm/algorithm.selectors'
import styled from 'styled-components'

import { BASE_MIN_WIDTH_PX, GENE_OPTION_NUC_SEQUENCE } from 'src/constants'

import type { Gene } from 'src/algorithms/types'
import type { State } from 'src/state/reducer'
import { Tooltip } from 'src/components/Results/Tooltip'
import { formatRange } from 'src/helpers/formatRange'
import { getSafeId } from 'src/helpers/getSafeId'
import { getAxisLength } from 'src/components/GeneMap/getAxisLength'

import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { ColoredSquare } from 'src/components/Common/ColoredSquare'

export const GENE_MAP_HEIGHT_PX = 35
export const GENE_HEIGHT_PX = 15
export const geneMapY = -GENE_MAP_HEIGHT_PX / 2

export const Table = styled(ReactstrapTable)`
  margin-bottom: 2px;

  & td {
    padding: 0 0.5rem;
  }

  & tr {
    margin: 0;
    padding: 0;
  }
`

export const GeneMapWrapper = styled.div`
  display: flex;
  width: 100%;
  height: ${GENE_MAP_HEIGHT_PX}px;
  padding: 0;
  margin: 0 auto;
`

export const GeneMapSVG = styled.svg`
  padding: 0;
  margin: 0;
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
  const { geneName, color, start, end, length, frame } = gene // prettier-ignore
  const width = Math.max(BASE_MIN_WIDTH_PX, length * pixelsPerBase)
  const x = single ? 0 : start * pixelsPerBase
  const id = getSafeId('gene', { ...gene, single })

  return (
    <rect
      id={id}
      fill={gene.color}
      x={x}
      y={-10 + 7.5 * frame}
      width={width}
      height={GENE_HEIGHT_PX}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      {...rest}
    >
      <Tooltip target={id} isOpen={showTooltip}>
        <Table borderless>
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
        </Table>
      </Tooltip>
    </rect>
  )
}

export interface GeneMapProps extends ReactResizeDetectorDimensions {
  // virus: Virus
  geneMap?: Gene[]
  genomeSize?: number
  viewedGene: string
}

const mapStateToProps = (state: State) => ({
  // virus: selectParams(state).virus,
  geneMap: selectGeneMap(state),
  genomeSize: selectGenomeSize(state),
  viewedGene: state.ui.viewedGene,
})

const mapDispatchToProps = {}

export const GeneMapUnsized = connect(mapStateToProps, mapDispatchToProps)(GeneMapUnsizedDisconnected)

export function GeneMapUnsizedDisconnected({ geneMap, genomeSize, viewedGene, width, height }: GeneMapProps) {
  if (!width || !height || !geneMap || !genomeSize) {
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

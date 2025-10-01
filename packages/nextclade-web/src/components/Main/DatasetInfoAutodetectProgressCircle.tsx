import { isEmpty, last } from 'lodash'
import React, { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { datasetColor } from 'src/components/Main/datasetInfoHelpers'
import styled from 'styled-components'
import { firstLetter } from 'src/helpers/string'
import { numberAutodetectResultsAtom, seqIndicesForDataset } from 'src/state/autodetect.state'
import { attrStrMaybe, type Dataset } from 'src/types'

export function DatasetInfoAutodetectProgressCircle({
  dataset,
  showSuggestions,
  ...restProps
}: DatasetInfoCircleProps) {
  const { attributes, path } = dataset
  const name = attrStrMaybe(attributes, 'name') ?? last(path.split('/')) ?? '?'

  const circleBg = useMemo(() => datasetColor(path), [path])
  const seqIndices = useRecoilValue(seqIndicesForDataset(path))
  const numberAutodetectResults = useRecoilValue(numberAutodetectResultsAtom)

  const { circleText, countText, percentage } = useMemo(() => {
    if (!showSuggestions || isEmpty(seqIndices)) {
      return {
        circleText: (firstLetter(name) ?? ' ').toUpperCase(),
        percentage: 0,
        countText: '\u00A0',
      }
    }

    if (seqIndices.length > 0) {
      const percentage = seqIndices.length / numberAutodetectResults
      const circleText = `${(100 * percentage).toFixed(0)}%`
      const countText = `${seqIndices.length} / ${numberAutodetectResults}`
      return { circleText, percentage, countText }
    }
    return { circleText: `0%`, percentage: 0, countText: `0 / ${numberAutodetectResults}` }
  }, [showSuggestions, seqIndices, numberAutodetectResults, name])

  return (
    <CircleWrapper {...restProps}>
      <CircleBorder $percentage={percentage}>
        <Circle $bg={circleBg}>{circleText}</Circle>
      </CircleBorder>

      <CountText>{countText}</CountText>
    </CircleWrapper>
  )
}

export interface DatasetInfoCircleProps {
  dataset: Dataset
  showSuggestions?: boolean
}

const CircleWrapper = styled.div`
  display: flex;
  flex-direction: column;
`

const CountText = styled.span`
  text-align: center;
  font-size: 0.8rem;
`

interface CircleBorderProps {
  $percentage: number
  $fg?: string
  $bg?: string
}

const CircleBorder = styled.div.attrs<CircleBorderProps>((props) => ({
  style: {
    background: `
      radial-gradient(closest-side, white 79%, transparent 80% 100%),
      conic-gradient(
        ${props.$fg ?? props.theme.success} calc(${props.$percentage} * 100%),
        ${props.$bg ?? 'lightgray'} 0
      )`,
  },
}))<CircleBorderProps>`
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  width: 60px;
  height: 60px;
`

const Circle = styled.div<{ $bg?: string; $fg?: string }>`
  display: flex;
  margin: auto;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  background: ${(props) => props.$bg ?? props.theme.gray700};
  color: ${(props) => props.$fg ?? props.theme.gray100};
  width: 50px;
  height: 50px;
  font-size: 1rem;
`

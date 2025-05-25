import React from 'react'
import { useRecoilValue } from 'recoil'
import { isNil } from 'lodash'
import { viewedDatasetNameAtom } from 'src/state/dataset.state'
import styled, { useTheme } from 'styled-components'
import { shade } from 'polished'
import type { AaSub, NucSub } from 'src/types'
import { getNucleotideColor } from 'src/helpers/getNucleotideColor'
import { getAminoacidColor } from 'src/helpers/getAminoacidColor'
import { getTextColor } from 'src/helpers/getTextColor'
import { cdsAtom } from 'src/state/results.state'

export const MutationBadgeBox = styled.span`
  display: inline-block;
  font-size: 0.75rem;
`

export const MutationWrapper = styled.span`
  border-radius: 2px;
  box-shadow: ${(props) => props.theme.shadows.light};

  font-family: ${(props) => props.theme.font.monospace};

  & > span:first-child {
    padding-left: 4px;
    border-top-left-radius: 3px;
    border-bottom-left-radius: 3px;
  }

  & > span:last-child {
    padding-right: 4px;
    border-top-right-radius: 3px;
    border-bottom-right-radius: 3px;
  }
`

export const GeneText = styled.span<{ $background?: string; $color?: string }>`
  padding: 1px 2px;
  background-color: ${(props) => props.$background};
  color: ${(props) => props.$color ?? props.theme.gray100};
  font-weight: 700;
`

export const ColoredText = styled.span<{ $background?: string; $color?: string }>`
  padding: 1px 2px;
  background-color: ${(props) => props.$background};
  color: ${(props) => props.$color ?? props.theme.black};
`

export const PositionText = styled.span`
  padding: 1px 2px;
  background-color: ${(props) => props.theme.gray300};
  color: ${(props) => props.theme.gray800};
`

export interface NucleotideMutationBadgeProps {
  mutation: NucSub
}

export function NucleotideMutationBadge({ mutation }: NucleotideMutationBadgeProps) {
  const theme = useTheme()
  const { refNuc, pos, qryNuc } = mutation

  const refBg = shade(0.25)(getNucleotideColor(refNuc))
  const refFg = getTextColor(theme, refBg)
  const queryBg = shade(0.25)(getNucleotideColor(qryNuc))
  const queryFg = getTextColor(theme, queryBg)
  const posOneBased = pos + 1

  return (
    <MutationBadgeBox>
      <MutationWrapper>
        {!isNil(refNuc) && (
          <ColoredText $background={refBg} $color={refFg}>
            {refNuc}
          </ColoredText>
        )}
        {!isNil(pos) && <PositionText>{posOneBased}</PositionText>}
        {!isNil(qryNuc) && (
          <ColoredText $background={queryBg} $color={queryFg}>
            {qryNuc}
          </ColoredText>
        )}
      </MutationWrapper>
    </MutationBadgeBox>
  )
}

export interface AminoacidMutationBadgeProps {
  mutation: AaSub
}

export function AminoacidMutationBadge({ mutation }: AminoacidMutationBadgeProps) {
  const theme = useTheme()

  const { cdsName, refAa, qryAa, pos } = mutation
  const datasetName = useRecoilValue(viewedDatasetNameAtom)
  const cds = useRecoilValue(cdsAtom({ datasetName, cdsName }))

  const geneBg = cds?.color ?? '#999'
  const refBg = getAminoacidColor(refAa)
  const refFg = getTextColor(theme, refBg)
  const queryBg = getAminoacidColor(qryAa)
  const queryFg = getTextColor(theme, queryBg)
  const codonOneBased = pos + 1

  return (
    <MutationBadgeBox>
      <MutationWrapper>
        <GeneText $background={geneBg}>
          {cdsName}
          <span>{':'}</span>
        </GeneText>
        <ColoredText $background={refBg} $color={refFg}>
          {refAa}
        </ColoredText>
        <PositionText>{codonOneBased}</PositionText>
        <ColoredText $background={queryBg} $color={queryFg}>
          {qryAa}
        </ColoredText>
      </MutationWrapper>
    </MutationBadgeBox>
  )
}

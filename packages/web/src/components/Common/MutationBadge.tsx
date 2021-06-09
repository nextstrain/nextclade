import React from 'react'

import { get } from 'lodash'
import styled, { useTheme } from 'styled-components'

import { AMINOACID_GAP } from 'src/constants'
import { Aminoacid, AminoacidDeletion, AminoacidSubstitution, Gene } from 'src/algorithms/types'
import { getAminoacidColor } from 'src/helpers/getAminoacidColor'
import { getContrast } from 'polished'
import { Theme } from 'src/theme'

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
  color: ${(props) => props.$color ?? props.theme.gray100};
`

export const PositionText = styled.span`
  padding: 1px 2px;
  background-color: ${(props) => props.theme.gray300};
  color: ${(props) => props.theme.gray800};
`

export const VersionText = styled.span`
  padding: 1px 2px;
  background-color: ${(props) => props.theme.gray400};
  color: ${(props) => props.theme.gray800};
`

export function getTextColor(theme: Theme, backgroundColor: string) {
  const contrast = getContrast(backgroundColor, theme.gray100)
  if (contrast > 5) {
    return theme.gray100
  }
  return theme.gray800
}

export interface MutationBadgeProps {
  mutation: AminoacidSubstitution | AminoacidDeletion
  geneMap: Gene[]
}

export function AminoacidMutationBadge({ mutation, geneMap }: MutationBadgeProps) {
  const theme = useTheme()

  const { gene: geneName, refAA, codon } = mutation
  const queryAA = get(mutation, 'queryAA', AMINOACID_GAP) as Aminoacid

  const gene = geneMap.find((gene) => gene.geneName === geneName)
  const geneBg = gene?.color ?? '#999'
  const refBg = getAminoacidColor(refAA)
  const refFg = getTextColor(theme, refBg)
  const queryBg = getAminoacidColor(queryAA)
  const queryFg = getTextColor(theme, queryBg)
  const codonOneBased = codon + 1

  return (
    <MutationBadgeBox>
      <MutationWrapper>
        <GeneText $background={geneBg}>
          {geneName}
          <span>{':'}</span>
        </GeneText>
        <ColoredText $background={refBg} $color={refFg}>
          {refAA}
        </ColoredText>
        <PositionText>{codonOneBased}</PositionText>
        <ColoredText $background={queryBg} $color={queryFg}>
          {queryAA}
        </ColoredText>
      </MutationWrapper>
    </MutationBadgeBox>
  )
}

import React from 'react'

import { get } from 'lodash'
import styled from 'styled-components'

import { AMINOACID_GAP } from 'src/constants'
import { Aminoacid, AminoacidDeletion, AminoacidSubstitution, Gene } from 'src/algorithms/types'
import { getAminoacidColor } from 'src/helpers/getAminoacidColor'

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

export const GeneText = styled.span<{ $color: string }>`
  padding: 1px 2px;
  background-color: ${(props) => props.$color};
  color: ${(props) => props.theme.gray100};
  font-weight: 700;
`

export const ColoredText = styled.span<{ $color: string }>`
  padding: 1px 2px;
  background-color: ${(props) => props.$color};
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

export interface MutationBadgeProps {
  mutation: AminoacidSubstitution | AminoacidDeletion
  geneMap: Gene[]
}

export function AminoacidMutationBadge({ mutation, geneMap }: MutationBadgeProps) {
  const { gene: geneName, refAA, codon } = mutation
  const queryAA = get(mutation, 'queryAA', AMINOACID_GAP) as Aminoacid

  const gene = geneMap.find((gene) => gene.geneName === geneName)
  const geneColor = gene?.color ?? '#999'
  const refColor = getAminoacidColor(refAA)
  const queryColor = getAminoacidColor(queryAA)
  const codonOneBased = codon + 1

  return (
    <MutationBadgeBox>
      <MutationWrapper>
        <GeneText $color={geneColor}>
          {geneName}
          <span>{':'}</span>
        </GeneText>
        <ColoredText $color={refColor}>{refAA}</ColoredText>
        <PositionText>{codonOneBased}</PositionText>
        <ColoredText $color={queryColor}>{queryAA}</ColoredText>
      </MutationWrapper>
    </MutationBadgeBox>
  )
}

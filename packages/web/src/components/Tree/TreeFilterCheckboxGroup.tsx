import React from 'react'

import styled from 'styled-components'

import { FormSection, Label } from './Form'
import { TreeFilterCheckbox } from './TreeFilterCheckbox'

export const LabelText = styled.div`
  padding-bottom: 5px;
  margin-bottom: 7px;
  border-bottom: 1px solid ${(props) => props.theme.gray400};
`

export const FormSectionStyled = styled(FormSection)`
  overflow: auto;
`

export const FormSectionContent = styled.div`
  height: 15vh;
  overflow: auto;
`

export interface TreeFilterCheckboxGroupProps {
  name: string
  trait: string
  values: string[]
}

export function TreeFilterCheckboxGroup({ name, trait, values }: TreeFilterCheckboxGroupProps) {
  return (
    <FormSectionStyled>
      <Label title={name}>
        <LabelText>{name}</LabelText>
        <FormSectionContent>
          {values.map((clade) => (
            <TreeFilterCheckbox key={clade} text={clade} trait={trait} value={clade} />
          ))}
        </FormSectionContent>
      </Label>
    </FormSectionStyled>
  )
}

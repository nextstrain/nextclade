import styled from 'styled-components'

import {
  FormGroupProps as ReactstrapFormGroupProps,
  FormGroup as ReactstrapFormGroup,
  LabelProps as ReactstrapLabelProps,
  InputProps as ReactstrapInputProps,
  Input as ReactstrapInput,
  Label as ReactstrapLabel,
} from 'reactstrap'

export const FormGroup = styled(ReactstrapFormGroup)<ReactstrapFormGroupProps>`
  background-color: #fff;
  flex-grow: 1;
  flex-basis: 0;
`

export const FormSection = styled(FormGroup)<ReactstrapFormGroupProps>`
  font-size: 0.85rem;
  padding: 5px 10px;
  margin: 5px;
  border-radius: 3px;
`

export const Label = styled(ReactstrapLabel)<ReactstrapLabelProps>`
  width: 100%;
  font-size: 0.85rem;
`

export const InputCheckbox = styled(ReactstrapInput)<ReactstrapInputProps>`
  padding-bottom: 3px;
`

import {
  Col,
  Form as ReactstrapForm,
  FormGroup as ReactstrapFormGroup,
  Label as ReactstrapLabel,
  Row,
} from 'reactstrap'

import styled from 'styled-components'

export const Form = styled(ReactstrapForm)`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  margin: 0 5px;
`

export const FormGroup = styled(ReactstrapFormGroup)`
  display: flex;
  flex-direction: column;
  flex: 1;
  margin: 0 !important;
`

export const Label = styled(ReactstrapLabel)`
  margin-right: auto;
  margin-left: 4px;
  margin-bottom: 2px;
`

export const Footnote = styled.small`
  margin-left: auto;
  font-size: 0.75rem;
  color: ${(props) => props.theme.gray600};
`

export const ButtonContainer = styled.div`
  display: flex;
  width: 100%;
  margin-top: 5px;
  margin-bottom: 3px;
`

export const FlexRow = styled.div``

export const FlexColumn = styled.div``

export const FlexBottom = styled(FlexColumn)``

export const FlexRight = styled.div`
  margin-left: auto;
`

export const FlexLeft = styled.div`
  margin-right: auto;
`

export const FlexFill = styled.div``

export const RowFill = styled(Row)`
  flex: 1;
`

export const ColFlexVertical = styled(Col)`
  display: flex;
  flex-direction: column;
`

export const ColFlexHorizontal = styled(Col)`
  display: flex;
  flex-direction: row;
  width: 100%;
`

export const FlexCenter = styled.div`
  display: flex;
  margin: auto;
`

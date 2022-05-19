import type { ButtonProps } from 'reactstrap'
import { Button } from 'reactstrap'

import styled from 'styled-components'

export type PanelButtonProps = ButtonProps

export const PanelButton = styled(Button)`
  margin: 2px 2px;
  height: 38px;
  width: 45px;
  color: ${(props) => props.theme.gray700};
`

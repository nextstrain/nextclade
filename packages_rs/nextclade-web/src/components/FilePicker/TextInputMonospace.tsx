import styled from 'styled-components'

import { Input } from 'reactstrap'

export const TextInputWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`

export const TextInputMonospace = styled(Input)`
  font-family: ${(props) => props.theme.font.monospace};
  font-size: 0.75rem;
  border-radius: 3px;
  box-shadow: inset 2px 1px 3px #2222;
  resize: none;
  word-break: break-all;
  word-wrap: break-word;
  text-wrap: unrestricted;
`

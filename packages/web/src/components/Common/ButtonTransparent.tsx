import { Button, ButtonProps } from 'reactstrap'
import styled from 'styled-components'

export interface ButtonTransparentProps extends ButtonProps {
  height: string
  width?: string
  fontSize: string
}

export const ButtonTransparent = styled(Button)<ButtonTransparentProps>`
  display: block;
  width: ${(props) => props.width ?? props.height};
  height: ${(props) => props.height};
  padding: 0;
  font-size: ${(props) => props.fontSize};
  background-color: transparent;
  background-image: none;
  color: #cccccc;
  border: none;
  border-radius: 0;
  box-shadow: none;

  &:active,
  &:hover,
  &:focus,
  &:focus-within {
    background-color: transparent;
    background-image: none;
    color: #fff;
  }
`

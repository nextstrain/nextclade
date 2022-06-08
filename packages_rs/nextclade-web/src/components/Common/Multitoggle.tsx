import { noop } from 'lodash'
import React, { useCallback, useMemo } from 'react'
import styled from 'styled-components'

export const Switch = styled.div<{ $width: number }>`
  position: relative;
  height: 26px;
  width: ${(props) => props.$width}px;
  background-color: ${(props) => props.theme.gray300};
  border-radius: 3px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3), 0 1px rgba(255, 255, 255, 0.1);
`

export const SwitchRadio = styled.input`
  display: none;
`

export const SwitchSelection = styled.span<{ $widthPx: number; $leftPercent: number }>`
  display: block;
  position: absolute;
  z-index: 1;
  top: 0;
  left: ${(props) => props.$leftPercent}%;
  width: ${(props) => props.$widthPx}px;
  height: 26px;
  background-color: ${(props) => props.theme.primary};
  border-radius: 3px;
  transition: left 0.25s ease-out;
  box-shadow: ${(props) => props.theme.shadows.slight};
`

export const SwitchLabel = styled.label<{ $widthPx: number }>`
  position: relative;
  z-index: 2;
  float: left;
  width: ${(props) => props.$widthPx}px;
  line-height: 26px;
  font-size: 12px;
  color: ${(props) => props.theme.bodyColor};
  text-align: center;
  cursor: pointer;

  ${SwitchRadio}:checked + & {
    transition: 0.15s ease-out;
    color: ${(props) => props.theme.white};
  }
`

export interface ClickableLabelProps {
  value: string
  onChange(value: string): void
  itemWidth: number
}

export function ClickableLabel({ value, onChange, itemWidth, ...restProps }: ClickableLabelProps) {
  const onClick = useCallback(() => onChange(value), [onChange, value])
  return (
    <SwitchLabel onClick={onClick} $widthPx={itemWidth} {...restProps}>
      {value}
    </SwitchLabel>
  )
}

export interface MultitoggleProps {
  values: string[]
  value: string
  onChange(value: string): void
  itemWidth?: number
}

export function Multitoggle({ values, value, onChange, itemWidth = 45, ...restProps }: MultitoggleProps) {
  const { selectionLeftPercent, selectionWidthPx, totalWidth } = useMemo(() => {
    return {
      selectionLeftPercent: (values.indexOf(value) / values.length) * 100,
      selectionWidthPx: itemWidth,
      totalWidth: itemWidth * values.length,
    }
  }, [itemWidth, value, values])

  return (
    <Switch $width={totalWidth} {...restProps}>
      {values.map((val) => {
        return (
          <span key={val}>
            <SwitchRadio type="radio" name="switch" checked={val === value} onChange={noop} />
            <ClickableLabel value={val} onChange={onChange} itemWidth={itemWidth} />
          </span>
        )
      })}
      <SwitchSelection $leftPercent={selectionLeftPercent} $widthPx={selectionWidthPx} />
    </Switch>
  )
}

//

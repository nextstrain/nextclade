import React, { ChangeEvent, useCallback, useMemo } from 'react'
import styled from 'styled-components'

export interface MultitoggleProps {
  values: string[]
  currentValue: string
  onChange(value: string): void
  itemWidth?: number
}

export function Multitoggle({ values, currentValue, onChange, itemWidth = 60, ...restProps }: MultitoggleProps) {
  const { selectionLeftPercent, selectionWidthPx, totalWidth } = useMemo(() => {
    return {
      selectionLeftPercent: (values.indexOf(currentValue) / values.length) * 100,
      selectionWidthPx: itemWidth,
      totalWidth: itemWidth * values.length,
    }
  }, [itemWidth, currentValue, values])

  const switchItems = useMemo(
    () =>
      values.map((value) => {
        return (
          <SwitchLabel key={value} $widthPx={itemWidth} $active={value === currentValue}>
            {value}
            <SwitchRadio value={value} onChange={onChange} currentValue={currentValue} />
          </SwitchLabel>
        )
      }),
    [currentValue, itemWidth, onChange, values],
  )

  return (
    <Switch $width={totalWidth} {...restProps}>
      {switchItems}
      <SwitchSelection $leftPercent={selectionLeftPercent} $widthPx={selectionWidthPx} />
    </Switch>
  )
}

export interface SwitchRadioProps {
  value: string
  currentValue: string
  onChange(value: string): void
}

export function SwitchRadio({ value, onChange, currentValue }: SwitchRadioProps) {
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.value === 'on') {
        onChange(value)
      }
    },
    [onChange, value],
  )
  return <SwitchRadioStyle type="radio" name="switch" checked={value === currentValue} onChange={handleChange} />
}

export const Switch = styled.fieldset<{ $width: number }>`
  display: flex;
  position: relative;
  height: 30px;
  width: ${(props) => props.$width}px;
  background-color: ${(props) => props.theme.gray300};
  border-radius: 3px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3), 0 1px rgba(255, 255, 255, 0.1);
  pointer-events: initial;
`

export const SwitchSelection = styled.span<{ $widthPx: number; $leftPercent: number }>`
  display: block;
  position: absolute;
  z-index: 1;
  top: 0;
  left: ${(props) => props.$leftPercent}%;
  width: ${(props) => props.$widthPx - 1}px;
  margin-left: 1px;
  height: 29px;
  background-color: ${(props) => props.theme.primary};
  border-radius: 3px;
  transition: left 100ms ease-in-out;
  box-shadow: 1px 1px 4px 2px #5555;
`

export const SwitchLabel = styled.label<{ $active: boolean; $widthPx: number }>`
  position: relative;
  z-index: 2;
  width: ${(props) => props.$widthPx}px;
  font-size: 0.85rem;
  line-height: 1.5rem;
  text-align: center;
  cursor: pointer;
  color: ${(props) => (props.$active ? props.theme.white : props.theme.bodyColor)};
  font-weight: ${(props) => props.$active && 'bold'};
  transition: left 150ms ease-in-out;
  margin: auto;
  vertical-align: middle;

  :not(:first-child) {
    border-left: ${(props) => props.theme.gray500} solid 1px;
  }
`

export const SwitchRadioStyle = styled.input`
  display: none;
`

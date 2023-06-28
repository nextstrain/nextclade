import { noop } from 'lodash'
import { rgba } from 'polished'
import React, { ReactNode, useCallback, useMemo } from 'react'
import { gray900 } from 'src/theme'
import styled from 'styled-components'

export const Switch = styled.div<{ $width: number }>`
  position: relative;
  height: 26px;
  width: ${(props) => props.$width}px;
  background-color: ${(props) => props.theme.gray600};
  border-radius: 3px;
`

export const SwitchRadio = styled.input`
  display: none;
`

export const SwitchSelection = styled.span<{ $widthPx: number; $leftPercent: number; $color?: string }>`
  display: block;
  position: absolute;
  z-index: 1;
  top: 0;
  left: ${(props) => props.$leftPercent}%;
  width: ${(props) => props.$widthPx}px;
  height: 26px;
  background-color: ${(props) => props.$color ?? props.theme.primary};
  outline: ${(props) => props.theme.gray300} solid 2px;
  box-shadow: 0 0 3px 3px ${rgba(gray900, 0.5)};
  border-radius: 3px;
  transition: all 0.2s ease-out;
`

export const SwitchLabel = styled.label<{ $widthPx: number }>`
  position: relative;
  z-index: 2;
  float: left;
  width: ${(props) => props.$widthPx}px;
  line-height: 26px;
  font-size: 12px;
  color: ${(props) => props.theme.gray200};
  text-align: center;
  cursor: pointer;
  border-right: ${(props) => props.theme.gray200} solid 1px;

  :last-child {
    border: none;
  }

  ${SwitchRadio}:checked + & {
    transition: 0.15s ease-out;
    color: ${(props) => props.theme.white};
  }
`

export interface MultitoggleOption<T extends string | number> {
  value: T
  label: ReactNode
  color?: string
}

export interface ClickableLabelProps<T extends string | number> {
  option: MultitoggleOption<T>
  onChange(value: T): void
  itemWidth: number
}

export function ClickableLabel<T extends string | number>({
  option,
  onChange,
  itemWidth,
  ...restProps
}: ClickableLabelProps<T>) {
  const onClick = useCallback(() => onChange(option.value), [onChange, option.value])
  return (
    <SwitchLabel onClick={onClick} $widthPx={itemWidth} {...restProps}>
      {option.label}
    </SwitchLabel>
  )
}

export interface MultitoggleProps<T extends string | number> {
  options: MultitoggleOption<T>[]
  value: T
  onChange(value: T): void
  itemWidth?: number
}

export function Multitoggle<T extends string | number>({
  options,
  value,
  onChange,
  itemWidth = 45,
  ...restProps
}: MultitoggleProps<T>) {
  const { currentOption, selectionLeftPercent, selectionWidthPx, totalWidth } = useMemo(() => {
    const currIndex = options.findIndex((option) => option.value === value)
    const numOptions = options.length

    return {
      currentOption: options[currIndex],
      selectionLeftPercent: (currIndex / numOptions) * 100,
      selectionWidthPx: itemWidth,
      totalWidth: itemWidth * numOptions,
    }
  }, [itemWidth, options, value])

  return (
    <Switch $width={totalWidth} {...restProps}>
      {options.map((option) => {
        return (
          <span key={option.value}>
            <SwitchRadio type="radio" name="switch" checked={option.value === value} onChange={noop} />
            <ClickableLabel option={option} onChange={onChange} itemWidth={itemWidth} />
          </span>
        )
      })}
      <SwitchSelection $leftPercent={selectionLeftPercent} $widthPx={selectionWidthPx} $color={currentOption.color} />
    </Switch>
  )
}

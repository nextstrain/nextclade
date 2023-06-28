import React, { PropsWithChildren, ReactNode, useCallback, useEffect, useMemo, useRef } from 'react'
import type { StrictOmit } from 'ts-essentials'
import { FormGroup as FormGroupBase, Input, InputProps, Label as LabelBase } from 'reactstrap'
import styled from 'styled-components'
import type { SetterOrUpdater } from 'src/types'

export interface CheckboxProps extends PropsWithChildren<unknown> {
  title?: string
  checked: boolean
  setChecked: SetterOrUpdater<boolean>
}

export function Checkbox({ title, checked, setChecked, children }: CheckboxProps) {
  const onChange = useCallback(() => {
    setChecked((checkedPrev) => !checkedPrev)
  }, [setChecked])

  return (
    <FormGroup check title={title}>
      <Label check>
        <Input type="checkbox" checked={checked} onChange={onChange} />
        {children}
      </Label>
    </FormGroup>
  )
}

export interface CheckboxWithTextProps extends Omit<CheckboxProps, 'children'> {
  label: string
}

export function CheckboxWithText({ label, title, checked, setChecked }: CheckboxWithTextProps) {
  const onChange = useCallback(() => {
    setChecked((checkedPrev) => !checkedPrev)
  }, [setChecked])

  return (
    <FormGroup check title={title}>
      <Label check>
        <Input type="checkbox" checked={checked} onChange={onChange} />
        <CheckboxText>{label}</CheckboxText>
      </Label>
    </FormGroup>
  )
}

export interface CheckboxWithIconProps extends Omit<CheckboxProps, 'children'> {
  label: string
  icon: ReactNode
}

export function CheckboxWithIcon({ title, label, icon, checked, setChecked }: CheckboxWithIconProps) {
  return (
    <Checkbox title={title} checked={checked} setChecked={setChecked}>
      {icon}
      <CheckboxText>{label}</CheckboxText>
    </Checkbox>
  )
}

export enum CheckboxState {
  Checked,
  Unchecked,
  Indeterminate,
}

export interface CheckboxIndeterminateProps extends StrictOmit<InputProps, 'onChange' | 'checked'> {
  state?: CheckboxState
  onChange?(state: CheckboxState): void
}

/** Checkbox with 3 states: checked, unchecked, indeterminate */
export function CheckboxIndeterminate({ state, onChange, ...restProps }: CheckboxIndeterminateProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleOnChange = useCallback(() => {
    if (state === CheckboxState.Checked) {
      return onChange?.(CheckboxState.Unchecked)
    }
    return onChange?.(CheckboxState.Checked)
  }, [onChange, state])

  useEffect(() => {
    if (inputRef?.current) {
      inputRef.current.indeterminate = state === CheckboxState.Indeterminate
    }
  }, [state])

  const checked = useMemo(() => state === CheckboxState.Checked, [state])

  return <Input {...restProps} type="checkbox" innerRef={inputRef} checked={checked} onChange={handleOnChange} />
}

export interface CheckboxIndeterminateWithTextProps extends Omit<CheckboxIndeterminateProps, 'children'> {
  label: string
}

export function CheckboxIndeterminateWithText({ label, title, ...restProps }: CheckboxIndeterminateWithTextProps) {
  return (
    <FormGroup check title={title}>
      <Label check>
        <CheckboxIndeterminate {...restProps} />
        <CheckboxText>{label}</CheckboxText>
      </Label>
    </FormGroup>
  )
}

const FormGroup = styled(FormGroupBase)`
  overflow-x: hidden;
`

const Label = styled(LabelBase)`
  white-space: nowrap;
  overflow-x: hidden;
  text-overflow: ellipsis;
  display: block;
`

const CheckboxText = styled.span`
  margin-left: 0.3rem;
`

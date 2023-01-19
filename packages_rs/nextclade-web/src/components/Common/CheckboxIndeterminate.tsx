import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { Input, InputProps } from 'reactstrap'
import type { StrictOmit } from 'ts-essentials'

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

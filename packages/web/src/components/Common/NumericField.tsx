import React, { useEffect, useState } from 'react'

import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import {
  FormGroup as ReactstrapFormGroup,
  Input as ReactstrapInput,
  InputProps,
  Label as ReactstrapLabel,
} from 'reactstrap'
import { inRange } from 'lodash'
import classNames from 'classnames'

export const Label = styled(ReactstrapLabel)<{ disabled?: boolean }>`
  color: ${(props) => (props.disabled ? props.theme.gray500 : undefined)};
  padding: 2px 5px;
`

export const LabelText = styled.div<{ disabled?: boolean }>`
  color: ${(props) => (props.disabled ? props.theme.gray500 : undefined)};
  font-size: 0.9rem;
  padding: 0;
  margin: 0;
`

export const ErrorText = styled.div<{ disabled?: boolean }>`
  color: ${(props) => (props.disabled ? props.theme.gray500 : props.theme.danger)};
  font-size: 0.7rem;
  padding: 0;
  margin: 0;
`

export const Input = styled(ReactstrapInput)`
  font-size: 0.85rem;
  padding: 0 7px;
`

export const FormGroup = styled(ReactstrapFormGroup)`
  margin-bottom: 3px;
`

export interface NumericFieldProps extends InputProps {
  identifier: string
  label: string
  value: number | typeof Infinity
  min: number
  max: number
  onValueChanged(value: number): void
}

export function NumericField({
  identifier,
  label,
  onValueChanged,
  value,
  min,
  max,
  disabled,
  ...props
}: NumericFieldProps) {
  const { t } = useTranslation()
  const [current, setCurrent] = useState(value.toString())
  useEffect(() => {
    setCurrent(value.toString())
  }, [value])

  const [error, setError] = useState<string | undefined>(undefined)

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const str = e.target.value
    setCurrent(str)

    let num: number | undefined
    try {
      num = Number.parseInt(str, 10)
    } catch {} // eslint-disable-line no-empty

    if (num === undefined) {
      setError(t('Should be a number'))
      return
    }

    if (!inRange(num, min, max)) {
      setError(t('Should be in range from {{minimum}} to {{maximum}}', { minimum: min, maximum: max - 1 }))
    } else {
      setError(undefined)
      onValueChanged(num)
    }
  }

  return (
    <FormGroup row>
      <Label className="col-sm-9 col-form-label" htmlFor={identifier} disabled={disabled}>
        <LabelText disabled={disabled}>{label}</LabelText>
        <ErrorText disabled={disabled}>{error}</ErrorText>
      </Label>
      <Input
        className={classNames(error && !disabled && 'border-danger', 'col-sm-3')}
        type="number"
        id={identifier}
        name={identifier}
        value={current}
        onChange={onChange}
        disabled={disabled}
        {...props}
      />
    </FormGroup>
  )
}

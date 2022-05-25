import styled from 'styled-components'
import { AiFillWarning } from 'react-icons/ai'
import { BsFillQuestionDiamondFill, BsFillXOctagonFill } from 'react-icons/bs'
import { FaCheckCircle } from 'react-icons/fa'

import type { TFunctionInterface } from 'src/helpers/TFunctionInterface'

export interface GetStatusIconAndTextParams {
  t: TFunctionInterface
  hasWarnings: boolean
  hasErrors: boolean
}

export const PendingIcon = styled(BsFillQuestionDiamondFill)`
  width: 1rem;
  height: 1rem;
  color: ${(props) => props.theme.gray650};
  padding-right: 2px;
  filter: drop-shadow(2px 1px 2px rgba(0, 0, 0, 0.2));
`
export const SuccessIcon = styled(FaCheckCircle)`
  margin-bottom: 2px;
  width: 1rem;
  height: 1rem;
  color: ${(props) => props.theme.success};
  padding-right: 2px;
  filter: drop-shadow(2px 1px 2px rgba(0, 0, 0, 0.2));
`
export const WarningIcon = styled(AiFillWarning)`
  width: 1rem;
  height: 1rem;
  color: ${(props) => props.theme.warning};
  padding-right: 2px;
  filter: drop-shadow(2px 1px 2px rgba(0, 0, 0, 0.2));
`
export const ErrorIcon = styled(BsFillXOctagonFill)`
  width: 1rem;
  height: 1rem;
  color: ${(props) => props.theme.danger};
  padding-right: 2px;
  filter: drop-shadow(2px 1px 2px rgba(0, 0, 0, 0.2));
`

export function getStatusIconAndText({ t, hasWarnings, hasErrors }: GetStatusIconAndTextParams) {
  let StatusIcon = SuccessIcon
  let statusText = t('Success')
  if (hasWarnings) {
    StatusIcon = WarningIcon
    statusText = t('Warning')
  } else if (hasErrors) {
    StatusIcon = ErrorIcon
    statusText = t('Error')
  }
  return { StatusIcon, statusText }
}

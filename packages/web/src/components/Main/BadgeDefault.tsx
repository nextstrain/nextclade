import React, { HTMLProps } from 'react'

import { useTranslation } from 'react-i18next'

import styled from 'styled-components'

const Badge = styled.div<{ $background: string; $foreground: string } & HTMLProps<HTMLDivElement>>`
  font-size: 0.8rem;
  font-weight: bold;
  background-color: ${(props) => props.$background};
  color: ${(props) => props.$foreground};
  border-radius: 3px;
  padding: 3px 5px;
  box-shadow: ${(props) => props.theme.shadows.slight};
  margin-top: 3px;
  min-width: 70px;
  text-align: center;
`

export function BadgeRequired() {
  const { t } = useTranslation()
  return (
    <Badge $background="#967a77" $foreground="#f2f2f2" title={t('Data is required, but not provided.')}>
      {t('required')}
    </Badge>
  )
}

export function BadgeDefault() {
  const { t } = useTranslation()
  return (
    <Badge
      $background="#888888"
      $foreground="#f2f2f2"
      title={t('No custom data provided. Default values will be used.')}
    >
      {t('default')}
    </Badge>
  )
}

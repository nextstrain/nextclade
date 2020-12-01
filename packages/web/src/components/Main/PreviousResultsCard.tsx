import React from 'react'

import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import { FaClock } from 'react-icons/fa'

import { TWITTER_USERNAME_RAW } from 'src/constants'
import { LinkTwitter } from 'src/components/Link/LinkTwitter'
import {
  CardL1 as CardL1Base,
  CardL1Body as CardL1BodyBase,
  CardL1Header as CardL1HeaderBase,
} from 'src/components/Common/Card'

export const FillVertical = styled.div`
  display: flex;
  height: 100%;
  flex-direction: column;
`

export const CardL1 = styled(CardL1Base)`
  flex: 1;

  @media (max-width: ${(props) => props.theme.lg}) {
    display: none;
    margin-bottom: 15px;
  }

  background-color: ${(props) => props.theme.gray100};
`

export const CardL1Header = styled(CardL1HeaderBase)``

export const CardL1Body = styled(CardL1BodyBase)`
  display: flex;
  flex-direction: column;
  opacity: 0.85;
`

export const FlexRight = styled.div`
  align-content: flex-start;
`

export const Centered = styled.div`
  margin: auto;
`

export const PreviousResultsHeaderIcon = styled(FaClock)`
  margin: auto;
  margin-right: 0.5rem;
  margin-bottom: 5px;
`

export function PreviousResultsCard() {
  const { t } = useTranslation()

  return (
    <FillVertical>
      <CardL1>
        <CardL1Body>
          <Centered>
            <h3>{t('Coming soon!')}</h3>
            {t('Stay tuned ')}
            <LinkTwitter username={TWITTER_USERNAME_RAW} />
          </Centered>
        </CardL1Body>
      </CardL1>
    </FillVertical>
  )
}

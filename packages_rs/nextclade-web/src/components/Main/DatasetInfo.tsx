import copy from 'fast-copy'
import React, { useMemo } from 'react'
import { Col, Container, Row } from 'reactstrap'

import styled from 'styled-components'

import type { Dataset } from 'src/algorithms/types'
import { formatDateIsoUtcSimple } from 'src/helpers/formatDate'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

export const DatasetInfoContainer = styled(Container)`
  padding: 0;
`

export const DatasetName = styled.h5`
  font-weight: bold;
  padding: 0.25rem 0;
  margin: 0;
`

export const DatasetInfoLine = styled.p`
  text-align: start;
  font-size: 0.9rem;
  padding: 0;
  margin: 0;
`

export const DatasetInfoLineTitle = styled.span`
  font-weight: bold;
`

export interface DatasetInfoProps {
  dataset: Dataset
}

export function DatasetInfo({ dataset }: DatasetInfoProps) {
  const { t } = useTranslationSafe()
  const tagFormatted = useMemo(() => dataset && formatDateIsoUtcSimple(dataset.attributes.tag.value), [dataset])

  const attributes = {
    ...copy(dataset.attributes),
    'Animal': {
      isDefault: false,
      value: 'unicorn',
      valueFriendly: 'Unicorn',
    },
    'Color': {
      isDefault: false,
      value: 'rainbow-stripes',
      valueFriendly: 'Rainbow stripes',
    },
    'Favourite ice cream': {
      isDefault: false,
      value: 'strawberry-banana',
      valueFriendly: 'Strawberry & banana',
    },
    'Has Magic': {
      isDefault: false,
      value: 'yes',
      valueFriendly: 'Yes',
    },
  }

  const { name, reference } = attributes

  const attrComponents = useMemo(
    () =>
      Object.entries(attributes)
        .filter(([key]) => !['name', 'reference', 'tag'].includes(key))
        .map(([key, val]) => (
          <DatasetInfoLine key={key}>
            <DatasetInfoLineTitle>{`${key}: `}</DatasetInfoLineTitle>
            {val.valueFriendly ?? val.value}
          </DatasetInfoLine>
        )),
    [attributes],
  )

  return (
    <DatasetInfoContainer>
      <Row noGutters>
        <Col>
          <DatasetName>{name.valueFriendly ?? name.value}</DatasetName>
        </Col>
      </Row>

      <Row noGutters>
        <Col md={8}>
          <div className="mr-2">
            <DatasetInfoLine>
              <DatasetInfoLineTitle>{t('Reference: ')}</DatasetInfoLineTitle>

              {t('{{ name }} ({{ accession }})', {
                name: reference.valueFriendly ?? 'Untitled',
                accession: reference.value,
              })}
            </DatasetInfoLine>
            <DatasetInfoLine>
              <DatasetInfoLineTitle>{t('Last update: ')}</DatasetInfoLineTitle>
              {t('{{updated}}', { updated: tagFormatted })}
            </DatasetInfoLine>
            <DatasetInfoLine>
              <DatasetInfoLineTitle>{t('Last changes: ')}</DatasetInfoLineTitle>
              {t('{{changes}}', { changes: dataset.comment })}
            </DatasetInfoLine>
          </div>
        </Col>
        <Col md={4}>{attrComponents}</Col>
      </Row>
    </DatasetInfoContainer>
  )
}

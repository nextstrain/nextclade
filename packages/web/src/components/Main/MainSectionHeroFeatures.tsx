import React from 'react'

import { useTranslation } from 'react-i18next'
import { Col, Row } from 'reactstrap'
import styled from 'styled-components'

export const FeatureBoxContainer = styled.div`
  margin: 10px 5px;

  @media (max-width: 767.98px) {
    display: none;
  }
`

export const FeatureBox = styled.div`
  margin: 3px 5px;
  padding: 20px 10px;
  border-radius: 3px;
  box-shadow: ${(props) => props.theme.shadows.light};

  h3 {
    font-size: 1.25rem;
    font-weight: bold;
  }

  p {
    font-size: 0.75rem;
    text-align: center;
  }
`

export const FeatureBoxTop = styled(FeatureBox)`
  min-height: 120px;
  color: #3a6598;
`

export const FeatureBoxBottom = styled(FeatureBox)`
  color: #6d9239;
  height: 200px;
`

export function MainSectionHeroFeatures() {
  const { t } = useTranslation()

  return (
    <FeatureBoxContainer>
      <Row noGutters className="mx-auto text-center">
        <Col md={6} className="mb-2">
          <FeatureBoxTop>
            <h3>{t('Simple')}</h3>
            <p>{t('No installation or setup - drop a file and see the results')}</p>
          </FeatureBoxTop>
        </Col>

        <Col md={6} className="mb-2">
          <FeatureBoxTop>
            <h3>{t('Private')}</h3>
            <p>{t('No remote processing - sequence data never leaves your computer')}</p>
          </FeatureBoxTop>
        </Col>
      </Row>

      <Row noGutters className="text-center">
        <Col md={3} className="mb-2">
          <FeatureBoxBottom>
            <h3>{t('Mutation Calling')}</h3>
            <p>{t('Find differences of your sequences relative to the reference in standard numbering')}</p>
          </FeatureBoxBottom>
        </Col>

        <Col md={3} className="mb-2">
          <FeatureBoxBottom>
            <h3>{t('Clade Assignment')}</h3>
            <p>{t('Find out which Nextstrain clades your samples are from')}</p>
          </FeatureBoxBottom>
        </Col>

        <Col md={3} className="mb-2">
          <FeatureBoxBottom>
            <h3>{t('Phylogenetic Placement')}</h3>
            <p>{t('See where on the SARS-CoV-2 tree your sequences fall')}</p>
          </FeatureBoxBottom>
        </Col>

        <Col md={3} className="mb-2">
          <FeatureBoxBottom>
            <h3>{t('Quality Control')}</h3>
            <p>{t('Check your data against multiple QC metrics')}</p>
          </FeatureBoxBottom>
        </Col>
      </Row>
    </FeatureBoxContainer>
  )
}

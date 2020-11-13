import React from 'react'

import { useTranslation } from 'react-i18next'
import { Col, Row } from 'reactstrap'

export function MainSectionHeroFeatures() {
  const { t } = useTranslation()

  return (
    <>
      <Row noGutters className="mx-auto text-center">
        <Col md={6} className="mb-2">
          <div className="mx-1 hero-feature-box hero-feature-box-top">
            <h3 className="hero-h3">{t('Simple')}</h3>
            <div className="small">{t('No installation or setup - drop a file and see the results')}</div>
          </div>
        </Col>

        <Col md={6} className="mb-2">
          <div className="mx-1 hero-feature-box hero-feature-box-top">
            <h3 className="hero-h3 text-center">{t('Private')}</h3>
            <div className="small">{t('No remote processing - sequence data never leaves your computer')}</div>
          </div>
        </Col>
      </Row>

      <Row noGutters className="text-center my-4">
        <Col md={3} className="mb-2">
          <div className="mx-1 hero-feature-box hero-feature-box-bottom h-100">
            <h3 className="hero-h3">{t('Mutation Calling')}</h3>
            <div className="small">
              {t('Find differences of your sequences relative to the reference in standard numbering')}
            </div>
          </div>
        </Col>

        <Col md={3} className="mb-2">
          <div className="mx-1 hero-feature-box hero-feature-box-bottom h-100">
            <h3 className="hero-h3">{t('Clade Assignment')}</h3>
            <div className="small">{t('Find out which Nextstrain clades your samples are from')}</div>
          </div>
        </Col>

        <Col md={3} className="mb-2">
          <div className="mx-1 hero-feature-box hero-feature-box-bottom h-100">
            <h3 className="hero-h3">{t('Phylogenetic Placement')}</h3>
            <div className="small">{t('See where on the SARS-CoV-2 tree your sequences fall')}</div>
          </div>
        </Col>

        <Col md={3} className="mb-2">
          <div className="mx-1 hero-feature-box hero-feature-box-bottom h-100">
            <h3 className="hero-h3">{t('Quality Control')}</h3>
            <div className="small">{t('Check your data against multiple QC metrics')}</div>
          </div>
        </Col>
      </Row>
    </>
  )
}

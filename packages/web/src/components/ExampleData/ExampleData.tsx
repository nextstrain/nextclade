import React from 'react'

import { Card, CardBody, Col, Row } from 'reactstrap'
import { useTranslation } from 'react-i18next'

import { LinkExternal } from 'src/components/Link/LinkExternal'

import { exampleCladeData } from '../../../../../data/clades/exampleCladeData.json'
import ExampleDataContent from './ExampleDataContent.md'

export interface ExampleDatumGenome {
  name: string
  url: string
}

export interface ExampleDatum {
  clade: string
  cladeUrl?: string
  fastaUrl: string
  genomes: ExampleDatumGenome[]
  mutations: string[]
}

export interface ExampleDataGenomeProps {
  genome: ExampleDatumGenome
}

export function ExampleGenome({ genome }: ExampleDataGenomeProps) {
  const { name, url } = genome

  return (
    <li>
      <LinkExternal href={url}>{name}</LinkExternal>
    </li>
  )
}

export interface ExampleCladeProps {
  exampleDatum: ExampleDatum
}

export function ExampleClade({ exampleDatum }: ExampleCladeProps) {
  const { t } = useTranslation()

  const { clade, cladeUrl, fastaUrl, genomes, mutations } = exampleDatum

  return (
    <li className="mt-4">
      <LinkExternal href={cladeUrl}>
        <h4>{clade}</h4>
      </LinkExternal>

      <span>
        <h5 className="d-inline">{t('Representative genomes')}</h5>
        {' ('}
        <LinkExternal href={fastaUrl} download>
          {t('download')}
        </LinkExternal>
        {'):'}
      </span>

      <ul>
        {genomes.map((genome) => (
          <ExampleGenome key={genome.name} genome={genome} />
        ))}
      </ul>

      <h5 className="d-inline">{t('Mutations:')}</h5>
      <ul>
        {mutations.map((mutation) => (
          <li key={mutation}>{mutation}</li>
        ))}
      </ul>
    </li>
  )
}

export function ExampleData() {
  const { t } = useTranslation()

  return (
    <Card>
      <CardBody>
        <Row noGutters>
          <Col>
            <h3 id="example-public-data" className="text-center">
              {t('Example Public Data')}
            </h3>

            <ExampleDataContent />

            <ul>
              {exampleCladeData.map((exampleDatum) => (
                <ExampleClade key={exampleDatum.clade} exampleDatum={exampleDatum} />
              ))}
            </ul>
          </Col>
        </Row>
      </CardBody>
    </Card>
  )
}

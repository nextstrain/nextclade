import React from 'react'

import { Col, Row } from 'reactstrap'

import { About } from 'src/components/About/About'
import { Downloads } from 'src/components/Main/Downloads'
import { ExampleData } from 'src/components/ExampleData/ExampleData'

export function MainSectionInfo() {
  return (
    <Row noGutters className="mx-2 mt-3 main-info-section">
      <Col>
        <Row noGutters>
          <Col>
            <Downloads />
          </Col>
        </Row>

        <Row noGutters className="mt-3">
          <Col>
            <ExampleData />
          </Col>
        </Row>

        <Row noGutters className="mt-3 mx-auto">
          <Col>
            <About />
          </Col>
        </Row>
      </Col>
    </Row>
  )
}

import React, { useCallback } from 'react'

import produce from 'immer'
import styled from 'styled-components'
import { connect } from 'react-redux'
import { Card as ReactstrapCard, CardBody, CardHeader as ReactstrapCardHeader, Col, Form, Row } from 'reactstrap'

import { State } from 'src/state/reducer'
import { selectQcRulesConfig } from 'src/state/settings/settings.selectors'
import { QCRulesConfig } from 'src/algorithms/QC/qcRulesConfig'
import { setQcRulesConfig } from 'src/state/settings/settings.actions'
import { useTranslation } from 'react-i18next'
import { CardHeaderWithToggle } from 'src/components/Common/CardHeaderWithToggle'
import { NumericField } from '../Common/NumericField'

export type QCConfigUpdater = (config: QCRulesConfig) => void

export const Card = styled(ReactstrapCard)`
  margin: 5px 5px;
  min-height: 230px;
`

export const CardHeader = styled(ReactstrapCardHeader)`
  padding: 10px 10px;
  margin: 0;
`

const mapStateToProps = (state: State) => ({
  qcRulesConfig: selectQcRulesConfig(state),
})

const mapDispatchToProps = {
  setQcRulesConfig: (config: QCRulesConfig) => setQcRulesConfig(config),
}

export const SettingsDialog = connect(mapStateToProps, mapDispatchToProps)(SettingsDialogDisconnected)

export interface SettingsDialogProps {
  qcRulesConfig: QCRulesConfig
  setQcRulesConfig(qcRulesConfig: QCRulesConfig): void
}

function SettingsDialogDisconnected({ qcRulesConfig, setQcRulesConfig }: SettingsDialogProps) {
  const { t } = useTranslation()

  const { missingData, privateMutations, mixedSites, snpClusters } = qcRulesConfig

  const updateQcConfig = useCallback(
    (f: QCConfigUpdater) => {
      const newQcRulesConfig = produce(qcRulesConfig, f)
      setQcRulesConfig(newQcRulesConfig)
    },
    [qcRulesConfig, setQcRulesConfig],
  )

  return (
    <Row noGutters>
      <Col>
        <Row noGutters>
          <Col>
            <Card>
              <CardHeader>
                <CardHeaderWithToggle
                  identifier={'missing-data-toggle'}
                  text={t('Rule: Missing data')}
                  checked={missingData.enabled}
                  onValueChanged={(enabled: boolean) =>
                    updateQcConfig((config) => {
                      config.missingData.enabled = enabled
                    })
                  }
                />
              </CardHeader>
              <CardBody>
                <Form>
                  <NumericField
                    identifier={'missing-data-threshold'}
                    label={t('Threshold')}
                    disabled={!missingData.enabled}
                    value={missingData.missingDataThreshold}
                    min={0}
                    max={10000}
                    onValueChanged={(missingDataThreshold: number) =>
                      updateQcConfig((config) => {
                        config.missingData.missingDataThreshold = missingDataThreshold
                      })
                    }
                  />

                  <NumericField
                    identifier={'missing-data-score-bias'}
                    label={t('Typical value')}
                    disabled={!missingData.enabled}
                    value={missingData.scoreBias}
                    min={0}
                    max={10000}
                    onValueChanged={(scoreBias: number) =>
                      updateQcConfig((config) => {
                        config.missingData.scoreBias = scoreBias
                      })
                    }
                  />
                </Form>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardHeaderWithToggle
                  identifier={'mixed-sites-toggle'}
                  text={t('Rule: Mixed sites')}
                  checked={mixedSites.enabled}
                  onValueChanged={(enabled: boolean) =>
                    updateQcConfig((config) => {
                      config.mixedSites.enabled = enabled
                    })
                  }
                />
              </CardHeader>
              <CardBody>
                <Form>
                  <NumericField
                    identifier={'mixed-sites-threshold'}
                    label={t('Threshold')}
                    disabled={!mixedSites.enabled}
                    value={mixedSites.mixedSitesThreshold}
                    min={0}
                    max={10000}
                    onValueChanged={(mixedSitesThreshold: number) =>
                      updateQcConfig((config) => {
                        config.mixedSites.mixedSitesThreshold = mixedSitesThreshold
                      })
                    }
                  />
                </Form>
              </CardBody>
            </Card>
          </Col>

          <Col>
            <Card>
              <CardHeader>
                <CardHeaderWithToggle
                  identifier={'snp-clusters-toggle'}
                  text={t('Rule: Clustered mutations')}
                  checked={snpClusters.enabled}
                  onValueChanged={(enabled: boolean) =>
                    updateQcConfig((config) => {
                      config.snpClusters.enabled = enabled
                    })
                  }
                />
              </CardHeader>
              <CardBody>
                <Form>
                  <NumericField
                    identifier={'snp-clusters-cluster-cut-off'}
                    label={t('Number of mutations in window')}
                    disabled={!snpClusters.enabled}
                    value={snpClusters.clusterCutOff}
                    min={0}
                    max={10000}
                    onValueChanged={(clusterCutOff: number) =>
                      updateQcConfig((config) => {
                        config.snpClusters.clusterCutOff = clusterCutOff
                      })
                    }
                  />

                  <NumericField
                    identifier={'snp-clusters-window-size'}
                    label={t('Window size')}
                    disabled={!snpClusters.enabled}
                    value={snpClusters.windowSize}
                    min={0}
                    max={10000}
                    onValueChanged={(windowSize: number) =>
                      updateQcConfig((config) => {
                        config.snpClusters.windowSize = windowSize
                      })
                    }
                  />

                  <NumericField
                    identifier={'snp-clusters-score-weight'}
                    label={t('Penalty per cluster')}
                    disabled={!snpClusters.enabled}
                    value={snpClusters.scoreWeight}
                    min={0}
                    max={10000}
                    onValueChanged={(scoreWeight: number) =>
                      updateQcConfig((config) => {
                        config.snpClusters.scoreWeight = scoreWeight
                      })
                    }
                  />
                </Form>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardHeaderWithToggle
                  identifier={'private-mutations-toggle'}
                  text={t('Rule: Private mutations')}
                  checked={privateMutations.enabled}
                  onValueChanged={(enabled: boolean) =>
                    updateQcConfig((config) => {
                      config.privateMutations.enabled = enabled
                    })
                  }
                />
              </CardHeader>
              <CardBody>
                <Form>
                  <NumericField
                    identifier={'private-mutations-typical'}
                    label={t('Typical')}
                    disabled={!privateMutations.enabled}
                    value={privateMutations.typical}
                    min={0}
                    max={10000}
                    onValueChanged={(typical: number) =>
                      updateQcConfig((config) => {
                        config.privateMutations.typical = typical
                      })
                    }
                  />

                  <NumericField
                    identifier={'private-mutations-cut-off'}
                    label={t('Cut-off')}
                    disabled={!privateMutations.enabled}
                    value={privateMutations.cutoff}
                    min={0}
                    max={10000}
                    onValueChanged={(cutoff: number) =>
                      updateQcConfig((config) => {
                        config.privateMutations.cutoff = cutoff
                      })
                    }
                  />
                </Form>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Col>
    </Row>
  )
}

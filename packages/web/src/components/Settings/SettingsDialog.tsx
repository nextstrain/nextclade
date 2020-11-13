import React, { useCallback } from 'react'

import produce from 'immer'
import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Col, Form, Row } from 'reactstrap'

import type { State } from 'src/state/reducer'
import type { QCRulesConfig } from 'src/algorithms/QC/types'
import { selectQcRulesConfig } from 'src/state/settings/settings.selectors'
import { setQcRulesConfig } from 'src/state/settings/settings.actions'
import { CardHeaderWithToggle } from 'src/components/Common/CardHeaderWithToggle'
import { NumericField } from 'src/components/Common/NumericField'
import { CardL2, CardL2Body, CardL2Header } from 'src/components/Common/Card'

export type QCConfigUpdater = (config: QCRulesConfig) => void

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
        <CardL2>
          <CardL2Header>
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
          </CardL2Header>
          <CardL2Body>
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
          </CardL2Body>
        </CardL2>

        <CardL2>
          <CardL2Header>
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
          </CardL2Header>
          <CardL2Body>
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
          </CardL2Body>
        </CardL2>
      </Col>

      <Col>
        <CardL2>
          <CardL2Header>
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
          </CardL2Header>
          <CardL2Body>
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
          </CardL2Body>
        </CardL2>

        <CardL2>
          <CardL2Header>
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
          </CardL2Header>
          <CardL2Body>
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
          </CardL2Body>
        </CardL2>
      </Col>
    </Row>
  )
}

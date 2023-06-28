import { desaturate } from 'polished'
import React, { useMemo } from 'react'
import { Col, Container, Form, FormGroup, Label, Row } from 'reactstrap'
import { useRecoilState } from 'recoil'
import { Multitoggle, MultitoggleOption } from 'src/components/Common/Multitoggle'
import { NumericField } from 'src/components/Common/NumericField'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { useRecoilStateDeferred } from 'src/hooks/useRecoilStateDeferred'
import {
  SeqMarkerHeightState,
  seqMarkerMissingHeightStateAtom,
  seqMarkerGapHeightStateAtom,
  seqMarkerMutationHeightStateAtom,
  seqMarkerUnsequencedHeightStateAtom,
  maxNucMarkersAtom,
} from 'src/state/seqViewSettings.state'
import { useTheme } from 'styled-components'

const TOGGLE_WIDTH = 75

export function SeqViewSettings() {
  const { t } = useTranslationSafe()
  const theme = useTheme()

  const [maxNucMarkers, setMaxNucMarkers] = useRecoilStateDeferred(maxNucMarkersAtom)
  const [seqMarkerMissingHeightState, setSeqMarkerMissingHeightState] = useRecoilState(seqMarkerMissingHeightStateAtom)
  const [seqMarkerGapHeightState, setSeqMarkerGapHeightState] = useRecoilState(seqMarkerGapHeightStateAtom)
  const [seqMarkerMutationHeightState, setSeqMarkerMutationHeightState] = useRecoilState(
    seqMarkerMutationHeightStateAtom,
  )
  const [seqMarkerUnsequencedHeightState, setSeqMarkerUnsequencedHeightState] = useRecoilState(
    seqMarkerUnsequencedHeightStateAtom,
  )

  const heightStateOptions: MultitoggleOption<SeqMarkerHeightState>[] = useMemo(
    () => [
      {
        value: SeqMarkerHeightState.Off,
        label: t('Off'),
        color: desaturate(0.175)(theme.danger),
      },
      {
        value: SeqMarkerHeightState.Top,
        label: t('Top'),
        color: desaturate(0.175)(theme.warning),
      },
      {
        value: SeqMarkerHeightState.Bottom,
        label: t('Bottom'),
        color: desaturate(0.175)(theme.warning),
      },
      {
        value: SeqMarkerHeightState.Full,
        label: t('Full'),
        color: desaturate(0.175)(theme.success),
      },
    ],
    [t, theme.danger, theme.success, theme.warning],
  )

  return (
    <Container fluid>
      <Row noGutters>
        <Col>
          <Form>
            <NumericField
              identifier="max-nuc-markers"
              label={t('Maximum number of nucleotide sequence view markers')}
              title={t(
                'Sets threshold on maximum number of markers (mutations, deletions etc.) to display in nucleotide views. Reducing this number increases performance. If the threshold is reached, then the nucleotide sequence view will be disabled.',
              )}
              min={0}
              max={1_000_000}
              value={maxNucMarkers}
              onValueChanged={setMaxNucMarkers}
            />

            <FormGroup>
              {t('Missing')}
              <Multitoggle<SeqMarkerHeightState>
                options={heightStateOptions}
                value={seqMarkerMissingHeightState}
                onChange={setSeqMarkerMissingHeightState}
                itemWidth={TOGGLE_WIDTH}
              />
            </FormGroup>

            <FormGroup>
              <Label>
                {t('Gaps')}
                <Multitoggle<SeqMarkerHeightState>
                  options={heightStateOptions}
                  value={seqMarkerGapHeightState}
                  onChange={setSeqMarkerGapHeightState}
                  itemWidth={TOGGLE_WIDTH}
                />
              </Label>
            </FormGroup>

            <FormGroup>
              <Label>
                {t('Mutations')}
                <Multitoggle<SeqMarkerHeightState>
                  options={heightStateOptions}
                  value={seqMarkerMutationHeightState}
                  onChange={setSeqMarkerMutationHeightState}
                  itemWidth={TOGGLE_WIDTH}
                />
              </Label>
            </FormGroup>

            <FormGroup>
              <Label>
                {t('Unsequenced')}
                <Multitoggle<SeqMarkerHeightState>
                  options={heightStateOptions}
                  value={seqMarkerUnsequencedHeightState}
                  onChange={setSeqMarkerUnsequencedHeightState}
                  itemWidth={TOGGLE_WIDTH}
                />
              </Label>
            </FormGroup>
          </Form>
        </Col>
      </Row>
    </Container>
  )
}

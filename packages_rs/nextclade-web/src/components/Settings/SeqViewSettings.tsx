import React, { useCallback, useMemo } from 'react'
import { Col, Container, Form, FormGroup, Label, Row } from 'reactstrap'
import { RecoilState, useRecoilState } from 'recoil'
import { Multitoggle } from 'src/components/Common/Multitoggle'
import { NumericField } from 'src/components/Common/NumericField'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { useRecoilStateDeferred } from 'src/hooks/useRecoilStateDeferred'
import {
  SEQ_MARKER_HEIGHT_STATES,
  SeqMarkerHeightState,
  seqMarkerHeightStateFromString,
  seqMarkerMissingHeightStateAtom,
  seqMarkerHeightStateToString,
  seqMarkerGapHeightStateAtom,
  seqMarkerMutationHeightStateAtom,
  seqMarkerUnsequencedHeightStateAtom,
  maxNucMarkersAtom,
  seqMarkerAmbiguousHeightStateAtom,
} from 'src/state/seqViewSettings.state'

/** Adapts Recoil state  `enum` to `string` */
export function useEnumRecoilState<T>(
  state: RecoilState<T>,
  serialize: (x: T) => string,
  deserialize: (k: string) => T,
): [string, (k: string) => void] {
  const [enumValue, setEnumValue] = useRecoilState(state)

  const stringValue = useMemo(() => {
    return serialize(enumValue)
  }, [enumValue, serialize])

  const setStringValue = useCallback(
    (key: string) => {
      const e = deserialize(key)
      setEnumValue(e)
    },
    [deserialize, setEnumValue],
  )

  return [stringValue, setStringValue]
}

export function useSeqMarkerState(state: RecoilState<SeqMarkerHeightState>) {
  return useEnumRecoilState(state, seqMarkerHeightStateToString, seqMarkerHeightStateFromString)
}

export function SeqViewSettings() {
  const { t } = useTranslationSafe()

  const [maxNucMarkers, setMaxNucMarkers] = useRecoilStateDeferred(maxNucMarkersAtom)

  const [seqMarkerMissingHeightState, setSeqMarkerMissingHeightState] = useSeqMarkerState(
    seqMarkerMissingHeightStateAtom,
  )

  const [seqMarkerAmbiguousHeightState, setSeqMarkerAmbiguousHeightState] = useSeqMarkerState(
    seqMarkerAmbiguousHeightStateAtom,
  )

  const [seqMarkerGapHeightState, setSeqMarkerGapHeightState] = useSeqMarkerState(seqMarkerGapHeightStateAtom)

  const [seqMarkerMutationHeightState, setSeqMarkerMutationHeightState] = useSeqMarkerState(
    seqMarkerMutationHeightStateAtom,
  )

  const [seqMarkerUnsequencedHeightState, setSeqMarkerUnsequencedHeightState] = useSeqMarkerState(
    seqMarkerUnsequencedHeightStateAtom,
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
              <Multitoggle
                values={SEQ_MARKER_HEIGHT_STATES}
                value={seqMarkerMissingHeightState}
                onChange={setSeqMarkerMissingHeightState}
              />
            </FormGroup>

            <FormGroup>
              {t('Ambiguous')}
              <Multitoggle
                values={SEQ_MARKER_HEIGHT_STATES}
                value={seqMarkerAmbiguousHeightState}
                onChange={setSeqMarkerAmbiguousHeightState}
              />
            </FormGroup>

            <FormGroup>
              <Label>
                {t('Gaps')}
                <Multitoggle
                  values={SEQ_MARKER_HEIGHT_STATES}
                  value={seqMarkerGapHeightState}
                  onChange={setSeqMarkerGapHeightState}
                />
              </Label>
            </FormGroup>

            <FormGroup>
              <Label>
                {t('Mutations')}
                <Multitoggle
                  values={SEQ_MARKER_HEIGHT_STATES}
                  value={seqMarkerMutationHeightState}
                  onChange={setSeqMarkerMutationHeightState}
                />
              </Label>
            </FormGroup>

            <FormGroup>
              <Label>
                {t('Unsequenced')}
                <Multitoggle
                  values={SEQ_MARKER_HEIGHT_STATES}
                  value={seqMarkerUnsequencedHeightState}
                  onChange={setSeqMarkerUnsequencedHeightState}
                />
              </Label>
            </FormGroup>
          </Form>
        </Col>
      </Row>
    </Container>
  )
}

import React, { useCallback, useMemo } from 'react'
import { Col, Container, Form, FormGroup, Label, Row } from 'reactstrap'
import { RecoilState, useRecoilState } from 'recoil'
import { Multitoggle } from 'src/components/Common/Multitoggle'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import {
  SEQ_MARKER_HEIGHT_STATES,
  SeqMarkerHeightState,
  seqMarkerHeightStateFromString,
  seqMarkerMissingHeightStateAtom,
  seqMarkerHeightStateToString,
  seqMarkerGapHeightStateAtom,
  seqMarkerMutationHeightStateAtom,
  seqMarkerUnsequencedHeightStateAtom,
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

  const [seqMarkerMissingHeightState, setSeqMarkerMissingHeightState] = useSeqMarkerState(
    seqMarkerMissingHeightStateAtom,
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
            <FormGroup>
              {t('Missing')}
              <Multitoggle
                values={SEQ_MARKER_HEIGHT_STATES}
                value={seqMarkerMissingHeightState}
                onChange={setSeqMarkerMissingHeightState}
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

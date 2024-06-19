import React, { useCallback, useMemo } from 'react'
import { Form, FormGroup, Label } from 'reactstrap'
import { RecoilState, useRecoilState } from 'recoil'
import { Multitoggle } from 'src/components/Common/Multitoggle'
import { NumericField } from 'src/components/Common/NumericField'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { useRecoilStateDeferred } from 'src/hooks/useRecoilStateDeferred'
import {
  SEQ_MARKER_HEIGHT_STATES,
  SEQ_MARKER_STATES,
  SeqMarkerHeightState,
  SeqMarkerState,
  maxNucMarkersAtom,
  seqMarkerAmbiguousHeightStateAtom,
  seqMarkerFrameShiftStateAtom,
  seqMarkerGapHeightStateAtom,
  seqMarkerHeightStateFromString,
  seqMarkerHeightStateToString,
  seqMarkerInsertionStateAtom,
  seqMarkerMissingHeightStateAtom,
  seqMarkerMutationHeightStateAtom,
  seqMarkerStateFromString,
  seqMarkerStateToString,
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

export function useSeqMarkerHeightState(state: RecoilState<SeqMarkerHeightState>) {
  return useEnumRecoilState(state, seqMarkerHeightStateToString, seqMarkerHeightStateFromString)
}

export function useSeqMarkerState(state: RecoilState<SeqMarkerState>) {
  return useEnumRecoilState(state, seqMarkerStateToString, seqMarkerStateFromString)
}

export function SeqViewSettings() {
  const { t } = useTranslationSafe()

  const [maxNucMarkers, setMaxNucMarkers] = useRecoilStateDeferred(maxNucMarkersAtom)

  const [seqMarkerMissingHeightState, setSeqMarkerMissingHeightState] = useSeqMarkerHeightState(
    seqMarkerMissingHeightStateAtom,
  )

  const [seqMarkerAmbiguousHeightState, setSeqMarkerAmbiguousHeightState] = useSeqMarkerHeightState(
    seqMarkerAmbiguousHeightStateAtom,
  )

  const [seqMarkerGapHeightState, setSeqMarkerGapHeightState] = useSeqMarkerHeightState(seqMarkerGapHeightStateAtom)

  const [seqMarkerMutationHeightState, setSeqMarkerMutationHeightState] = useSeqMarkerHeightState(
    seqMarkerMutationHeightStateAtom,
  )

  const [seqMarkerUnsequencedHeightState, setSeqMarkerUnsequencedHeightState] = useSeqMarkerHeightState(
    seqMarkerUnsequencedHeightStateAtom,
  )

  const [seqMarkerInsertionState, setSeqMarkerInsertionState] = useSeqMarkerState(seqMarkerInsertionStateAtom)

  const [seqMarkerFrameShiftState, setSeqMarkerFrameShiftState] = useSeqMarkerState(seqMarkerFrameShiftStateAtom)

  const labels: Record<SeqMarkerHeightState, string> = useMemo(
    () => ({
      [SeqMarkerHeightState.Off]: t('off'),
      [SeqMarkerHeightState.Top]: t('top'),
      [SeqMarkerHeightState.Bottom]: t('bottom'),
      [SeqMarkerHeightState.Full]: t('full'),
    }),
    [t],
  )

  const labelsSpecial: Record<SeqMarkerState, string> = useMemo(
    () => ({
      [SeqMarkerState.Off]: t('off'),
      [SeqMarkerState.On]: t('on'),
    }),
    [t],
  )

  return (
    <Form>
      <NumericField
        identifier="max-nuc-markers"
        label={t('Max. nucleotide markers')}
        title={t(
          'Set threshold on maximum number of markers (mutations, deletions etc.) to display in nucleotide views. Reducing this number increases performance. If the threshold is reached, then the nucleotide sequence view will be disabled.',
        )}
        min={0}
        max={1_000_000}
        value={maxNucMarkers}
        onValueChanged={setMaxNucMarkers}
      />

      <FormGroup className="mt-3">
        <Label className="pointer-events-none" title={t('Toggle height of markers for mutated characters')}>
          {t('Mutation markers')}
          <Multitoggle
            values={SEQ_MARKER_HEIGHT_STATES}
            labels={labels}
            currentValue={seqMarkerMutationHeightState}
            onChange={setSeqMarkerMutationHeightState}
          />
        </Label>
      </FormGroup>

      <FormGroup>
        <Label className="pointer-events-none" title={t('Toggle height of markers for deletions')}>
          {t('Deletion markers')}
          <Multitoggle
            values={SEQ_MARKER_HEIGHT_STATES}
            labels={labels}
            currentValue={seqMarkerGapHeightState}
            onChange={setSeqMarkerGapHeightState}
          />
        </Label>
      </FormGroup>

      <FormGroup>
        <Label className="pointer-events-none" title={t('Toggle height of markers for ambiguous characters')}>
          {t('Ambiguous markers')}
          <Multitoggle
            values={SEQ_MARKER_HEIGHT_STATES}
            labels={labels}
            currentValue={seqMarkerAmbiguousHeightState}
            onChange={setSeqMarkerAmbiguousHeightState}
          />
        </Label>
      </FormGroup>

      <FormGroup>
        <Label className="pointer-events-none" title={t('Toggle height of markers for missing ranges')}>
          {t('Missing ranges')}
          <Multitoggle
            values={SEQ_MARKER_HEIGHT_STATES}
            labels={labels}
            currentValue={seqMarkerMissingHeightState}
            onChange={setSeqMarkerMissingHeightState}
          />
        </Label>
      </FormGroup>

      <FormGroup>
        <Label className="pointer-events-none" title={t('Toggle height of markers for unsequenced ranges')}>
          {t('Unsequenced ranges')}
          <Multitoggle
            values={SEQ_MARKER_HEIGHT_STATES}
            labels={labels}
            currentValue={seqMarkerUnsequencedHeightState}
            onChange={setSeqMarkerUnsequencedHeightState}
          />
        </Label>
      </FormGroup>

      <FormGroup>
        <Label className="pointer-events-none" title={t('Toggle markers for insertions')}>
          {t('Insertions')}
          <Multitoggle
            values={SEQ_MARKER_STATES}
            labels={labelsSpecial}
            currentValue={seqMarkerInsertionState}
            onChange={setSeqMarkerInsertionState}
          />
        </Label>
      </FormGroup>

      <FormGroup>
        <Label className="pointer-events-none" title={t('Toggle markers for insertions')}>
          {t('Frame shifts')}
          <Multitoggle
            values={SEQ_MARKER_STATES}
            labels={labelsSpecial}
            currentValue={seqMarkerFrameShiftState}
            onChange={setSeqMarkerFrameShiftState}
          />
        </Label>
      </FormGroup>
    </Form>
  )
}

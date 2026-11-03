import { snapshot_UNSTABLE, type MutableSnapshot } from 'recoil'
import {
  allDatasetSuggestionResultsAtom,
  AutodetectRunState,
  autodetectErrorAtom,
  autodetectRunStateAtom,
  canResetSuggestionsAndCurrentDatasetAtom,
} from 'src/state/autodetect.state'
import { allDatasetsAtom, datasetSelectionAtom, datasetsAtom } from 'src/state/dataset.state'
import type { Dataset } from 'src/types'

const DATASET: Dataset = { path: 'nextstrain/rsv/a/EPI_ISL_412866' }

describe('canResetSuggestionsAndCurrentDatasetAtom', () => {
  it.each([
    { name: 'nothing to reset on a fresh page', state: {}, expected: false },
    { name: 'dataset selected without suggestion run', state: { selected: true }, expected: true },
    { name: 'suggestion run found no matching datasets', state: { run: AutodetectRunState.Done }, expected: true },
    {
      name: 'suggestion run failed',
      state: { run: AutodetectRunState.Failed, error: new Error('Invalid FASTA') },
      expected: true,
    },
    {
      name: 'suggestion run found matching datasets',
      state: { run: AutodetectRunState.Done, suggested: true, selected: true },
      expected: true,
    },
    { name: 'suggestion run in progress', state: { run: AutodetectRunState.Started, selected: true }, expected: false },
  ])('is $expected when $name', ({ state, expected }) => {
    const snapshot = snapshot_UNSTABLE((mutable) => initializeState(mutable, state))
    expect(snapshot.getLoadable(canResetSuggestionsAndCurrentDatasetAtom).getValue()).toBe(expected)
  })
})

function initializeState({ set }: MutableSnapshot, { selected, run, error, suggested }: TestState) {
  set(datasetsAtom, [DATASET])
  set(allDatasetsAtom, [DATASET])
  if (selected) {
    set(datasetSelectionAtom, { path: DATASET.path })
  }
  if (run) {
    set(autodetectRunStateAtom, run)
  }
  if (error) {
    set(autodetectErrorAtom, error)
  }
  if (suggested) {
    set(allDatasetSuggestionResultsAtom, {
      suggestions: [{ name: DATASET.path, nHits: 10, qryIndices: [0] }],
      results: {},
    })
  }
}

interface TestState {
  selected?: boolean
  run?: AutodetectRunState
  error?: Error
  suggested?: boolean
}

import { first, get, isNil, sortBy } from 'lodash'
import type { Subscription } from 'observable-fns'
import { useMemo } from 'react'
import { useRecoilCallback, useRecoilValue } from 'recoil'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import { axiosFetch } from 'src/io/axiosFetch'
import {
  autodetectResultByIndexAtom,
  autodetectResultsAtom,
  AutodetectRunState,
  autodetectRunStateAtom,
  groupByDatasets,
  minimizerIndexAtom,
} from 'src/state/autodetect.state'
import { datasetsAtom, minimizerIndexVersionAtom } from 'src/state/dataset.state'
import { globalErrorAtom } from 'src/state/error.state'
import { MinimizerIndexJson, MinimizerSearchRecord } from 'src/types'
import { qrySeqInputsStorageAtom } from 'src/state/inputs.state'
import { getQueryFasta } from 'src/workers/launchAnalysis'
import { NextcladeSeqAutodetectWasmWorker } from 'src/workers/nextcladeAutodetect.worker'
import { spawn } from 'src/workers/spawn'

export interface AutosuggestionParams {
  shouldSetCurrentDataset?: boolean
}

export function useRunSeqAutodetect() {
  return useRecoilCallback(
    ({ set, reset, snapshot }) =>
      () => {
        const { getPromise } = snapshot

        reset(minimizerIndexAtom)
        reset(autodetectResultsAtom)
        reset(autodetectRunStateAtom)

        function onResult(results: MinimizerSearchRecord[]) {
          results.forEach((res) => {
            set(autodetectResultByIndexAtom(res.fastaRecord.index), res)
          })
        }

        function onError(error: Error) {
          set(autodetectRunStateAtom, AutodetectRunState.Failed)
          set(globalErrorAtom, error)
        }

        function onComplete() {
          set(autodetectRunStateAtom, AutodetectRunState.Done)
        }

        set(autodetectRunStateAtom, AutodetectRunState.Started)

        Promise.all([getPromise(qrySeqInputsStorageAtom), getPromise(minimizerIndexVersionAtom)])
          .then(async ([qrySeqInputs, minimizerIndexVersion]) => {
            if (!minimizerIndexVersion) {
              throw new ErrorInternal('Tried to run minimizer search without minimizer index available')
            }
            const fasta = await getQueryFasta(qrySeqInputs)
            const minimizerIndex: MinimizerIndexJson = await axiosFetch(minimizerIndexVersion.path)
            set(minimizerIndexAtom, minimizerIndex)
            return runAutodetect(fasta, minimizerIndex, { onResult, onError, onComplete })
          })
          .catch((error) => {
            throw error
          })
      },
    [],
  )
}

interface Callbacks {
  onResult: (r: MinimizerSearchRecord[]) => void
  onError?: (error: Error) => void
  onComplete?: () => void
}

async function runAutodetect(fasta: string, minimizerIndex: MinimizerIndexJson, callbacks: Callbacks) {
  const worker = await SeqAutodetectWasmWorker.create(minimizerIndex)
  await worker.autodetect(fasta, callbacks)
  await worker.destroy()
}

export class SeqAutodetectWasmWorker {
  private thread!: NextcladeSeqAutodetectWasmWorker
  private subscription?: Subscription<MinimizerSearchRecord[]>

  private constructor() {}

  static async create(minimizerIndex: MinimizerIndexJson) {
    const self = new SeqAutodetectWasmWorker()
    await self.init(minimizerIndex)
    return self
  }

  async init(minimizerIndex: MinimizerIndexJson) {
    this.thread = await spawn<NextcladeSeqAutodetectWasmWorker>(
      new Worker(new URL('src/workers/nextcladeAutodetect.worker.ts', import.meta.url), {
        name: 'nextcladeAutodetectWorker',
      }),
    )

    await this.thread.create(minimizerIndex)
  }

  async autodetect(fastaStr: string, { onResult, onError, onComplete }: Callbacks) {
    this.subscription = this.thread.values().subscribe(onResult, onError, onComplete)
    await this.thread.autodetect(fastaStr)
  }

  async destroy() {
    this.subscription?.unsubscribe()
    await this.thread.destroy()
  }
}

export function useDatasetSuggestionResults() {
  const { datasets } = useRecoilValue(datasetsAtom)
  const autodetectResults = useRecoilValue(autodetectResultsAtom)
  const result = useMemo(() => {
    if (isNil(autodetectResults) || autodetectResults.length === 0) {
      return { itemsStartWith: [], itemsInclude: datasets, itemsNotInclude: [] }
    }

    const recordsByDataset = groupByDatasets(autodetectResults)

    let itemsInclude = datasets.filter((candidate) =>
      Object.entries(recordsByDataset).some(([dataset, _]) => dataset === candidate.path),
    )

    itemsInclude = sortBy(itemsInclude, (dataset) => -get(recordsByDataset, dataset.path, []).length)

    const itemsNotInclude = datasets.filter((candidate) => !itemsInclude.map((it) => it.path).includes(candidate.path))

    return { itemsStartWith: [], itemsInclude, itemsNotInclude }
  }, [autodetectResults, datasets])

  const datasetsActive = useMemo(() => {
    const { itemsStartWith, itemsInclude } = result
    return [...itemsStartWith, ...itemsInclude]
  }, [result])

  const datasetsInactive = useMemo(() => {
    const { itemsNotInclude } = result
    return itemsNotInclude
  }, [result])

  const showSuggestions = useMemo(() => !isNil(autodetectResults) && autodetectResults.length > 0, [autodetectResults])

  const topSuggestion = autodetectResults ? first(datasetsActive) : undefined

  const numSuggestions = autodetectResults ? datasetsActive.length : 0

  return { datasetsActive, datasetsInactive, topSuggestion, showSuggestions, numSuggestions }
}

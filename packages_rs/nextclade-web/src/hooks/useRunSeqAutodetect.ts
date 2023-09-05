import { useRouter } from 'next/router'
import { NextcladeSeqAutodetectWasm } from 'src/gen/nextclade-wasm'
import { useRecoilCallback } from 'recoil'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import { axiosFetch } from 'src/io/axiosFetch'
import { autodetectResultAtom, autodetectResultsAtom, minimizerIndexAtom } from 'src/state/autodetect.state'
import { minimizerIndexVersionAtom } from 'src/state/dataset.state'
import { MinimizerIndexJson, MinimizerSearchRecord } from 'src/types'
import { qrySeqInputsStorageAtom } from 'src/state/inputs.state'
import { getQueryFasta } from 'src/workers/launchAnalysis'

export function useRunSeqAutodetect() {
  const router = useRouter()

  return useRecoilCallback(
    ({ set, reset, snapshot: { getPromise } }) =>
      () => {
        reset(minimizerIndexAtom)
        reset(autodetectResultsAtom)

        void router.push('/autodetect', '/autodetect') // eslint-disable-line no-void

        function onResult(res: MinimizerSearchRecord) {
          set(autodetectResultAtom(res.fastaRecord.index), res)
        }

        Promise.all([getPromise(qrySeqInputsStorageAtom), getPromise(minimizerIndexVersionAtom)])
          .then(async ([qrySeqInputs, minimizerIndexVersion]) => {
            if (!minimizerIndexVersion) {
              throw new ErrorInternal('Tried to run minimizer search without minimizer index available')
            }
            const fasta = await getQueryFasta(qrySeqInputs)
            const minimizerIndex: MinimizerIndexJson = await axiosFetch(minimizerIndexVersion.path)
            set(minimizerIndexAtom, minimizerIndex)
            return runAutodetect(fasta, minimizerIndex, onResult)
          })
          .catch((error) => {
            throw error
          })
      },
    [router],
  )
}

function runAutodetect(
  fasta: string,
  minimizerIndex: MinimizerIndexJson,
  onResult: (res: MinimizerSearchRecord) => void,
) {
  const nextcladeAutodetect = NextcladeSeqAutodetectWasm.new(JSON.stringify(minimizerIndex))

  function onResultParsed(resStr: string) {
    const result = JSON.parse(resStr) as MinimizerSearchRecord
    onResult(result)
  }

  nextcladeAutodetect.autodetect(fasta, onResultParsed)
}

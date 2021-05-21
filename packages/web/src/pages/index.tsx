// /* eslint-disable promise/always-return,array-func/no-unnecessary-this-arg */
import React, { useEffect, useState } from 'react'
import { connect } from 'react-redux'

import type { AlgorithmInput } from 'src/state/algorithm/algorithm.state'
import type { State } from 'src/state/reducer'
import type { ActionCreator } from 'src/state/util/fsaActions'
import { AlgorithmInputString } from 'src/io/AlgorithmInput'
import {
  algorithmRunAsync,
  setFasta,
  setGeneMap,
  setPcrPrimers,
  setQcSettings,
  setRootSeq,
  setTree,
} from 'src/state/algorithm/algorithm.actions'

import queryStr from '../../../../data/sars-cov-2/sequences.fasta'
import treeJson from '../../../../data/sars-cov-2/tree.json'
import refFastaStr from '../../../../data/sars-cov-2/reference.fasta'
import qcConfigRaw from '../../../../data/sars-cov-2/qc.json'
import geneMapStrRaw from '../../../../data/sars-cov-2/genemap.gff'
import pcrPrimersStrRaw from '../../../../data/sars-cov-2/primers.csv'

const DEFAULT_NUM_THREADS = 4
const numThreads = DEFAULT_NUM_THREADS // FIXME: detect number of threads

export interface IndexProps {
  algorithmRunAsyncTrigger: ActionCreator<void>

  setFastaTrigger(input: AlgorithmInput): void

  setTreeTrigger(input: AlgorithmInput): void

  setRootSeqTrigger(input: AlgorithmInput): void

  setQcSettingsTrigger(input: AlgorithmInput): void

  setGeneMapTrigger(input: AlgorithmInput): void

  setPcrPrimersTrigger(input: AlgorithmInput): void
}

const mapStateToProps = (state: State) => ({})

const mapDispatchToProps = {
  algorithmRunAsyncTrigger: algorithmRunAsync.trigger,
  setFastaTrigger: setFasta.trigger,
  setTreeTrigger: setTree.trigger,
  setRootSeqTrigger: setRootSeq.trigger,
  setQcSettingsTrigger: setQcSettings.trigger,
  setGeneMapTrigger: setGeneMap.trigger,
  setPcrPrimersTrigger: setPcrPrimers.trigger,
}

const Index = connect(mapStateToProps, mapDispatchToProps)(IndexDisconnected)
export default Index

export function IndexDisconnected({
  algorithmRunAsyncTrigger,
  setFastaTrigger,
  setTreeTrigger,
  setRootSeqTrigger,
  setQcSettingsTrigger,
  setGeneMapTrigger,
  setPcrPrimersTrigger,
}: IndexProps) {
  const [value, setValue] = useState<number[]>()

  useEffect(() => {
    setFastaTrigger(new AlgorithmInputString(queryStr))
    setRootSeqTrigger(new AlgorithmInputString(refFastaStr))

    new Promise((resolve) => setTimeout(resolve, 1000))
      .then(() => {
        setTreeTrigger(new AlgorithmInputString(JSON.stringify(treeJson)))
        setQcSettingsTrigger(new AlgorithmInputString(JSON.stringify(qcConfigRaw)))
        setGeneMapTrigger(new AlgorithmInputString(geneMapStrRaw))
        setPcrPrimersTrigger(new AlgorithmInputString(pcrPrimersStrRaw))

        algorithmRunAsyncTrigger()
      })
      .catch(console.error)

    // go()
    //   .then((val) => {
    //     setValue(val)
    //   })
    //   .catch(console.error)
  }, [])

  return <div>{value ?? 'Calculating...'}</div>
}

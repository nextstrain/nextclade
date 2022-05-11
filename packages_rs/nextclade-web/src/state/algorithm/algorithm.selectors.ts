import type { State } from 'src/state/reducer'

export const selectParams = (state: State) => state.algorithm.params

export const selectCurrentDataset = (state: State) => selectParams(state).datasetCurrent

export const selectResults = (state: State) => state.algorithm.results

export const selectResultsArray = (state: State) => state.algorithm.results.map((result) => result.result)

export const selectResultsState = (state: State) => state.algorithm.results

export const selectOutputTree = (state: State): string | undefined => state.algorithm.treeStr

export const selectCladeNodeAttrKeys = (state: State): string[] => state.algorithm.cladeNodeAttrKeys

export const selectOutputSequences = (state: State) => {
  return state.algorithm.results.map((result) => {
    return { seqName: result.seqName, query: result.query }
  })
}

export const selectOutputPeptides = (state: State) => {
  return state.algorithm.results.map((result) => {
    return { seqName: result.seqName, queryPeptides: result.queryPeptides }
  })
}

export const selectExportParams = (state: State) => state.algorithm.exportParams

export const selectGeneMap = (state: State) => state.algorithm.params.final?.geneMap

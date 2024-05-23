import type { ParsedUrlQuery } from 'querystring'
import type { Dataset } from 'src/types'
import { createInputFastasFromUrlParam, createInputFromUrlParamMaybe } from 'src/io/createInputFromUrlParamMaybe'

export async function loadInputs(urlQuery: ParsedUrlQuery, dataset?: Dataset) {
  const inputFastas = await createInputFastasFromUrlParam(urlQuery, dataset)
  const refSeq = await createInputFromUrlParamMaybe(urlQuery, 'input-ref')
  const geneMap = await createInputFromUrlParamMaybe(urlQuery, 'input-annotation')
  const refTree = await createInputFromUrlParamMaybe(urlQuery, 'input-tree')
  const virusProperties = await createInputFromUrlParamMaybe(urlQuery, 'input-pathogen-json')
  return {
    inputFastas,
    refSeq,
    geneMap,
    refTree,
    virusProperties,
  }
}

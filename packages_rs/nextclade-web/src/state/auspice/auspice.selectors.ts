import { get, isEmpty } from 'lodash'

import type { State } from 'src/state/reducer'

export const selectHasTree = (state: State) => !isEmpty(state.tree)

export function selectFilters(state: State) {
  return state?.controls?.filters
}

export function selectNodes(state: State) {
  return state?.tree?.nodes
}

export function selectTraitValueCount(state: State, trait: string, value: string) {
  // TODO(perf): memoize e.g. with reselect
  // NOTE(perf): state?.tree?.totalStateCounts could have been used here to avoid duplicate work,
  // but it currently only counts the default traits and no custom ones (also not clades)
  const nodes = selectNodes(state)
  const selectedNodes = nodes?.filter((node) => get(node?.node_attrs, trait)?.value === value)
  return selectedNodes?.length ?? 0
}

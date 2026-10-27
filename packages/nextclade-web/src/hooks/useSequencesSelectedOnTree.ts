import { isNil } from 'lodash'
import { useMemo } from 'react'
import { useDynamicImport } from 'src/hooks/useDynamicImport'
import { useTreeStoreState } from 'src/hooks/useTreeStoreState'

const NO_SEQUENCES: ReadonlySet<string> = new Set()

/**
 * Return the names of the analyzed sequences that the filters of the tree page select, in the tree of a dataset: the
 * sequences that "show on tree" selects, and the sequences that match the filters that the user sets on the tree page
 */
export function useSequencesSelectedOnTree(datasetName: string): ReadonlySet<string> {
  const state = useTreeStoreState(datasetName)
  const treeSelection = useDynamicImport(importTreeSelection, !isNil(state))

  // The selection depends only on these parts of the store
  const nodes = state?.tree?.nodes
  const filters = state?.controls?.filters
  return useMemo(
    () => treeSelection?.getSelectedSequenceNames({ tree: { nodes }, controls: { filters } }) ?? NO_SEQUENCES,
    [filters, nodes, treeSelection],
  )
}

function importTreeSelection() {
  return import('src/state/auspice/treeSelection')
}

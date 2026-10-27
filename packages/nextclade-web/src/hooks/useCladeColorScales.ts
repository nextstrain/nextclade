import { isNil } from 'lodash'
import { useMemo } from 'react'
import type { CladeColorScale } from 'src/components/Results/cladeColor'
import { useDynamicImport } from 'src/hooks/useDynamicImport'
import { useTreeStoreState } from 'src/hooks/useTreeStoreState'

const NO_SCALES: ReadonlyMap<string, CladeColorScale> = new Map()

/**
 * Return the tree page colors of the clade-like attributes `attrKeys` of a dataset, by attribute. There are no colors
 * until the analysis has built the tree of the dataset and the tree code has loaded
 */
export function useCladeColorScales(
  datasetName: string,
  attrKeys: readonly string[],
): ReadonlyMap<string, CladeColorScale> {
  const state = useTreeStoreState(datasetName)
  const scalesModule = useDynamicImport(loadCladeColorScalesModule, !isNil(state))

  // The scales depend only on these parts of the store
  const { controls, tree, treeToo, metadata } = state ?? {}
  return useMemo(
    () => scalesModule?.getCladeColorScales({ controls, tree, treeToo, metadata }, attrKeys) ?? NO_SCALES,
    [scalesModule, controls, tree, treeToo, metadata, attrKeys],
  )
}

function loadCladeColorScalesModule() {
  return import('src/state/auspice/cladeColorScales')
}

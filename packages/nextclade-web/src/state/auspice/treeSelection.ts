import type { AuspiceControlsState, AuspiceTreeState } from 'auspice'
import { isNil } from 'lodash'
import { getTraitFromNode } from 'auspice/src/util/treeMiscHelpers'
import { getFilteredAndIdxOfFilteredRoot } from 'auspice/src/util/treeVisibilityHelpers'

/** Attribute that tells placed sequences (`New`) from the tips of the reference tree */
const NODE_TYPE = 'Node type'

const NO_SEQUENCES: ReadonlySet<string> = new Set()

/**
 * Return the names of the placed sequences that the filters of the tree select: the tips that match every active filter,
 * as the tree page shows them, whatever the zoom. The tree is filtered to the placed sequences by node type from the
 * start, which selects all of them, so the sequences count as selected only while a filter by another attribute, by
 * name or by genotype is active
 */
export function getSelectedSequenceNames({ tree, controls }: TreeSelectionState): ReadonlySet<string> {
  const nodes = tree?.nodes
  const filters = controls?.filters
  if (isNil(nodes) || isNil(filters) || !hasSelectingFilter(filters)) {
    return NO_SEQUENCES
  }
  const inView = nodes.map(() => true)
  const filtered = getFilteredAndIdxOfFilteredRoot({ nodes }, { filters }, inView)?.filtered
  if (isNil(filtered)) {
    return NO_SEQUENCES
  }
  return new Set(
    nodes
      .filter((node, idx) => filtered[idx] && !node.hasChildren && getTraitFromNode(node, NODE_TYPE) === 'New')
      .map((node) => node.name),
  )
}

/** Parts of the Auspice store that the selection of the tree depends on */
export interface TreeSelectionState {
  tree?: Pick<AuspiceTreeState, 'nodes'>
  controls?: Pick<AuspiceControlsState, 'filters'>
}

function hasSelectingFilter(filters: AuspiceFilters): boolean {
  return Reflect.ownKeys(filters).some(
    (trait) => trait !== NODE_TYPE && (filters[trait] ?? []).some((item) => item.active),
  )
}

type AuspiceFilters = NonNullable<AuspiceControlsState['filters']>

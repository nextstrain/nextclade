import copy from 'fast-copy'
import type { AnyAction } from 'redux'
import type { ThunkAction } from 'redux-thunk'
import type { AuspiceJsonV2, AuspiceReduxNode, AuspiceState } from 'auspice'
import { applyFilter, explodeTree, updateVisibleTipsAndBranchThicknesses } from 'auspice/src/actions/tree'
import { changeColorBy } from 'auspice/src/actions/colors'
import { toggleStreamTree } from 'auspice/src/actions/treeStreams'
import { createTreeTooState } from 'auspice/src/actions/recomputeReduxState'
import { REMOVE_TREE_TOO, TREE_TOO_DATA } from 'auspice/src/actions/types'
import { getCdsByName } from 'auspice/src/util/entropy'
import { encodeColorByGenotype } from 'auspice/src/util/getGenotype'
import { genotypeSymbol, NODE_VISIBLE, nucleotide_gene, strainSymbol } from 'auspice/src/util/globals'
import { getTraitFromNode } from 'auspice/src/util/treeMiscHelpers'

/** Smallest number of tips in the clade that "show on tree" zooms to, so that the sequences are seen with their relatives */
const SHOW_SEQUENCE_MIN_CLADE_TIPS = 20

// NOTE: These actions are not FSA-compliant. This is the format Auspice expects.
//  Be careful when using in a FSA reducer or a saga!
export const auspiceStartClean = (state: AuspiceState) => ({ type: 'CLEAN_START', ...state })
export const treeFilterByNodeType = (nodeTypes: string[]) => applyFilter('add', 'Node type', nodeTypes)

/**
 * Return the tip of the main tree that shows the given analyzed sequence, if any. Auspice renames a node whose name it
 * has already seen, so a sequence whose name occurs more than once in the tree (e.g. a duplicate name in the input, or
 * the name of a reference tip) has no tip of its own
 */
export function findPlacedSequenceNode(state: AuspiceState, seqName: string): AuspiceReduxNode | undefined {
  return state.tree?.nodes?.find(
    (node) => !node.hasChildren && node.name === seqName && getTraitFromNode(node, 'Node type') === 'New',
  )
}

/**
 * Show an analyzed sequence on the tree: filter the tree to it, which dims the other tips, and zoom to a clade around
 * it or keep the zoom. Filters that would hide the sequence are inactivated, so that the user can turn them on again in
 * the header. Stream trees are turned off, because a stream draws its tips as a density and not as single tips
 */
export function showSequenceOnTree(seqName: string, { addToSelection, zoom }: ShowSequenceOnTreeParams): AuspiceThunk {
  return (dispatch, getState) => {
    const node = findPlacedSequenceNode(getState(), seqName)
    if (!node) {
      return
    }

    if (getState().controls?.showStreamTrees) {
      dispatch(toggleStreamTree())
    }

    const filters = getState().controls?.filters ?? {}
    Reflect.ownKeys(filters)
      .filter((trait) => trait !== strainSymbol && trait !== genotypeSymbol)
      .forEach((trait) => {
        const activeValues = activeFilterValues(filters, trait)
        if (activeValues.length > 0 && !activeValues.includes(String(getTraitFromNode(node, trait)))) {
          dispatch(applyFilter('inactivate', trait, activeValues))
        }
      })

    dispatch(applyFilter(addToSelection ? 'add' : 'set', strainSymbol, [seqName]))

    const viewRootIdx = findViewRootToShow(getState(), zoom)
    if (viewRootIdx !== undefined) {
      dispatch(updateVisibleTipsAndBranchThicknesses({ root: [viewRootIdx, undefined] }))
    }

    // Genotype filters match mutations along the path from the root, so whether they hide the sequence is read from
    // the resulting visibility
    const { tree, controls } = getState()
    if (tree?.visibility?.[node.arrayIdx] !== NODE_VISIBLE) {
      const genotypeValues = activeFilterValues(controls?.filters ?? {}, genotypeSymbol)
      if (genotypeValues.length > 0) {
        dispatch(applyFilter('inactivate', genotypeSymbol, genotypeValues))
      }
    }
  }
}

/** How "show on tree" changes the selection and the zoom of the tree */
export interface ShowSequenceOnTreeParams {
  /** Add the sequence to the selected sequences, instead of selecting it alone */
  addToSelection: boolean
  /**
   * Zoom to the smallest clade that contains the selected sequences and has enough tips to show them among their
   * relatives. Otherwise the zoom stays, unless it hides a selected sequence, in which case the whole tree is shown
   */
  zoom: boolean
}

/**
 * Color the tree by the genotype at the given 0-based positions of a CDS, or of the nucleotide sequence. A CDS that the
 * genome map of the tree lacks leaves the coloring as it is
 */
export function colorTreeByPositions(cds: string, positions: number[]): AuspiceThunk {
  return (dispatch, getState) => {
    if (!canColorByCds(getState(), cds)) {
      return
    }
    // Auspice positions are 1-based
    const colorBy = encodeColorByGenotype({ gene: cds, positions: positions.map((pos) => pos + 1) })
    if (colorBy) {
      dispatch(changeColorBy(colorBy))
    }
  }
}

/**
 * Draw a second tree next to the tree of this store, with lines between tips of the same name, as Auspice does when a
 * second dataset is chosen. The coloring, filters and added metadata of the main tree stay. The trees are named after
 * their datasets
 */
export function showSecondTree(secondTree: AuspiceJsonV2, mainTreeName: string, secondTreeName: string): AuspiceThunk {
  return (dispatch, getState) => {
    const { controls } = getState()
    if (controls?.explodeAttr) {
      dispatch(explodeTree(undefined))
    }
    if (getState().controls?.showStreamTrees) {
      dispatch(toggleStreamTree())
    }
    const newState = createTreeTooState({
      json: copy(secondTree),
      oldState: getState(),
      originalTreeUrl: mainTreeName,
      secondTreeUrl: secondTreeName,
      dispatch,
    })
    dispatch({ type: TREE_TOO_DATA, ...newState })
  }
}

/** Remove the second tree, if any */
export function hideSecondTree(): AuspiceThunk {
  return (dispatch, getState) => {
    if (getState().controls?.showTreeToo) {
      dispatch({ type: REMOVE_TREE_TOO })
    }
  }
}

export type AuspiceThunk = ThunkAction<void, AuspiceState, unknown, AnyAction>

function canColorByCds(state: AuspiceState, cds: string): boolean {
  if (cds === nucleotide_gene) {
    return true
  }
  const genomeMap = state.entropy?.genomeMap
  return genomeMap !== undefined && getCdsByName(genomeMap, cds) !== undefined
}

function activeFilterValues(filters: AuspiceFilters, trait: string | symbol): string[] {
  return (filters[trait] ?? []).filter((item) => item.active).map((item) => item.value)
}

type AuspiceFilters = NonNullable<NonNullable<AuspiceState['controls']>['filters']>

/**
 * Return the index of the node to zoom the main tree to, so that the tips selected by the strain filter are in view, or
 * `undefined` to keep the zoom
 */
function findViewRootToShow(state: AuspiceState, zoom: boolean): number | undefined {
  const nodes = state.tree?.nodes ?? []
  const selectedNames = new Set(activeFilterValues(state.controls?.filters ?? {}, strainSymbol))
  const selectedTips = nodes.filter((node) => !node.hasChildren && selectedNames.has(node.name))
  if (zoom) {
    return findCladeToShow(selectedTips)?.arrayIdx
  }
  const viewRoot = nodes[state.tree?.idxOfInViewRootNode ?? 0]
  if (!viewRoot || selectedTips.every((tip) => isInView(tip, viewRoot))) {
    return undefined
  }
  return 0
}

/**
 * Return the smallest clade that contains the given tips and has enough tips to show them among their relatives, or
 * the root
 */
function findCladeToShow(tips: AuspiceReduxNode[]): AuspiceReduxNode | undefined {
  const ancestor = findCommonAncestor(tips)
  if (!ancestor) {
    return undefined
  }
  let clade = ancestor.hasChildren ? ancestor : ancestor.parent
  while (clade.fullTipCount < SHOW_SEQUENCE_MIN_CLADE_TIPS && clade.parent !== clade) {
    clade = clade.parent
  }
  return clade
}

/** Return the deepest common ancestor of the given nodes, which is the node itself for a single node */
function findCommonAncestor(nodes: AuspiceReduxNode[]): AuspiceReduxNode | undefined {
  const [first, ...rest] = nodes
  if (!first) {
    return undefined
  }
  return rest.reduce((ancestor, node) => {
    const ancestorPath = new Set(pathToRoot(ancestor))
    return pathToRoot(node).find((pathNode) => ancestorPath.has(pathNode)) ?? ancestor
  }, first)
}

/**
 * Whether a tip is drawn when the tree is zoomed to the given node. A tip as the zoom target draws the clade of its
 * parent, or only itself when its parent is the root, as in Auspice's `applyInViewNodesToTree()`
 */
function isInView(tip: AuspiceReduxNode, viewRoot: AuspiceReduxNode): boolean {
  if (viewRoot.hasChildren) {
    return pathToRoot(tip).includes(viewRoot)
  }
  if (viewRoot.parent.arrayIdx === 0) {
    return tip === viewRoot
  }
  return pathToRoot(tip).includes(viewRoot.parent)
}

/** Return the node and its ancestors, from the node to the root */
function pathToRoot(node: AuspiceReduxNode): AuspiceReduxNode[] {
  const path = [node]
  let current = node
  while (current.parent !== current) {
    current = current.parent
    path.push(current)
  }
  return path
}

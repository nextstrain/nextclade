import type { AuspiceJsonV2, AuspiceState } from 'auspice'
import { applyMiddleware, createStore, Store } from 'redux'
import thunk, { ThunkMiddleware } from 'redux-thunk'
import { changeColorBy } from 'auspice/src/actions/colors'
import { performanceFlags } from 'auspice/src/middleware/performanceFlags'
import { keepScatterplotStateInSync } from 'auspice/src/middleware/scatterplot'
import { auspiceStartClean, treeFilterByNodeType } from 'src/state/auspice/auspice.actions'
import { createAuspiceState } from 'src/state/auspice/createAuspiceState'
import createRootReducer from './reducer'

/**
 * Auspice store of each tree, kept while the tree exists. The tree page takes the store of its tree when it mounts
 * again (e.g. after a visit to the results page), so the user's view of the tree stays as they left it: coloring,
 * filters, zoom, selection, edited colors and added metadata
 */
const treeStores = new WeakMap<AuspiceJsonV2, Store<AuspiceState>>()

/**
 * Return the Auspice store of a tree, created on first use. A tree has one store: Auspice draws the tree from the
 * nodes of the store that it mounts with, and its zoom and focus actions reach the drawing through these nodes
 */
export function getTreeStore(tree: AuspiceJsonV2): Store<AuspiceState> {
  const existing = treeStores.get(tree)
  if (existing) {
    return existing
  }
  const store = configureStore()
  const { dispatch } = store
  dispatch(auspiceStartClean(createAuspiceState(tree, dispatch)))
  dispatch(changeColorBy())
  dispatch(treeFilterByNodeType(['New']))
  treeStores.set(tree, store)
  return store
}

function configureStore(): Store<AuspiceState> {
  // `performanceFlags` turns off Auspice features that are slow on large trees, such as tree animations.
  // `keepScatterplotStateInSync` moves the axes of the scatter layout along with a coloring by genotype, so that the tips
  // stay at the positions of their new colors
  const middlewares = [thunk as ThunkMiddleware<AuspiceState>, keepScatterplotStateInSync, performanceFlags]
  const enhancer = applyMiddleware(...middlewares)
  return createStore(createRootReducer(), {}, enhancer)
}

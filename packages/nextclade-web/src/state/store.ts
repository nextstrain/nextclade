import type { AuspiceJsonV2, AuspiceState } from 'auspice'
import { useDispatch } from 'react-redux'
import { AnyAction, applyMiddleware, createStore, Store } from 'redux'
import thunk, { ThunkDispatch } from 'redux-thunk'
import { changeColorBy } from 'auspice/src/actions/colors'
import { performanceFlags } from 'auspice/src/middleware/performanceFlags'
import { keepScatterplotStateInSync } from 'auspice/src/middleware/scatterplot'
import { auspiceStartClean, treeFilterByNodeType } from 'src/state/auspice/auspice.actions'
import { createAuspiceState } from 'src/state/auspice/createAuspiceState'
import createRootReducer from './reducer'

/**
 * Auspice store of each tree, kept while the tree exists. The tree page takes the store of its tree when it mounts
 * again (e.g. after a visit to the results page), so the user's view of the tree stays as they left it: coloring,
 * filters, zoom, selection, edited colors, added metadata and a second tree
 */
const treeStores = new WeakMap<AuspiceJsonV2, AuspiceStore>()

/**
 * Return the Auspice store of a tree, created on first use. A tree has one store: Auspice draws the tree from the
 * nodes of the store that it mounts with, and its zoom and focus actions reach the drawing through these nodes
 */
export function getTreeStore(tree: AuspiceJsonV2): AuspiceStore {
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

/** Return the dispatch of the Auspice store of the tree page, which also runs thunks */
export function useAuspiceDispatch(): AuspiceStore['dispatch'] {
  return useDispatch<AuspiceStore['dispatch']>()
}

/** Auspice store, whose dispatch also runs thunks (functions of `dispatch` and `getState`), as Auspice actions are */
export type AuspiceStore = Store<AuspiceState> & { dispatch: ThunkDispatch<AuspiceState, unknown, AnyAction> }

function configureStore(): AuspiceStore {
  // `performanceFlags` turns off Auspice features that are slow on large trees, such as tree animations.
  // `keepScatterplotStateInSync` moves the axes of the scatter layout along with a coloring by genotype, so that the tips
  // stay at the positions of their new colors
  const enhancer = applyMiddleware<ThunkDispatch<AuspiceState, unknown, AnyAction>, AuspiceState>(
    thunk,
    keepScatterplotStateInSync,
    performanceFlags,
  )
  return createStore(createRootReducer(), {}, enhancer)
}

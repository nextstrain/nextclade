import { AuspiceState } from 'auspice'
import { applyMiddleware, createStore, Store } from 'redux'
import thunk, { ThunkMiddleware } from 'redux-thunk'
import { performanceFlags } from 'auspice/src/middleware/performanceFlags'
import createRootReducer from './reducer'

let globalStore: Store<AuspiceState | undefined> | undefined

export function getGlobalStore() {
  return globalStore
}

export function configureStore() {
  // `performanceFlags` turns off Auspice features that are slow on large trees, such as tree animations
  const middlewares = [thunk as ThunkMiddleware<AuspiceState>, performanceFlags]
  const enhancer = applyMiddleware(...middlewares)
  const store = createStore(createRootReducer(), {}, enhancer)
  globalStore = store
  return { store }
}

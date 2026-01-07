import { AuspiceState } from 'auspice'
import { applyMiddleware, createStore, Store } from 'redux'
import thunk, { ThunkMiddleware } from 'redux-thunk'
import createRootReducer from './reducer'

let globalStore: Store<AuspiceState | undefined> | undefined

export function getGlobalStore() {
  return globalStore
}

export function configureStore() {
  const middlewares = [thunk as ThunkMiddleware<AuspiceState>]
  const enhancer = applyMiddleware(...middlewares)
  const store = createStore(createRootReducer(), {}, enhancer)
  globalStore = store
  return { store }
}

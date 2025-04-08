import { AuspiceState } from 'auspice'
import { applyMiddleware, createStore, Middleware, Store } from 'redux'
import thunk from 'redux-thunk'
import createRootReducer from './reducer'

let globalStore: Store<AuspiceState | undefined> | undefined

export function getGlobalStore() {
  return globalStore
}

export function configureStore() {
  const middlewares: Middleware<string>[] = [thunk].filter(Boolean)
  const enhancer = applyMiddleware(...middlewares)
  const store = createStore(createRootReducer(), {}, enhancer)
  globalStore = store
  return { store }
}

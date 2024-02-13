import { applyMiddleware, createStore, Middleware } from 'redux'
import thunk from 'redux-thunk'
import createRootReducer from './reducer'

export function configureStore() {
  const middlewares: Middleware<string>[] = [thunk].filter(Boolean)
  const enhancer = applyMiddleware(...middlewares)
  const store = createStore(createRootReducer(), {}, enhancer)
  return { store }
}

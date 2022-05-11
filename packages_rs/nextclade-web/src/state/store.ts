import { applyMiddleware, createStore, StoreEnhancer, Store, Middleware } from 'redux'
import thunk from 'redux-thunk'
import createRootReducer from './reducer'

export function configureStore() {
  const middlewares: Middleware<string>[] = [thunk].filter(Boolean)
  const enhancer = applyMiddleware(...middlewares)

  const store = createStore(createRootReducer(), {}, enhancer)

  if (module.hot) {
    // Setup hot reloading of root reducer
    module.hot.accept('./reducer', () => {
      store.replaceReducer(createRootReducer())
      console.info('[HMR] root reducer reloaded successfully')
    })
  }

  return { store }
}

declare const window: Window & {
  __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: StoreEnhancer
}

declare const module: NodeHotModule

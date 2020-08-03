declare module 'auspice/src/reducers/entropy' {
  export declare type EntropyState = Record<string, unknown>
  declare function entropy(state: EntropyState): EntropyState
  export default entropy
}

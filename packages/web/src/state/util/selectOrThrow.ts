/* eslint-disable no-loops/no-loops,@typescript-eslint/no-explicit-any */
import { Effect, SelectEffect, Tail } from 'redux-saga/effects'
import { delay, SagaGenerator, select } from 'typed-redux-saga'
import { notUndefined, notUndefinedOrNull } from 'src/helpers/notUndefined'

export class ErrorSelect extends Error {
  public constructor(name: string) {
    super(`When selecting "${name}": no data available. This is an internal issue. Please report it to developers.`)
  }
}

/** Select a piece of state given a state selector. Yield the result, of throw if the result is undefined or null */
export function* selectOrThrow<Ret, Fn extends (state: any, ...args: any[]) => Ret>(
  selector: Fn,
  name: string,
  ...args: Tail<Parameters<Fn>>
): SagaGenerator<NonNullable<ReturnType<Fn>>, SelectEffect> {
  const result = yield* select(selector, ...args)
  if (notUndefined(result)) {
    return result
  }
  throw new ErrorSelect(name)
}

/** Waits until a given state selector yields a non-null non-undefined result. Yields this result. */
export function* selectOrWait<Ret, Fn extends (state: any, ...args: any[]) => Ret>(
  selector: Fn,
  name: string,
  ...args: Tail<Parameters<Fn>>
): SagaGenerator<NonNullable<ReturnType<Fn>>, Effect> {
  while (true) {
    const result = yield* select(selector, ...args)
    yield* delay(250)
    if (notUndefinedOrNull(result)) {
      return result
    }
  }
}

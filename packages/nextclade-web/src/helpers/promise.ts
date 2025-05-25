type PromiseValues<T> = {
  [K in keyof T]: T[K] | Promise<T[K]> | (() => Promise<T[K]>)
}

/** Like Promise.all() but for object values rather than array */
export async function promiseAllObject<T>(data: PromiseValues<T>): Promise<T> {
  const entries = Object.entries(data).map(async ([key, value]) => {
    const resolvedValue = await (value instanceof Promise ? value : Promise.resolve(value))
    return [key, resolvedValue] as [keyof T, T[keyof T]]
  })
  const resolvedEntries = await Promise.all(entries)
  return Object.fromEntries(resolvedEntries) as unknown as T
}

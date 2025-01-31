import { isNil } from 'lodash'
import { atom, RecoilState, selectorFamily, SerializableParam } from 'recoil'
import { isDefaultValue } from 'src/state/utils/isDefaultValue'

export interface MultiAtomOptions<P extends SerializableParam, T> {
  key: string
  defaultValues?: Map<P, T>
}

/**
 * Create 2 atoms to store and operate on an associative container (a Map) of key-value pairs:
 *
 *  - storageAtom - to access values in bulk
 *  - individualAtom - to access individual items
 *
 *  The key of the Map is the param of the atom family. The value of the Map is the value of an individual item.
 *
 */
export function multiAtom<T, P extends SerializableParam>({
  key,
  defaultValues,
}: MultiAtomOptions<P, T>): [(param: P) => RecoilState<T | undefined>, RecoilState<Map<P, T>>] {
  // Storage atom stores all items in a Map
  const storageAtom = atom<Map<P, T>>({
    key: `${key}_storage`,
    default: defaultValues ?? new Map(),
  })

  // Individual atom is a selector into storage item
  const individualAtom = selectorFamily<T | undefined, P>({
    key: `${key}_individual`,
    get:
      (param) =>
      ({ get }): T | undefined => {
        const storage = get(storageAtom)
        return storage.get(param)
      },
    set:
      (param) =>
      ({ get, set }, value) => {
        const storage = new Map(get(storageAtom))
        if (isNil(value)) {
          storage.delete(param)
        } else if (isDefaultValue(value)) {
          const defaultValue = defaultValues?.get(param)
          if (!isNil(defaultValue)) {
            storage.set(param, defaultValue)
          } else {
            storage.delete(param)
          }
        } else {
          storage.set(param, value)
        }
        set(storageAtom, storage)
      },
  })

  return [individualAtom, storageAtom]
}

import { atom as jotaiAtom } from 'jotai'

export const seqNamesFilterAtom = jotaiAtom<string>('')

export const mutationsFilterAtom = jotaiAtom<string>('')

export const cladesFilterAtom = jotaiAtom<string>('')

export const aaFilterAtom = jotaiAtom<string>('')

export const showGoodFilterAtom = jotaiAtom<boolean>(true)

export const showMediocreFilterAtom = jotaiAtom<boolean>(true)

export const showBadFilterAtom = jotaiAtom<boolean>(true)

export const showErrorsFilterAtom = jotaiAtom<boolean>(true)

export const clearAllFiltersAtom = jotaiAtom(
  null,
  (get, set) => {
    set(seqNamesFilterAtom, '')
    set(mutationsFilterAtom, '')
    set(cladesFilterAtom, '')
    set(aaFilterAtom, '')
    set(showGoodFilterAtom, true)
    set(showMediocreFilterAtom, true)
    set(showBadFilterAtom, true)
    set(showErrorsFilterAtom, true)
  }
)

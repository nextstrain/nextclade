import type { DatasetFlat } from 'src/algorithms/types'
import { actionCreatorFactory } from 'src/state/util/fsaActions'

import type { LocaleKey } from 'src/i18n/i18n'

const action = actionCreatorFactory('Settings')

export const setLocale = action<LocaleKey>('setLocale')

export const setLastVersionSeen = action<string>('setLastVersionSeen')

export const setShowWhatsnew = action<boolean>('setShowWhatsnew')

export const setShowWhatsnewOnUpdate = action<boolean>('setShowWhatsnewOnUpdate')

export const setNumThreads = action<number>('setNumThreads')

export const resetNumThreads = action('resetNumThreads')

export const setLastDataset = action<DatasetFlat>('setLastDataset')

export const setShouldRunAutomatically = action<boolean>('setShouldRunAutomatically')

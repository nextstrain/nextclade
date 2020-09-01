import fs from 'fs-extra'
import path from 'path'
import { difference, isObject, padStart, isEmpty, get } from 'lodash'
import { notUndefined } from '../src/helpers/notUndefined'
import { safeZip } from '../src/helpers/safeZip'

const I18N_RESOURCES_DIR = 'src/i18n/resources/'

const dirs = fs.readdirSync(I18N_RESOURCES_DIR)

const filepaths = dirs.flatMap((dir) => {
  const langDir = path.join(I18N_RESOURCES_DIR, dir)
  return fs
    .readdirSync(langDir)
    .filter((filename) => filename.endsWith('.json'))
    .map((filename) => path.join(langDir, filename))
})

export function getSubstitutions(str: string) {
  return str.match(/{{.*?}}/g) ?? []
}

export const quote = (str: string) => `'${str}'`

export function forEachEntry() {}

filepaths.forEach((filepath) => {
  const content = fs.readFileSync(filepath, 'utf-8')
  const jsonDangerous = JSON.parse(content) as unknown

  if (!isObject(jsonDangerous)) {
    console.warn(`'${filepath}':\nNot a valid JSON\n`)
  }

  const json = jsonDangerous as Record<string, string>

  const results = Object.entries(json).map(([reference, localized], index) => {
    const refSubsts = getSubstitutions(reference)
    const locSubsts = getSubstitutions(localized)
    const missing = difference(refSubsts, locSubsts)
    const extra = difference(locSubsts, refSubsts)
    return { index, missing, extra, reference, localized }
  })

  const resultsFixed = results.map(({ index, missing, extra, reference, localized }) => {
    let missingFixed = missing
    let extraFixed = extra
    let localizedFixed: string | undefined
    if (!isEmpty(missing) && !isEmpty(extra) && missing.length === extra.length) {
      localizedFixed = localized
      const dictionary = safeZip(missing, extra)
      const missingToExtra = Object.fromEntries(dictionary)
      const extraToMissing = Object.fromEntries(dictionary.map(([k, v]) => [v, k]))

      dictionary.forEach(([missing, extra]) => {
        localizedFixed = localizedFixed?.replace(RegExp(extra, 'g'), missing)
      })

      missingFixed = missing.filter((m) => !extra.includes(get(missingToExtra, m)))
      extraFixed = extra.filter((e) => !missing.includes(get(extraToMissing, e)))
    }

    return { index, missing, missingFixed, missingExtra: extraFixed, extra, reference, localized, localizedFixed }
  })

  const contentFixed = resultsFixed.reduce(
    (result, { index, missing, extra, reference, localized, localizedFixed }) => {
      return {
        result: {
          ...result.result,
          [reference]: localizedFixed ?? localized,
        },
        total: localizedFixed ? result.total + 1 : result.total,
      }
    },
    { result: {}, total: 0 },
  )

  fs.writeJsonSync(filepath, contentFixed.result, { spaces: 2 })

  if (contentFixed.total > 0) {
    console.info(`\nIn file: '${filepath}':\nInfo: corrected ${contentFixed.total} translation issues automatically`)
  }

  if (resultsFixed.every(({ missingFixed, missingExtra }) => isEmpty(missingFixed) && isEmpty(missingExtra))) {
    return
  }

  const message = resultsFixed
    .filter(({ missingFixed, missingExtra }) => !(isEmpty(missingFixed) && isEmpty(missingExtra)))
    .sort((x, y) => x.index - y.index)
    .map(({ index, missing, extra, reference, localized }) => {
      if (isEmpty(missing) && isEmpty(extra)) {
        return undefined
      }

      const entry = padStart(index.toString(10), 3)
      const missingStr = missing.map(quote).join(', ')
      const extraStr = extra.map(quote).join(', ')
      return `Entry ${entry}:\n    reference: '${reference}'\n    localized: '${localized}'\n    missing  : ${missingStr}\n    extra    : ${extraStr}`
    })
    .filter(notUndefined)
    .join('\n\n')

  if (message !== '') {
    console.warn(
      `\nIn file '${filepath}':\nWarning: translation issues found which cannot be automatically corrected:\n${message}\n`,
    )
  }
})

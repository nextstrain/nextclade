import { readFile, writeJson } from 'fs-extra'
import path from 'path'
import Papa from 'papaparse'

import { findModuleRoot } from '../../lib/findModuleRoot'
import { appendDash } from '../../src/helpers/appendDash'
import { notUndefined } from '../../src/helpers/notUndefined'

const { moduleRoot } = findModuleRoot()

const INPUT_PRIMERS_COVID_CSV = path.join(moduleRoot, 'tools/primers/primers_covid.csv')
const INPUT_ROOT_SEQUENCE_TXT = path.join(moduleRoot, 'src/assets/data/defaultRootSequence.txt')
const OUTPUT_PRIMERS_JSON = path.join(moduleRoot, 'src/assets/data/primers.json')

export async function readCsv(filename: string) {
  const content = await readFile(filename, { encoding: 'utf-8' })

  const { data, errors, meta } = Papa.parse(content, {
    header: true,
    skipEmptyLines: 'greedy',
    trimHeaders: true,
    dynamicTyping: true,
    comments: '#',
  })

  if (errors.length > 0) {
    throw new Error(
      `CSV error: ${INPUT_PRIMERS_COVID_CSV}: ${errors
        .map((error) => error.message)
        .map(appendDash)
        .join('\n')}`,
    )
  } else if (meta.aborted || !data?.length) {
    throw new Error(`CSV error: ${INPUT_PRIMERS_COVID_CSV}: Aborted`)
  } else if (!data?.length) {
    throw new Error(`CSV error: ${INPUT_PRIMERS_COVID_CSV}: There was no data`)
  }

  return data
}

export async function readRootSeq(filename: string) {
  const rootSeq = await readFile(filename, { encoding: 'utf-8' })
  return rootSeq.trim().toUpperCase()
}

export const COMPLEMENTS = new Map(Object.entries({ A: 'T', T: 'A', G: 'C', C: 'G' }))

export function complementNuc(nuc: string) {
  // Return same nucleotide for non-ACGT
  return COMPLEMENTS.get(nuc) ?? nuc
}

export function complementSeq(sequence: string) {
  return sequence.split('').reverse().map(complementNuc).join('')
}

export interface PrimerEntries {
  'Country (Institute)': string
  'Target': string
  'Oligonucleotide': string
  'Sequence': string
}

export async function main() {
  const primerEntries = ((await readCsv(INPUT_PRIMERS_COVID_CSV)) as unknown) as PrimerEntries[]
  const rootSeq = await readRootSeq(INPUT_ROOT_SEQUENCE_TXT)

  const results = primerEntries
    .map(({ 'Sequence': sequence, 'Oligonucleotide': name, 'Country (Institute)': source, 'Target': target }) => {
      // Replace non-ACGT nucleotides with dots (will become "any character" in the regex below)
      let template = sequence.toUpperCase().replace(/[^ACGT]/g, '.')

      if (name.endsWith('_R')) {
        template = complementSeq(template)
      }

      // Find a match (result will be in the named group `found`)
      const maybeMatches = rootSeq.matchAll(RegExp(`(?<found>${template})`, 'g'))

      const matches = [...maybeMatches]
      if (matches.length === 0) {
        // TODO: is this okay if we did not find a match?
        console.warn(`Warning: no match found for primer ${name} (${sequence})`)
        return undefined
      }

      if (matches.length > 1) {
        // TODO: More than 1 match is also bad?
        console.warn(`Warning: more than one match found (namely ${matches.length}) for primer ${name} (${sequence}). Taking first, ignoring ${matches.length - 1} subsequent matches.`) // prettier-ignore
      }

      const match = matches[0]
      const begin = match.index
      const seq = match.groups?.found

      if (!begin) {
        console.warn(`Warning: unable to find match starting index for primer ${name} (${sequence}). Ignoring this match.`) // prettier-ignore
        return undefined
      }

      if (!seq) {
        console.warn(`Warning: unable to find match string for primer ${name} (${sequence}). Ignoring this match.`)
        return undefined
      }

      const end = begin + template.length
      return { name, target, source, seq, candidate: template, range: { begin, end } }
    })
    .filter(notUndefined)

  await writeJson(OUTPUT_PRIMERS_JSON, results, { spaces: 2, encoding: 'utf-8', EOL: '\n' })
}

main().catch(console.error)

import type { QcResultMissingData, QcResultMixedSites, QcResultPrivateMutations } from 'src/types'
import { formatQCMissingData } from 'src/helpers/formatQCMissingData'
import { formatQCMixedSites } from 'src/helpers/formatQCMixedSites'
import { formatQCPrivateMutations } from 'src/helpers/formatQCPrivateMutations'

describe('formatQCMissingData', () => {
  it.each<{ name: string; result: QcResultMissingData; expected: string }>([
    {
      name: 'shows the threshold as configured when the rule has no length scaling',
      result: { score: 50, status: 'mediocre', totalMissing: 150, missingDataThreshold: 100.24 },
      expected: 'Missing data found. Total Ns: 150 (100.24 allowed). QC score: 50',
    },
    {
      name: 'shows the scaled threshold rounded to one decimal',
      result: {
        score: 120,
        status: 'bad',
        totalMissing: 40,
        missingDataThreshold: 31.0987,
        lengthScaling: { length: 300, factor: 0.0311 },
      },
      expected: 'Too much missing data found. Total Ns: 40 (31.1 allowed). QC score: 120',
    },
  ])('$name', ({ result, expected }) => {
    expect(formatQCMissingData(t, result)).toBe(expected)
  })
})

describe('formatQCMixedSites', () => {
  it.each<{ name: string; result: QcResultMixedSites; expected: string }>([
    {
      name: 'shows the threshold as configured when the rule has no length scaling',
      result: { score: 60, status: 'mediocre', totalMixedSites: 6, mixedSitesThreshold: 10 },
      expected: 'Mixed sites found: total 6 (10 allowed). QC score: 60',
    },
    {
      name: 'shows the threshold multiplied by the scaling factor, rounded to one decimal',
      result: {
        score: 138,
        status: 'bad',
        totalMixedSites: 5,
        mixedSitesThreshold: 50,
        lengthScaling: { length: 700, factor: 700 / 9646 },
      },
      expected: 'Too many mixed sites found: total 5 (3.6 allowed). QC score: 138',
    },
  ])('$name', ({ result, expected }) => {
    expect(formatQCMixedSites(t, result)).toBe(expected)
  })
})

describe('formatQCPrivateMutations', () => {
  const counts = {
    numReversionSubstitutions: 0,
    numLabeledSubstitutions: 0,
    numUnlabeledSubstitutions: 100,
    totalDeletionRanges: 0,
    weightedTotal: 100,
  }
  const countsText =
    'Reverted substitutions: 0, Labeled substitutions: 0, Unlabeled substitutions: 100, Deletion ranges: 0. ' +
    'Weighted total: 100'

  it.each<{ name: string; result: QcResultPrivateMutations; expected: string }>([
    {
      name: 'shows only the counts when the rule has no length scaling',
      result: { ...counts, score: 40, status: 'mediocre', excess: 80, cutoff: 200 },
      expected: `QC score: 40. ${countsText}`,
    },
    {
      name: 'adds the scaled typical and cutoff when the rule has length scaling',
      result: {
        ...counts,
        score: 283.33,
        status: 'bad',
        excess: 85,
        cutoff: 1000,
        lengthScaling: { length: 300, factor: 0.03 },
      },
      expected: `QC score: 283. ${countsText}. Thresholds scaled to 300 nucleotides: typical 15, cutoff 30`,
    },
  ])('$name', ({ result, expected }) => {
    expect(formatQCPrivateMutations(t, result)).toBe(expected)
  })
})

function t(template: string, options: Record<string, unknown> = {}) {
  return template.replaceAll(/{{(\w+)}}/g, (_, key: string) => String(options[key]))
}

import type { AnalysisError } from 'src/types'
import { DatasetAssignment, ResultRow, selectDatasetErrors } from 'src/helpers/datasetAssignment'

describe('selectDatasetErrors', () => {
  it('assigns every error row to the one dataset of a single-dataset run', () => {
    const results = [goodRow(0), errorRow(1, 'band area exceeds limit')]
    const assignment: DatasetAssignment = { datasetNames: ['flu_h3n2_ha'] }

    const expected: AnalysisError[] = [{ index: 1, seqName: 'seq1', errors: ['band area exceeds limit'] }]
    expect(selectDatasetErrors(results, 'flu_h3n2_ha', assignment)).toStrictEqual(expected)
  })

  it('assigns error rows of a multi-dataset run to the dataset of their sequence', () => {
    const results = [
      errorRow(0, 'error in ha'),
      goodRow(1),
      errorRow(2, 'error in na'),
      errorRow(3, 'another error in ha'),
    ]
    const assignment: DatasetAssignment = {
      datasetNames: ['flu_h3n2_ha', 'flu_h3n2_na'],
      seqIndexToDatasetName: new Map([
        [0, 'flu_h3n2_ha'],
        [1, 'flu_h3n2_ha'],
        [2, 'flu_h3n2_na'],
        [3, 'flu_h3n2_ha'],
      ]),
      seqIndicesWithoutDataset: new Set(),
    }

    const expectedHa: AnalysisError[] = [
      { index: 0, seqName: 'seq0', errors: ['error in ha'] },
      { index: 3, seqName: 'seq3', errors: ['another error in ha'] },
    ]
    const expectedNa: AnalysisError[] = [{ index: 2, seqName: 'seq2', errors: ['error in na'] }]
    expect(selectDatasetErrors(results, 'flu_h3n2_ha', assignment)).toStrictEqual(expectedHa)
    expect(selectDatasetErrors(results, 'flu_h3n2_na', assignment)).toStrictEqual(expectedNa)
  })

  it('assigns no dataset to the error row of a sequence without a dataset suggestion', () => {
    const results = [errorRow(0, 'error in ha'), errorRow(1, 'Unable to detect reference dataset')]
    const assignment: DatasetAssignment = {
      datasetNames: ['flu_h3n2_ha'],
      seqIndexToDatasetName: new Map([[0, 'flu_h3n2_ha']]),
      seqIndicesWithoutDataset: new Set([1]),
    }

    const expected: AnalysisError[] = [{ index: 0, seqName: 'seq0', errors: ['error in ha'] }]
    expect(selectDatasetErrors(results, 'flu_h3n2_ha', assignment)).toStrictEqual(expected)
  })

  it('selects no rows of successful sequences', () => {
    const results = [goodRow(0), goodRow(1)]
    const assignment: DatasetAssignment = { datasetNames: ['flu_h3n2_ha'] }

    expect(selectDatasetErrors(results, 'flu_h3n2_ha', assignment)).toStrictEqual([])
  })

  it('selects no error rows for a dataset that is not in the run', () => {
    const results = [errorRow(0, 'error in ha')]
    const assignment: DatasetAssignment = { datasetNames: ['flu_h3n2_ha'] }

    expect(selectDatasetErrors(results, 'flu_h3n2_na', assignment)).toStrictEqual([])
  })
})

// Rows as they arrive from the WebAssembly module, which serializes an absent error as `null`
function goodRow(index: number): GoodRow {
  return { index, seqName: `seq${index}`, result: { analysisResult: { datasetName: 'flu_h3n2_ha' } }, error: null }
}

function errorRow(index: number, error: string): ResultRow {
  return { index, seqName: `seq${index}`, error }
}

type GoodRow = ResultRow & { result: { analysisResult: { datasetName: string } } }

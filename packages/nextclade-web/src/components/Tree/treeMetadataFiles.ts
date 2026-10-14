import type { AnyAction } from 'redux'
import type { ThunkAction } from 'redux-thunk'
import type { AuspiceState } from 'auspice'
import handleFilesDropped from 'auspice/src/actions/filesDropped/filesDropped'
import { errorNotification } from 'auspice/src/actions/notifications'

/** File types that the file picker of metadata files offers */
export const METADATA_FILE_ACCEPT = '.csv,.tsv,.json,text/csv,text/tab-separated-values,application/json'

const EXCEL_FILE_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
])

/**
 * Thunk: add the columns of metadata files to the tree as colorings and filters, using Auspice's handling of dropped
 * files. The first column of a CSV or TSV file names the sequences; a JSON file is a node-data JSON of Augur. Auspice
 * tells the result of each file in a notification.
 *
 * Excel files are refused: the Excel reader that Auspice bundles (`xlsx` 0.17) has known vulnerabilities to crafted
 * files, and is not updated on the npm registry.
 */
export function addMetadataFiles(files: File[]): ThunkAction<Promise<void>, AuspiceState, unknown, AnyAction> {
  return async (dispatch) => {
    const excelFiles = files.filter(isExcelFile)
    excelFiles.forEach((file) => {
      dispatch(
        errorNotification({
          message: `Excel files are not supported: '${file.name}'`,
          details: 'Save the sheet as a CSV or TSV file, and add that file.',
        }),
      )
    })
    const otherFiles = files.filter((file) => !isExcelFile(file))
    if (otherFiles.length > 0) {
      await dispatch(handleFilesDropped(otherFiles))
    }
  }
}

function isExcelFile(file: File): boolean {
  // Excel saves CSV files with the type of its own format, which Auspice reads as CSV
  if (file.name.toLowerCase().endsWith('.csv')) {
    return false
  }
  return EXCEL_FILE_TYPES.has(file.type) || /\.xlsx?$/i.test(file.name)
}

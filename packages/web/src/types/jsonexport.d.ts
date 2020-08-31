declare module 'jsonexport' {
  export interface Options {
    // Used to create the propriety path, defaults to . example contact: {name: 'example} = contact.name
    headerPathString?: string

    // Set this option if don't want to have empty cells in case of an object with multiple nested items (array prop), defaults to false Issue #22
    fillGaps?: boolean

    // try filling top rows first for unpopular columns, defaults to false
    fillTopRow?: boolean

    // Array Used to set a custom header order, defaults to [] example ['lastname', 'name']
    headers?: string[]
    rename?: string[] // Array Used to set a custom header text, defaults to [] example ['Last Name', 'Name']

    // Post-process headers after they are calculated with delimiters, example mapHeaders: (header) => header.replace(/foo\./, '')
    mapHeaders?: (header: string) => string

    // Change the file row delimiter
    //   Defaults to , (cvs format).
    //   Use \t for xls format.
    //   Use ; for (windows excel .csv format).
    rowDelimiter?: string

    // The character used to escape the text content if needed (default to ")
    textDelimiter?: string

    // Set this option to true to wrap every data item and header in the textDelimiter. Defaults to false
    forceTextDelimiter?: boolean

    // Replace the OS default EOL.
    endOfLine?: string

    // Every header will have the mainPathItem as the base.
    mainPathItem?: string

    // This is used to output primitive arrays in a single column, defaults to ;
    arrayPathString?: string

    // Will be used instead of true.
    booleanTrueString?: string

    // Will be used instead of false.
    booleanFalseString?: string

    // Set this option to false to hide the CSV headers.
    includeHeaders?: boolean

    // If you want to display a custom value for undefined strings, use this option. Defaults to .
    undefinedString?: string

    // Set this option to false to create a horizontal output for JSON Objects, headers in the first row, values in the second.
    verticalOutput?: boolean

    // A key map of constructors used to match by instance to create a value using the defined function (see example)
    typeHandlers?: any
  }

  export default function jsonexport(json: Record<string, any> | Array<any>, options: Options): Promise<string>
}

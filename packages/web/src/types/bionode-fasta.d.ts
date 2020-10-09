declare module 'bionode-fasta' {
  export declare interface FastaObject {
    id: string
    seq: string
  }

  declare function obj(filename: string): NodeJS.ReadableStream

  const fasta = { obj }

  export default fasta
}

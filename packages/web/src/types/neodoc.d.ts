declare module 'neodoc' {
  export type Args = Record<string, string | undefined>
  declare function run(doc: string): Args
  export default { run }
}

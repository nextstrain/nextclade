export interface EmscriptenModule {
  locateFile(path: string): string
  onRuntimeInitialized(): void
}

export type EmscriptenRuntimeModule = (options: EmscriptenModule) => Promise<MyModule>

export interface MyModule extends EmscriptenModule {
  add(x: number, y: number): number
  concat(x: string, y: string): string
  getObject(): object // eslint-disable-line @typescript-eslint/ban-types
  getPerson(): object // eslint-disable-line @typescript-eslint/ban-types
  toString({ name, age, foo }: { name: string; age: number; foo: { bar: number } }): string
  kaboom(): void
  getExceptionMessage(errorPointer: number): string
}

/* eslint-disable array-func/no-unnecessary-this-arg,unicorn/no-process-exit */
import Ajv, { Ajv as AjvModule } from 'ajv'
import rimrafOriginal from 'rimraf'
import pack from 'ajv-pack'
import { concurrent } from 'fasy'
import fs from 'fs-extra'
import yaml from 'js-yaml'
import path from 'path'
import prettier from 'prettier'
import { InputData, JSONSchema, JSONSchemaInput, JSONSchemaStore, parseJSON, quicktype } from 'quicktype-core'
import util from 'util'

import { findModuleRoot } from '../lib/findModuleRoot'

const rimraf = util.promisify(rimrafOriginal)

const SCHEMA_EXTENSION = '.yml'

async function readSchemaFile(schemaFilepath: string) {
  return fs.readFileSync(schemaFilepath).toString('utf-8')
}

class Store extends JSONSchemaStore {
  private readonly schemasRoot: string

  constructor(schemasRoot: string) {
    super()
    this.schemasRoot = schemasRoot
  }

  async fetch(address: string): Promise<JSONSchema | undefined> {
    const schemaFilepath = path.join(this.schemasRoot, address)
    const jsonSchemaString = await readSchemaFile(schemaFilepath)
    return parseJSON(jsonSchemaString, 'JSON Schema', address) as Record<string, unknown>
  }
}

function quicktypesAddSources(schemasRoot: string, schemaInput: JSONSchemaInput) {
  return async (schemaFilename: string) => {
    const schemaFilepath = path.join(schemasRoot, schemaFilename)
    const typeName = schemaFilename.replace(SCHEMA_EXTENSION, '')
    const jsonSchemaString = await readSchemaFile(schemaFilepath)
    await schemaInput.addSource({ name: typeName, schema: jsonSchemaString })
  }
}

async function quicktypesGenerate(
  lang: string,
  schemasRoot: string,
  schemaFilenames: string[],
  outputPath: string,
  rendererOptions?: { [name: string]: string },
) {
  const schemaInput = new JSONSchemaInput(new Store(schemasRoot))
  await concurrent.forEach(quicktypesAddSources(schemasRoot, schemaInput), schemaFilenames)

  const inputData = new InputData()
  inputData.addInput(schemaInput)

  const { lines } = await quicktype({ inputData, lang, rendererOptions })
  let code = lines.join('\n')

  if (lang === 'typescript') {
    code = prettier.format(code, { parser: 'typescript' })
  }

  return fs.writeFile(outputPath, code)
}

function ajvAddSources(schemasRoot: string, ajv: AjvModule) {
  return async (schemaFilename: string) => {
    const schemaFilepath = path.join(schemasRoot, schemaFilename)
    const jsonSchemaString = await readSchemaFile(schemaFilepath)
    const schema = yaml.load(jsonSchemaString) as Record<string, unknown>
    ajv.addSchema(schema)
  }
}

function ajvGenerateOne(schemasRoot: string, ajv: AjvModule, outputDir: string) {
  return async (schemaFilename: string) => {
    const schemaFilepath = path.join(schemasRoot, schemaFilename)
    const typeName = schemaFilename.replace(SCHEMA_EXTENSION, '')
    const jsonSchemaString = fs.readFileSync(schemaFilepath).toString('utf-8')
    const schema = yaml.load(jsonSchemaString) as Record<string, unknown>
    const validateFunction = ajv.compile(schema)

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    let code = pack(ajv, validateFunction)
    code = prettier.format(code, { parser: 'babel' })
    return fs.writeFile(path.join(outputDir, `validate${typeName}.js`), code)
  }
}

async function ajvGenerate(schemasRoot: string, schemaFilenames: string[], outputDir: string) {
  const ajv = new Ajv({
    code: { source: true },
    $data: true,
    jsPropertySyntax: true,
    allErrors: true,
    allowMatchingProperties: true,
    allowUnionTypes: true,
  })
  await concurrent.forEach(ajvAddSources(schemasRoot, ajv), schemaFilenames)
  return concurrent.forEach(ajvGenerateOne(schemasRoot, ajv, outputDir), schemaFilenames)
}

export default async function generateTypes() {
  const { moduleRoot } = findModuleRoot()
  const schemasRoot = path.join(moduleRoot, 'schemas')
  const tsOutputDir = path.join(moduleRoot, 'src', 'generated')
  const cppOutputDir = path.join(moduleRoot, 'src', 'generated')
  const tsOutput = path.join(tsOutputDir, 'types.ts')
  const cppOutput = path.join(cppOutputDir, 'types.h')

  let schemaFilenames = await fs.readdir(schemasRoot)
  // schemaFilenames = schemaFilenames.filter((schemaFilename) => schemaFilename.endsWith(SCHEMA_EXTENSION))

  await concurrent.forEach(async (d: string) => rimraf(`${d}/**`), [tsOutputDir, cppOutputDir])
  await concurrent.forEach(async (d: string) => fs.mkdirp(d), [tsOutputDir, cppOutputDir])

  return Promise.all([
    quicktypesGenerate('typescript', schemasRoot, schemaFilenames, tsOutput, {
      'converters': 'all-objects',
      'nice-property-names': 'true',
      'runtime-typecheck': 'true',
    }),
    quicktypesGenerate('cpp', schemasRoot, schemaFilenames, cppOutput, { boost: false }),
    ajvGenerate(schemasRoot, schemaFilenames, tsOutputDir),
  ])
}

generateTypes().catch((error) => {
  console.error(error)
  process.exit(1)
})

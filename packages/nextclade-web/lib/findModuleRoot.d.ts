import { JSONSchemaForNPMPackageJsonFiles } from '@schemastore/package'

export interface FindModuleRootResult {
  moduleRoot: string
  pkg: Required<Pick<JSONSchemaForNPMPackageJsonFiles, 'name' | 'version'>> & JSONSchemaForNPMPackageJsonFiles
}

export declare function findModuleRoot(maxDepth?: number): FindModuleRootResult

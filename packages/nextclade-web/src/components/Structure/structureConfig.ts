export interface StructureConfig {
  pdbId: string
  chainMapping: Record<string, string>
  offset: number
}

// Default config for H3N2 HA - used for testing
export const DEFAULT_STRUCTURE_CONFIG: StructureConfig = {
  pdbId: '4WE4',
  chainMapping: {
    HA1: 'A',
    HA2: 'B',
  },
  offset: 0,
}

export const STRUCTURE_CONFIGS: Record<string, StructureConfig> = {
  'nextstrain/flu/h3n2/ha': {
    pdbId: '4WE4',
    chainMapping: {
      HA1: 'A',
      HA2: 'B',
    },
    offset: 0,
  },
  'flu_h3n2_ha': {
    pdbId: '4WE4',
    chainMapping: {
      HA1: 'A',
      HA2: 'B',
    },
    offset: 0,
  },
}

export function getStructureConfig(datasetPath: string | undefined): StructureConfig | undefined {
  if (!datasetPath) {
    return undefined
  }

  // Try exact match first
  const exactMatch = STRUCTURE_CONFIGS[datasetPath]
  if (exactMatch) {
    return exactMatch
  }

  // Try partial match (dataset path may be longer)
  for (const [key, config] of Object.entries(STRUCTURE_CONFIGS)) {
    if (datasetPath.includes(key) || key.includes(datasetPath)) {
      return config
    }
  }

  return undefined
}

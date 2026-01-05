export interface StructureConfig {
  pdbId: string
  chainMapping: Record<string, string>
  offset: number
}

export interface StructureOption {
  pdbId: string
  description: string
  resolution: string
  reference: string
  group: 'H1' | 'H3' | 'H5'
  chainMapping: Record<string, string>
  offset: number
}

export const STRUCTURE_OPTIONS: StructureOption[] = [
  // H1 structures
  {
    pdbId: '4WE4',
    description: 'HA (H1N1) with cross-neutralizing antibody',
    resolution: '2.45',
    reference: 'Nature, 2014',
    group: 'H1',
    chainMapping: { HA1: 'A', HA2: 'B' },
    offset: 0,
  },
  {
    pdbId: '3LZG',
    description: '1918 H1 HA trimer',
    resolution: '3.00',
    reference: 'Science, 2009',
    group: 'H1',
    chainMapping: { HA1: 'A', HA2: 'B' },
    offset: 0,
  },
  {
    pdbId: '1RU7',
    description: 'H1 HA (A/Puerto Rico/8/34)',
    resolution: '2.90',
    reference: 'J. Virol., 2004',
    group: 'H1',
    chainMapping: { HA1: 'A', HA2: 'B' },
    offset: 0,
  },
  {
    pdbId: '3ZTJ',
    description: 'H1 HA with stem antibody FI6v3',
    resolution: '2.80',
    reference: 'Science, 2011',
    group: 'H1',
    chainMapping: { HA1: 'A', HA2: 'B' },
    offset: 0,
  },
  // H3 structures
  {
    pdbId: '4O5I',
    description: 'H3 HA with stem antibody CR9114',
    resolution: '2.70',
    reference: 'Science, 2013',
    group: 'H3',
    chainMapping: { HA1: 'A', HA2: 'B' },
    offset: 0,
  },
  {
    pdbId: '2VIU',
    description: 'H3 HA unbound',
    resolution: '2.50',
    reference: 'Nature, 2008',
    group: 'H3',
    chainMapping: { HA1: 'A', HA2: 'B' },
    offset: 0,
  },
  // H5 structures
  {
    pdbId: '2FK0',
    description: 'H5 HA ectodomain',
    resolution: '3.00',
    reference: 'Nature, 2006',
    group: 'H5',
    chainMapping: { HA1: 'A', HA2: 'B' },
    offset: 0,
  },
]

export const DEFAULT_PDB_ID = '4WE4'

// Default config for H3N2 HA - used for testing
export const DEFAULT_STRUCTURE_CONFIG: StructureConfig = {
  pdbId: DEFAULT_PDB_ID,
  chainMapping: {
    HA1: 'A',
    HA2: 'B',
  },
  offset: 0,
}

export function getStructureOption(pdbId: string): StructureOption | undefined {
  return STRUCTURE_OPTIONS.find((opt) => opt.pdbId === pdbId)
}

export function getStructureConfigFromOption(option: StructureOption): StructureConfig {
  return {
    pdbId: option.pdbId,
    chainMapping: option.chainMapping,
    offset: option.offset,
  }
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
  const partialMatch = Object.entries(STRUCTURE_CONFIGS).find(
    ([key]) => datasetPath.includes(key) || key.includes(datasetPath),
  )
  return partialMatch?.[1]
}

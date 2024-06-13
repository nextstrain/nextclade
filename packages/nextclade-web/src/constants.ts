import type { Aminoacid, Nucleotide } from 'src/types'

export const PROJECT_NAME = 'Nextclade' as const
export const PROJECT_DESCRIPTION =
  'Genetic sequence alignment, clade assignment, mutation calling, phylogenetic placement, and quality checks for SARS-CoV-2, Influenza (Flu), Monkeypox, Respiratory Syncytial Virus (RSV) and other pathogens' as const
export const COPYRIGHT_YEAR_START = 2020 as const
export const COMPANY_NAME = 'Nextstrain developers' as const
export const RELEASE_URL = 'https://clades.nextstrain.org' as const
export const RELEASE_OLD_URL = 'https://v2.clades.nextstrain.org' as const

export const DOMAIN = process.env.DOMAIN ?? ''
export const DOMAIN_STRIPPED = process.env.DOMAIN_STRIPPED ?? ''
export const URL_FAVICON = `${DOMAIN}/favicon.ico`
export const URL_SOCIAL_IMAGE = `${DOMAIN}/social-1200x600.png`
export const URL_MANIFEST_JSON = `${DOMAIN}/manifest.json`
export const SAFARI_PINNED_TAB_COLOR = '#555555' as const
export const MS_TILE_COLOR = '#2b5797' as const

export const UNKNOWN_VALUE = `Unknown ` // HACK: keep space at the end: workaround for Auspice filtering out "Unknown"
export const BASE_MIN_WIDTH_PX = 4 as const
export const AA_MIN_WIDTH_PX = 4 as const

export const REF_NODE_ROOT = '__Root' as const
export const REF_NODE_PARENT = '__Parent' as const

export const URL_GITHUB = 'https://github.com/nextstrain/nextclade' as const
export const URL_GITHUB_FRIENDLY = 'github.com/nextstrain/nextclade' as const

export const URL_GITHUB_ISSUES = 'https://github.com/nextstrain/nextclade/issues' as const
export const URL_GITHUB_ISSUES_FRIENDLY = 'github.com/nextstrain/nextclade/issues' as const
export const URL_GITHUB_CHANGELOG = 'https://github.com/nextstrain/nextclade/blob/release/packages/web/CHANGELOG.md'
export const URL_GITHUB_COMMITS = 'https://github.com/nextstrain/nextclade/commits/release'

export const URL_CLADE_SCHEMA_REPO = 'https://github.com/nextstrain/ncov-clades-schema/'
export const URL_CLADE_SCHEMA_SVG = 'https://raw.githubusercontent.com/nextstrain/ncov-clades-schema/master/clades.svg'

export const URL_GITHUB_DATA_RAW = 'https://raw.githubusercontent.com/nextstrain/nextclade_data' as const
export const DEFAULT_DATA_OWNER = 'nextstrain' as const
export const DEFAULT_DATA_REPO = 'nextclade_data' as const
export const DEFAULT_DATA_REPO_PATH = 'data_output' as const

export const SUPPORT_EMAIL = 'hello@nextstrain.org'

export const TWITTER_USERNAME_RAW = 'nextstrain' as const
export const TWITTER_USERNAME_FRIENDLY = '@nextstrain' as const

// Borrowed from Nextstrain Auspice
// https://github.com/nextstrain/auspice/blob/05efebfd5eba8a7d086132cf8a182176118b7c28/src/util/globals.js#L90-L92
export const GENOTYPE_COLORS = [
  '#60AA9E',
  '#D9AD3D',
  '#5097BA',
  '#E67030',
  '#8EBC66',
  '#E59637',
  '#AABD52',
  '#DF4327',
  '#C4B945',
  '#75B681',
] as const

// Borrowed with modifications from Nextstrain.org
// https://github.com/nextstrain/nextstrain.org/blob/master/static-site/src/components/splash/title.jsx
export const TITLE_COLORS = [
  '#4377CD',
  '#5097BA',
  '#63AC9A',
  '#7CB879',
  '#B9BC4A',
  '#D4B13F',
  '#E49938',
  '#E67030',
  '#DE3C26',
] as const

export const A = 'A' as Nucleotide
export const T = 'T' as Nucleotide
export const G = 'G' as Nucleotide
export const C = 'C' as Nucleotide
export const N = 'N' as Nucleotide
export const X = 'X' as Nucleotide
export const GAP = '-' as Nucleotide
export const ANY = '.' as const

export const AMINOACID_UNKNOWN = 'X' as const as Aminoacid
export const AMINOACID_GAP = '-' as const as Aminoacid

export const CDS_OPTION_NUC_SEQUENCE = 'Sequence' // Show nucleotide sequence in sequence view (as opposed to a gene)

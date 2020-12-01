export const PROJECT_NAME = 'Nextclade' as const
export const PROJECT_DESCRIPTION = 'Clade assignment, mutation calling, and sequence quality checks' as const
export const COPYRIGHT_YEAR_START = 2020 as const
export const COMPANY_NAME = 'Nextstrain developers' as const

export const DOMAIN = process.env.DOMAIN ?? ''
export const URL_FAVICON = `${DOMAIN}/favicon.ico`
export const URL_SOCIAL_IMAGE = `${DOMAIN}/social-1200x600.png`
export const URL_MANIFEST_JSON = `${DOMAIN}/manifest.json`
export const SAFARI_PINNED_TAB_COLOR = '#555555' as const
export const MS_TILE_COLOR = '#2b5797' as const

export const UNKNOWN_VALUE = `Unknown ` // HACK: keep space at the end: workaround for Auspice filtering out "Unknown"
export const BASE_MIN_WIDTH_PX = 4 as const
export const EXPORT_CSV_FILENAME = 'nextclade.csv' as const
export const EXPORT_TSV_FILENAME = 'nextclade.tsv' as const
export const EXPORT_JSON_FILENAME = 'nextclade.json' as const
export const EXPORT_AUSPICE_JSON_V2_FILENAME = 'nextclade.auspice.json' as const

export const URL_GITHUB = 'https://github.com/nextstrain/nextclade' as const
export const URL_GITHUB_FRIENDLY = 'github.com/nextstrain/nextclade' as const

export const URL_GITHUB_ISSUES = 'https://github.com/nextstrain/nextclade/issues' as const
export const URL_GITHUB_ISSUES_FRIENDLY = 'github.com/nextstrain/nextclade/issues' as const
export const URL_GITHUB_CHANGELOG = 'https://github.com/nextstrain/nextclade/blob/release/packages/web/CHANGELOG.md'
export const URL_GITHUB_COMMITS = 'https://github.com/nextstrain/nextclade/commits/release'

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

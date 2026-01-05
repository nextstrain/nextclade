import axios from 'axios'

const RCSB_FILES_BASE = 'https://files.rcsb.org/download'
const RCSB_API_BASE = 'https://data.rcsb.org/rest/v1/core/entry'

export interface StructureCitation {
  authors: string[]
  year: number
  title: string
  journal: string
  doi: string | undefined
}

export function formatShortCitation(citation: StructureCitation): string {
  const firstAuthorFull = citation.authors[0] ?? 'Unknown'
  // Extract last name: either "LastName, First" format or "First Last" format
  const lastNameMatch = firstAuthorFull.includes(',') ? firstAuthorFull.split(',')[0] : firstAuthorFull.split(' ').pop()
  const firstAuthor = lastNameMatch ?? 'Unknown'
  const etAl = citation.authors.length > 1 ? ' et al.' : ''
  return `${firstAuthor}${etAl} (${citation.year})`
}

export function formatFullCitation(citation: StructureCitation): string {
  const authors = citation.authors.join(', ')
  const title = citation.title.replace(/\.+$/, '')
  const journal = citation.journal.replace(/\.+$/, '')
  return `${authors} (${citation.year}). ${title}. ${journal}.`
}

export interface FetchedStructure {
  data: ArrayBuffer
  format: 'pdb'
}

export async function fetchStructureFile(pdbId: string): Promise<FetchedStructure> {
  const url = `${RCSB_FILES_BASE}/${pdbId.toUpperCase()}.pdb`
  const response = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' })
  return {
    data: response.data,
    format: 'pdb',
  }
}

interface RcsbPrimaryCitation {
  rcsb_authors?: string[]
  year?: number
  title?: string
  journal_abbrev?: string
  pdbx_database_id_doi?: string
}

interface RcsbEntryResponse {
  rcsb_primary_citation?: RcsbPrimaryCitation
}

export async function fetchStructureCitation(pdbId: string): Promise<StructureCitation | undefined> {
  const url = `${RCSB_API_BASE}/${pdbId.toUpperCase()}`

  try {
    const response = await axios.get<RcsbEntryResponse>(url)
    const citation = response.data.rcsb_primary_citation
    if (!citation) {
      return undefined
    }

    return {
      authors: citation.rcsb_authors ?? ['Unknown authors'],
      year: citation.year ?? 0,
      title: citation.title ?? 'Unknown title',
      journal: citation.journal_abbrev ?? 'Unknown journal',
      doi: citation.pdbx_database_id_doi,
    }
  } catch {
    return undefined
  }
}

export const RCSB_CITATION: StructureCitation = {
  authors: [
    'Helen M. Berman',
    'John Westbrook',
    'Zukang Feng',
    'Gary Gilliland',
    'T. N. Bhat',
    'Helge Weissig',
    'Ilya N. Shindyalov',
    'Philip E. Bourne',
  ],
  year: 2000,
  title: 'The Protein Data Bank',
  journal: 'Nucleic Acids Research',
  doi: '10.1093/nar/28.1.235',
}

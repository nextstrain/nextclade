/**
 * Build the basemap of the map on the tree page from Natural Earth 5.1.2 and the Noto Sans glyphs of OpenMapTiles, and
 * write the files that the app serves: the outlines, land borders and label points of the countries into
 * `src/assets/basemap/`, and the label glyphs with their license into `public/basemap/fonts/`. The written files are
 * committed, so run this only to change them:
 *
 *   ./docker/dev a bun tools/buildBasemap.ts
 *
 * Sources:
 *  - Natural Earth 5.1.2 (public domain), 1:50m countries and land borders, as GeoJSON from tag `v5.1.2` of
 *    https://github.com/nvkelso/natural-earth-vector
 *  - Noto Sans Bold glyphs for the characters U+0000 to U+00FF, from asset `noto-sans.zip` of release `v2.0` of
 *    https://github.com/openmaptiles/fonts, and their license (SIL Open Font License 1.1) from the same tag
 *
 * Each download must match its SHA-256 below, so a changed upstream file stops the build.
 */
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'

const NATURAL_EARTH_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson'
const FONTS_RELEASE_URL = 'https://github.com/openmaptiles/fonts/releases/download/v2.0'
const FONTS_REPO_URL = 'https://raw.githubusercontent.com/openmaptiles/fonts/v2.0'

const SOURCES = {
  countries: {
    url: `${NATURAL_EARTH_URL}/ne_50m_admin_0_countries.geojson`,
    sha256: '3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb',
  },
  borders: {
    url: `${NATURAL_EARTH_URL}/ne_50m_admin_0_boundary_lines_land.geojson`,
    sha256: '2faac4f6b34386f3d21b6e018cf151f241f00e5c936d44dd17d7d9bfb147fa48',
  },
  fonts: {
    url: `${FONTS_RELEASE_URL}/noto-sans.zip`,
    sha256: 'd117316544b43a5dde7ee761b36e17701e9f85574e181d76a74814240fdbaf34',
  },
  fontLicense: {
    url: `${FONTS_REPO_URL}/noto-sans/LICENSE`,
    sha256: '6a73f9541c2de74158c0e7cf6b0a58ef774f5a780bf191f2d7ec9cc53efe2bf2',
  },
}

/** Font of the labels, the `text-font` of the map style, and the only glyph range that the labels need */
const FONT_STACK = 'Noto Sans Bold'
const GLYPH_RANGE = '0-255'
const GLYPH_RANGE_MAX_CODE_POINT = 0xff

/** Coordinates are rounded to 0.01 degree (about 1 km), which keeps the detail of the 1:50m scale */
const COORDINATE_DECIMALS = 2

/**
 * Land border classes that are drawn. Disputed borders and lines of control are left out, as the default map style of
 * Auspice leaves out disputed borders
 */
const BORDER_CLASSES = new Set([
  'International boundary (verify)',
  'Indefinite (please verify)',
  'Indeterminant frontier',
])

const WEB_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = join(WEB_DIR, 'src/assets/basemap')
const FONTS_DIR = join(WEB_DIR, 'public/basemap/fonts')

async function main() {
  const [countries, borders, fonts, fontLicense] = await Promise.all([
    download(SOURCES.countries),
    download(SOURCES.borders),
    download(SOURCES.fonts),
    download(SOURCES.fontLicense),
  ])

  const countryFeatures = parseFeatures(countries).map(parseCountry)
  checkGlyphRange(countryFeatures.map(({ name }) => name))

  await writeJson(join(DATA_DIR, 'countries.json'), countriesGeoJson(countryFeatures))
  await writeJson(join(DATA_DIR, 'labels.json'), labelsGeoJson(countryFeatures))
  await writeJson(join(DATA_DIR, 'borders.json'), bordersGeoJson(parseFeatures(borders)))

  const glyphs = await extractFile(fonts, `${FONT_STACK}/${GLYPH_RANGE}.pbf`)
  await writeFileInDir(join(FONTS_DIR, FONT_STACK, `${GLYPH_RANGE}.pbf`), glyphs)
  await writeFileInDir(join(FONTS_DIR, 'LICENSE.txt'), fontLicense)
}

interface Source {
  url: string
  sha256: string
}

/** Return the content of a URL, after checking it against its SHA-256 */
async function download({ url, sha256 }: Source): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Downloading ${url}: HTTP ${response.status} ${response.statusText}`)
  }
  const content = Buffer.from(await response.arrayBuffer())
  const actual = createHash('sha256').update(content).digest('hex')
  if (actual !== sha256) {
    throw new Error(`Downloading ${url}: SHA-256 is ${actual}, expected ${sha256}`)
  }
  return content
}

function parseFeatures(content: Buffer): Feature[] {
  const collection: unknown = JSON.parse(content.toString('utf8'))
  if (!isFeatureCollection(collection)) {
    throw new Error('Expected a GeoJSON feature collection')
  }
  return collection.features
}

interface Country {
  name: string
  /** Label size: 1 for the largest countries, 3 for the smallest. Natural Earth's `LABELRANK` 2 or less, 3, 4 or more */
  rank: number
  labelPosition: Position
  geometry: Geometry | null
}

function parseCountry({ properties, geometry }: Feature): Country {
  const { NAME, LABELRANK, LABEL_X, LABEL_Y } = properties
  if (typeof NAME !== 'string' || typeof LABELRANK !== 'number') {
    throw new Error(`Country without NAME or LABELRANK: ${JSON.stringify(properties)}`)
  }
  if (typeof LABEL_X !== 'number' || typeof LABEL_Y !== 'number') {
    throw new Error(`Country without label position: ${NAME}`)
  }
  return {
    name: NAME,
    rank: LABELRANK <= 2 ? 1 : LABELRANK === 3 ? 2 : 3,
    labelPosition: roundPosition([LABEL_X, LABEL_Y]),
    geometry: roundGeometry(geometry),
  }
}

/** The labels use one glyph range, so every character of every name must be in it */
function checkGlyphRange(names: string[]) {
  const outside = names.filter((name) =>
    [...name].some((char) => (char.codePointAt(0) ?? 0) > GLYPH_RANGE_MAX_CODE_POINT),
  )
  if (outside.length > 0) {
    throw new Error(`Names with characters outside of the glyph range ${GLYPH_RANGE}: ${outside.join(', ')}`)
  }
}

function countriesGeoJson(countries: Country[]): FeatureCollection {
  return featureCollection(
    countries.flatMap(({ name, geometry }) => (geometry ? [{ type: 'Feature', properties: { name }, geometry }] : [])),
  )
}

function labelsGeoJson(countries: Country[]): FeatureCollection {
  return featureCollection(
    countries.map(({ name, rank, labelPosition }) => ({
      type: 'Feature',
      properties: { name, rank },
      geometry: { type: 'Point', coordinates: labelPosition },
    })),
  )
}

/** Land borders only, so that coasts are not drawn as borders */
function bordersGeoJson(borders: Feature[]): FeatureCollection {
  return featureCollection(
    borders.flatMap(({ properties, geometry }) => {
      if (!BORDER_CLASSES.has(String(properties.FEATURECLA))) {
        return []
      }
      const rounded = roundGeometry(geometry)
      return rounded ? [{ type: 'Feature', properties: {}, geometry: rounded }] : []
    }),
  )
}

function featureCollection(features: Feature[]): FeatureCollection {
  return { type: 'FeatureCollection', features }
}

/** Round the coordinates of lines and polygons, and drop the points, lines and rings that rounding makes redundant */
function roundGeometry(geometry: Geometry | null): Geometry | null {
  if (!geometry) {
    return null
  }
  switch (geometry.type) {
    case 'LineString': {
      const line = roundLine(geometry.coordinates)
      return line ? { type: 'LineString', coordinates: line } : null
    }
    case 'MultiLineString': {
      const lines = geometry.coordinates.flatMap((line) => roundLine(line) ?? [])
      return lines.length > 0 ? { type: 'MultiLineString', coordinates: lines } : null
    }
    case 'Polygon': {
      const polygon = roundPolygon(geometry.coordinates)
      return polygon ? { type: 'Polygon', coordinates: polygon } : null
    }
    case 'MultiPolygon': {
      const polygons = geometry.coordinates.flatMap((polygon) => {
        const rounded = roundPolygon(polygon)
        return rounded ? [rounded] : []
      })
      return polygons.length > 0 ? { type: 'MultiPolygon', coordinates: polygons } : null
    }
    case 'Point':
      return { type: 'Point', coordinates: roundPosition(geometry.coordinates) }
  }
}

/** Return the rounded line without repeated points, or nothing when fewer than 2 points remain */
function roundLine(line: Position[]): Position[] | undefined {
  const rounded = withoutRepeatedPositions(line.map(roundPosition))
  return rounded.length >= 2 ? rounded : undefined
}

/** Return the rounded polygon, or nothing when its outer ring collapses. Holes that collapse are dropped */
function roundPolygon(rings: Position[][]): Position[][] | undefined {
  const [outer, ...holes] = rings.map((ring) => withoutRepeatedPositions(ring.map(roundPosition)))
  // A closed ring needs 3 distinct points and the closing point
  const isRing = (ring: Position[]) => ring.length >= 4
  if (!outer || !isRing(outer)) {
    return undefined
  }
  return [outer, ...holes.filter(isRing)]
}

function withoutRepeatedPositions(positions: Position[]): Position[] {
  return positions.filter(
    (position, i) => i === 0 || position[0] !== positions[i - 1][0] || position[1] !== positions[i - 1][1],
  )
}

function roundPosition([x, y]: Position): Position {
  return [round(x), round(y)]
}

function round(value: number): number {
  const factor = 10 ** COORDINATE_DECIMALS
  return Math.round(value * factor) / factor
}

async function extractFile(archive: Buffer, path: string): Promise<Buffer> {
  const zip = await JSZip.loadAsync(archive)
  const file = zip.file(path)
  if (!file) {
    throw new Error(`File not found in the font archive: ${path}`)
  }
  return file.async('nodebuffer')
}

async function writeJson(path: string, value: unknown) {
  await writeFileInDir(path, `${JSON.stringify(value)}\n`)
}

async function writeFileInDir(path: string, content: string | Buffer) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content)
}

function isFeatureCollection(value: unknown): value is FeatureCollection {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'FeatureCollection' &&
    'features' in value &&
    Array.isArray(value.features)
  )
}

type Position = [number, number]

type Geometry =
  | { type: 'Point'; coordinates: Position }
  | { type: 'LineString'; coordinates: Position[] }
  | { type: 'MultiLineString'; coordinates: Position[][] }
  | { type: 'Polygon'; coordinates: Position[][] }
  | { type: 'MultiPolygon'; coordinates: Position[][][] }

interface Feature {
  type: 'Feature'
  properties: Record<string, unknown>
  geometry: Geometry | null
}

interface FeatureCollection {
  type: 'FeatureCollection'
  features: Feature[]
}

await main()

import { getMapTilesSettings } from 'auspice/src/util/globals'

const APP_ORIGIN = 'https://clades.nextstrain.org'

describe('map tiles of the tree page', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { location: { origin: APP_ORIGIN } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('loads every file of the map from the address of the app', () => {
    // Auspice reads the map tiles from Nextclade's extension, as when the map mounts
    const { style } = getMapTilesSettings()

    const origins = new Set(styleUrls(style).map((url) => new URL(url).origin))
    expect([...origins]).toStrictEqual([APP_ORIGIN])
  })
})

/** Return the URLs that MapLibre requests for a style: its glyphs and sprite, and the data, tiles and TileJSON of its sources */
function styleUrls(style: unknown): string[] {
  if (!isRecord(style)) {
    return []
  }
  const sources = isRecord(style.sources) ? Object.values(style.sources) : []
  return [
    style.glyphs,
    style.sprite,
    ...sources.flatMap((source) =>
      isRecord(source) ? [source.data, source.url, ...(Array.isArray(source.tiles) ? source.tiles : [])] : [],
    ),
  ].filter((url): url is string => typeof url === 'string')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

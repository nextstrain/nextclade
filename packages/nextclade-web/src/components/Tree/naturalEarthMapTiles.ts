import type { getMapTilesSettings } from 'auspice/src/util/globals'

/** Path of the label glyphs in `public/`, in MapLibre's URL pattern, which names the font and the character range */
const GLYPHS_PATH = '/basemap/fonts/{fontstack}/{range}.pbf'

/** Font of the country names. `tools/buildBasemap.ts` writes its glyphs for the characters of the names */
const LABEL_FONT = 'Noto Sans Bold'

/** Attribution of the map data (HTML) */
const ATTRIBUTION = '<a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a> 5.1.2'

/**
 * Return the map tiles of the tree page, which Auspice reads as its `mapTiles` extension when the map mounts: a MapLibre
 * style that draws the outlines, land borders and names of the countries of Natural Earth 5.1.2, in the colors of
 * Auspice's default style (`src/util/map-styles.json`). Nextclade serves these files itself, so the map sends no request
 * to another server. `tools/buildBasemap.ts` builds them.
 *
 * The data files are bundled assets with hashed names, which browsers cache. MapLibre loads them in its workers, which
 * resolve no relative URL, so every URL is absolute.
 *
 * The map shows the attribution of the style's sources (`getAttribution()` of `@maplibre/maplibre-gl-leaflet`), and
 * the SVG download writes the `attribution` of the settings below the figure.
 */
export function naturalEarthMapTiles(): ReturnType<typeof getMapTilesSettings> {
  const { origin } = window.location
  const assetUrl = (asset: URL) => new URL(asset.pathname, origin).href
  return {
    attribution: ATTRIBUTION,
    style: {
      version: 8,
      // String concatenation keeps the braces of the pattern, which the URL class would encode
      glyphs: `${origin}${GLYPHS_PATH}`,
      sources: {
        countries: {
          type: 'geojson',
          data: assetUrl(new URL('../../assets/basemap/countries.json', import.meta.url)),
          attribution: ATTRIBUTION,
        },
        borders: { type: 'geojson', data: assetUrl(new URL('../../assets/basemap/borders.json', import.meta.url)) },
        labels: { type: 'geojson', data: assetUrl(new URL('../../assets/basemap/labels.json', import.meta.url)) },
      },
      layers: [
        { id: 'water', type: 'background', paint: { 'background-color': 'hsl(185, 9%, 81%)' } },
        {
          id: 'land',
          type: 'fill',
          source: 'countries',
          paint: { 'fill-color': 'hsl(55, 11%, 96%)', 'fill-antialias': true },
        },
        {
          id: 'boundary_2',
          type: 'line',
          source: 'borders',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': 'hsl(0,0%,70%)',
            'line-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.4, 4, 1],
            'line-width': ['interpolate', ['linear'], ['zoom'], 3, 1, 5, 1.8, 12, 3],
          },
        },
        countryLabelLayer(3, [3, 9, 7, 17], 2),
        countryLabelLayer(2, [2, 9, 5, 17]),
        countryLabelLayer(1, [1, 9, 4, 17]),
      ],
    },
  }
}

/**
 * Return the layer of the names of the countries of one label rank, as the layers `label_country_<rank>` of Auspice's
 * default style: the text size grows with the zoom between two stops (zoom, size, zoom, size)
 */
function countryLabelLayer(rank: number, sizeStops: [number, number, number, number], minzoom?: number) {
  return {
    id: `label_country_${rank}`,
    type: 'symbol',
    source: 'labels',
    ...(minzoom === undefined ? {} : { minzoom }),
    maxzoom: 9,
    filter: ['==', ['get', 'rank'], rank],
    layout: {
      'text-field': ['get', 'name'],
      'text-font': [LABEL_FONT],
      'text-max-width': 6.25,
      'text-size': ['interpolate', ['linear'], ['zoom'], ...sizeStops],
    },
    paint: {
      'text-color': '#6b6b6b',
      'text-halo-blur': 1,
      'text-halo-color': '#fff',
      'text-halo-width': 1,
    },
  }
}

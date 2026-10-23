# Auspice map requests the files of its own origin over HTTPS

## Problem

The map of Auspice 3.1.0 passes a `transformRequest` function to MapLibre, which upgrades every `http://` URL of the map style to `https://`, because some tile providers list their tiles over `http://`. The upgrade also applies to the files that the app serves itself. On a page served over `http://`, such as the development server or a local server of the production build, the server has no `https://` counterpart, so the requests fail and the map draws no countries. The tree page of Nextclade draws its basemap from files of its own origin (see `packages/nextclade-web/src/components/Tree/naturalEarthMapTiles.ts`). On `https://` pages, as in production, the URLs are already `https://` and the problem does not occur.

Nextclade fixes this in the Bun patch of Auspice, `packages/nextclade-web/patches/auspice@3.1.0.patch`: `transformRequest` leaves URLs of the page's own origin unchanged.

## Code

- Request upgrade: [map/map.js#L552-L554](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/map/map.js#L552-L554)

## Fix

Contribute the change to [nextstrain/auspice](https://github.com/nextstrain/auspice), then remove it from the patch after upgrading to an Auspice release that contains it.

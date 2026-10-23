# Auspice map fails when it is mounted again

## Problem

The tree page mounts the Auspice 3.1.0 map when it is turned on, for example when added metadata has coordinates, and unmounts it when the user turns it off or leaves the page. The map component assumes that it is mounted once per page load:

- **Stale export**: the map sets `window.L.getMapSvg`, the function that the SVG download uses, only once, and the function keeps the first map instance. After the map is mounted again, the download reads the detached first map and writes an empty map
- **Crash on early unmount**: the Leaflet map is created on the first update, but `componentWillUnmount()` reads it without a check, so an unmount before that update (for example, React StrictMode's immediate remount, or a failed WebGL setup) throws `Cannot read properties of null (reading 'off')`
- **Leaked resources**: `componentWillUnmount()` removes only two event handlers. It does not remove the Leaflet map, which holds a WebGL context, nor its timers

Nextclade fixes this in the Bun patch of Auspice, `packages/nextclade-web/patches/auspice@3.1.0.patch`: each mount registers the export function of its own instance and removes it on unmount when it still belongs to that instance; the cleanup after an unmount removes the Leaflet map and clears the timers, works when the map was never created, and runs after the current task, so that React StrictMode's immediate remount keeps the map.

## Code

- Export function: [map/map.js#L106-L140](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/map/map.js#L106-L140)
- Unmount: [map/map.js#L737-L740](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/map/map.js#L737-L740)

## Fix

Contribute the changes to [nextstrain/auspice](https://github.com/nextstrain/auspice), then remove them from the patch after upgrading to an Auspice release that contains them.

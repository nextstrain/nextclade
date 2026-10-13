# Web bundle ships d3-color 1.x with a ReDoS advisory

## Problem

Auspice depends on d3 1.x modules, which bring d3-color 1.4.1 into the web bundle. d3-color before 3.1.0 parses color strings with a regular expression that takes exponential time on crafted input ([GHSA-36jr-mh4h-2g58](https://github.com/advisories/GHSA-36jr-mh4h-2g58)). Datasets supply color strings (coloring scales in the tree JSON), so a crafted custom dataset could freeze the tree page.

An override to d3-color 3.1.0 does not work in Nextclade: d3-color 3 is ES-module-only, and the server render of Next.js loads the CommonJS build of d3-interpolate 1.x, which fails to `require` it (`ESM packages (d3-color) need to be imported`).

## Fix

Upgrade the d3 modules of Auspice to their ES-module majors upstream, or transpile d3-interpolate and d3-scale from their ES module sources for the server render, then override d3-color to 3.1.0.

# Auspice entropy chart can be drawn twice under React StrictMode

## Problem

The entropy chart of Auspice 3.1.0 draws itself in `setUp()`, which `componentDidMount()` calls, and keeps the chart object in the component state through `setState({chart})`. `componentWillUnmount()` removes the drawing only `if (this.state.chart)`. In development, React StrictMode unmounts and mounts each component once more right after the first mount. When the state does not hold the chart yet at that simulated unmount, the drawing stays, and the second mount draws a second chart over it. A React 19 probe showed the doubled chart.

On the tree page of Nextclade, which runs React 18 with StrictMode in development, the chart was drawn once: one set of bars and axes, both when the chart is turned on in the sidebar and when the tree page mounts with the chart shown. The fix guards against the doubled drawing under other React versions and timings.

Nextclade fixes this in the Bun patch of Auspice, `packages/nextclade-web/patches/auspice@3.1.0.patch`: `componentWillUnmount()` removes the drawing from the DOM, whether or not the state holds the chart.

## Code

- Chart setup: [entropy/index.js#L196-L211](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/entropy/index.js#L196-L211)
- Unmount: [entropy/index.js#L337](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/entropy/index.js#L337)

## Fix

Contribute the change to [nextstrain/auspice](https://github.com/nextstrain/auspice), then remove it from the patch after upgrading to an Auspice release that contains it.

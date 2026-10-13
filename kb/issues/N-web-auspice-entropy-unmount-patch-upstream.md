# Auspice entropy chart keeps its observer after unmount

## Problem

Auspice 3.0.0's entropy component creates an `IntersectionObserver` on mount and never disconnects it, and its `componentWillUnmount()` is empty with a TODO. Every unmount leaves an observer that dispatches `ENTROPY_ONSCREEN_CHANGE` to the Redux store. React StrictMode mounts the component twice in development, so two observers run. Nextclade unmounts the chart whenever the entropy toggle in the sidebar hides it.

Nextclade fixes this in the Bun patch of Auspice, `packages/nextclade-web/patches/auspice@3.0.0.patch`, as for the tree component in [N-web-auspice-tree-unmount-patch-upstream.md](N-web-auspice-tree-unmount-patch-upstream.md): the component keeps the observer, disconnects it after a real unmount, and keeps the chart and observer of the first mount when React StrictMode mounts the same instance again.

## Code

- Observer creation: [entropy/index.js#L233-L234](https://github.com/nextstrain/auspice/blob/v3.0.0/src/components/entropy/index.js#L233-L234)
- Empty unmount handler: [entropy/index.js#L337-L339](https://github.com/nextstrain/auspice/blob/v3.0.0/src/components/entropy/index.js#L337-L339)

## Fix

Contribute the change to [nextstrain/auspice](https://github.com/nextstrain/auspice), then remove it from the patch after upgrading to an Auspice release that contains it.

# Auspice entropy chart keeps its observer after unmount

## Problem

Auspice's entropy component creates an `IntersectionObserver` on mount and never disconnects it, and its `componentWillUnmount()` is empty with a TODO. Every mount leaves an observer that dispatches `ENTROPY_ONSCREEN_CHANGE` to the Redux store. React StrictMode mounts the component twice in development, so two observers run. The entropy chart clears its SVG before each draw, so no stale drawing is visible.

## Code

- Observer creation: [src/components/entropy/index.js#L232](https://github.com/nextstrain/auspice/blob/v2.67.0/src/components/entropy/index.js#L232)
- Empty unmount handler: [src/components/entropy/index.js#L336-L338](https://github.com/nextstrain/auspice/blob/v2.67.0/src/components/entropy/index.js#L336-L338)

## Fix

Keep the observer on the component and disconnect it in `componentWillUnmount()`. This is an upstream change in Auspice.

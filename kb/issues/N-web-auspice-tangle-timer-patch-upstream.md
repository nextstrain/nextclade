# Auspice keeps the redraw timer of the lines between two trees

## Problem

When two trees are shown, Auspice 3.1.0 draws lines between the tips of the same name. After a change of the panel size, the line component removes the lines and draws them again after a delay of 1 s. Its timer is never reset after it fires and never cleared:

- **Stale timer**: after the delayed redraw, `this.timeout` still holds the finished timer, so the next change of size clears that timer instead of removing the lines. The lines stay correct on screen only because the tree component of Auspice draws them again at once after each change of the trees, also a change of size
- **Redraw after unmount**: the component has no `componentWillUnmount()`, so a redraw that is pending when the trees are removed (for example, the user leaves the tree page or removes the second tree within 1 s of a resize) runs after the component is gone

Nextclade fixes this in the Bun patch of Auspice, `packages/nextclade-web/patches/auspice@3.1.0.patch`: the timer resets `this.timeout` when it fires, and `componentWillUnmount()` clears a pending timer.

## Code

- Redraw timer: [tree/tangle/index.js#L72-L81](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/tree/tangle/index.js#L72-L81)
- Immediate redraw by the tree component: [tree/tree.tsx#L119-L121](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/tree/tree.tsx#L119-L121)

## Fix

Contribute the change to [nextstrain/auspice](https://github.com/nextstrain/auspice), then remove it from the patch after upgrading to an Auspice release that contains it.

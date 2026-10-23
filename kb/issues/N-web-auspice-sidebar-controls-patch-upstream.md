# Auspice sidebar controls need local fixes for keyboard use and Bootstrap pages

## Problem

- **Keyboard**: Auspice 3.1.0 hides the checkbox of each toggle with `display: none`, so the keyboard skips all toggles (such as "Show all labels" and the entropy panel toggle). Panel section headers and the buttons of filter badges react to clicks only. Selects (including the branch label select of stream trees and the geographic resolution select of the map), panel toggles and filter badge buttons have no accessible names
- **Toggle height on Bootstrap pages**: a toggle container has a fixed height of 21 px, and some toggles add padding through their `style` prop. Bootstrap, which Nextclade uses, sizes all boxes as `border-box`, so the padding shrinks the toggle instead of adding space, and the toggle label overlaps the next control, for example "Show all labels" over "Tip Labels"

Nextclade fixes these in the Bun patch of Auspice, `packages/nextclade-web/patches/auspice@3.1.0.patch`: the checkbox of a toggle stays in place, invisible and focusable, with a focus ring on the slider; panel headers and filter badge buttons react to Enter and Space; the controls get names; and the toggle container keeps `content-box` sizing.

## Code

- Hidden checkbox: [controls/toggle.js#L17-L19](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/controls/toggle.js#L17-L19)
- Toggle container: [controls/toggle.js#L6-L10](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/controls/toggle.js#L6-L10)
- Panel header: [controls/panelHeader.tsx#L45-L49](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/controls/panelHeader.tsx#L45-L49)
- Filter badge buttons: [info/filterBadge.js#L109-L117](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/info/filterBadge.js#L109-L117)

## Fix

Contribute the changes to [nextstrain/auspice](https://github.com/nextstrain/auspice), then remove them from the patch after upgrading to an Auspice release that contains them.

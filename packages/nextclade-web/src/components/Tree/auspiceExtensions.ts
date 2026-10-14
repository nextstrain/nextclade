/**
 * Extensions of Auspice, which Auspice reads through the "@extensions" webpack alias (see `config/next/withResolve.ts`)
 *
 * - `enableDatasetEditor`: Shift-click on a legend item opens Auspice's color editor, which changes the colors of the
 *   coloring in this view, for example for a figure
 * - `downloadModal`: Nextclade offers its own downloads above the tree, so the "d" key does not open Auspice's
 *   download modal, which describes downloads of Nextstrain datasets
 */
const auspiceExtensions = {
  enableDatasetEditor: true,
  downloadModal: false,
}

export default auspiceExtensions

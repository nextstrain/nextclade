import { naturalEarthMapTiles } from 'src/components/Tree/naturalEarthMapTiles'

/**
 * Extensions of Auspice, which Auspice reads through the "@extensions" webpack alias (see `config/next/withResolve.ts`)
 *
 * - `enableDatasetEditor`: Shift-click on a legend item opens Auspice's color editor, which changes the colors of the
 *   coloring in this view, for example for a figure
 * - `downloadModal`: Nextclade offers its own downloads above the tree, so the "d" key does not open Auspice's
 *   download modal, which describes downloads of Nextstrain datasets
 * - `mapTiles`: the map draws the countries of Natural Earth from files that Nextclade serves, instead of map tiles from
 *   a third-party server. Built when the map reads it, because the style needs the address of the page, and this module
 *   also loads where there is no window, during the static export
 */
const auspiceExtensions = {
  enableDatasetEditor: true,
  downloadModal: false,
  get mapTiles() {
    return naturalEarthMapTiles()
  },
}

export default auspiceExtensions

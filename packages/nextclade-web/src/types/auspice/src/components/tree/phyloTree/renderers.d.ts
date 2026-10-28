declare module 'auspice/src/components/tree/phyloTree/renderers' {
  /** Set the area that clips the branches, tips and labels of a tree, from its x and y ranges and margins */
  export function setClipMask(this: ClipMaskTree): void

  /** Fields of a drawn tree that `setClipMask()` reads */
  export interface ClipMaskTree {
    xScale: { range: () => number[] }
    yScale: { range: () => number[] }
    /** Width of the branch labels that extend into the margin on the root side */
    margins: { branchLabels?: number }
    /** x and y directions of the tree: negative x mirrors the tree, with the root on the right */
    params: { orientation: number[] }
    groups: { clipPath: { select: (selector: 'rect') => ClipRect } }
  }

  interface ClipRect {
    attr: (name: string, value: number) => ClipRect
  }
}

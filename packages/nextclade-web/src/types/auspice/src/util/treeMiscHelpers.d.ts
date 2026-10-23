declare module 'auspice/src/util/treeMiscHelpers' {
  /** Return the value of an attribute of a node (`node_attrs`), or its name for the strain symbol */
  export function getTraitFromNode(node: unknown, trait: string | symbol): string | number | undefined
}

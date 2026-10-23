/** Return whether the browser can create the WebGL context that the map of the tree page draws with */
export function canDrawMaps(): boolean {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
  context?.getExtension('WEBGL_lose_context')?.loseContext()
  return context !== null
}

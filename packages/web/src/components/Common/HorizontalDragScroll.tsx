import React, { PropsWithChildren, useCallback, useState } from 'react'

export enum MouseState {
  up,
  down,
  moving,
}

export interface DragScrollProps {
  onScroll(delta: number): void
}

export function HorizontalDragScroll({ children, onScroll, ...restProps }: PropsWithChildren<DragScrollProps>) {
  const [mouseState, setMouseState] = useState(MouseState.up)

  const onMouseDown = useCallback(() => setMouseState(MouseState.down), [])
  const onMouseUp = useCallback(() => setMouseState(MouseState.up), [])

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (mouseState !== MouseState.up) {
        setMouseState(MouseState.moving)
        const delta = e.movementX
        onScroll(delta)
      }
    },
    [mouseState, onScroll],
  )

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div onMouseDown={onMouseDown} onMouseUp={onMouseUp} onMouseMove={onMouseMove} {...restProps}>
      {children}
    </div>
  )
}

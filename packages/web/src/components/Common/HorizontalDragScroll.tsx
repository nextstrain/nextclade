import React, { PropsWithChildren, useCallback, useState } from 'react'

import styled from 'styled-components'

export enum MouseState {
  up,
  down,
  moving,
}

const Draggable = styled.div<{ $dragged: boolean }>`
  cursor: ${(props) => props.$dragged && 'grabbing'};
  user-select: ${(props) => props.$dragged && 'none'};
`

export interface DragScrollProps {
  onScroll(delta: number): void
  onWheel(delta: number): void
}

export function HorizontalDragScroll({
  children,
  onScroll,
  onWheel,
  ...restProps
}: PropsWithChildren<DragScrollProps>) {
  const [mouseState, setMouseState] = useState(MouseState.up)

  const onMouseDown = useCallback(() => setMouseState(MouseState.down), [])
  const onMouseUp = useCallback(() => setMouseState(MouseState.up), [])
  const dragged = mouseState === MouseState.moving

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

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (e.shiftKey) {
        const delta = e.deltaY
        onWheel(delta)
      }
    },
    [onWheel],
  )

  return (
    <Draggable
      $dragged={dragged}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseMove={onMouseMove}
      onWheel={handleWheel}
      {...restProps}
    >
      {children}
    </Draggable>
  )
}

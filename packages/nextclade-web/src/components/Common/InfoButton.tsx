import React, { MouseEvent, PropsWithChildren, useCallback } from 'react'
import { Button as ButtonBase, ButtonProps, CardBody } from 'reactstrap'
import styled, { useTheme } from 'styled-components'
import { FaInfo as InfoIcon } from 'react-icons/fa6'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { useToggle } from 'src/hooks/useToggle'
import {
  useFloating,
  useInteractions,
  useFocus,
  useDismiss,
  useRole,
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  size as fitToAvailableSize,
} from '@floating-ui/react'
import type { MiddlewareState } from '@floating-ui/react'
import { VIEWPORT_PADDING } from 'src/helpers/viewport'

export interface InfoButtonProps extends Omit<ButtonProps, 'size'> {
  size?: number
}

export function InfoButton({ size = 20, children, ...restProps }: PropsWithChildren<InfoButtonProps>) {
  const { t } = useTranslationSafe()
  const theme = useTheme()

  const { state: isOpen, toggle, setState: setIsOpen } = useToggle(false)
  const { refs, context, floatingStyles } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'bottom',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(4),
      flip({ padding: VIEWPORT_PADDING }),
      shift({ padding: VIEWPORT_PADDING }),
      fitToAvailableSize({ padding: VIEWPORT_PADDING, apply: applyAvailableSize }),
    ],
  })
  const dismiss = useDismiss(context)
  const focus = useFocus(context)
  const role = useRole(context)
  const { getReferenceProps, getFloatingProps } = useInteractions([focus, dismiss, role])

  const onClick = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      toggle()
      e.stopPropagation()
    },
    [toggle],
  )

  return (
    <>
      <Button
        innerRef={refs.setReference} // NOTE: using `innerRef` to pass ref to `reactstrap` component underneath.
        as={ButtonBase} // NOTE: this works with styled-components v5, but "as" prop is removed in v6.
        title={t('Click to get help information')}
        $size={size}
        {...getReferenceProps({ onClick })}
        {...restProps}
      >
        <Icon color={theme.primary} size={size * 0.66} />
      </Button>
      {isOpen && (
        <FloatingPortal>
          <Floating ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()}>
            <Card>
              <CardBody>{children}</CardBody>
            </Card>
          </Floating>
        </FloatingPortal>
      )}
    </>
  )
}

/** Expose the space left between the popup and the viewport edges, so that the card shrinks to fit into it */
function applyAvailableSize({ availableWidth, availableHeight, elements }: MiddlewareState & AvailableSize) {
  elements.floating.style.setProperty('--available-width', `${availableWidth}px`)
  elements.floating.style.setProperty('--available-height', `${availableHeight}px`)
}

interface AvailableSize {
  availableWidth: number
  availableHeight: number
}

const Floating = styled.div`
  z-index: 1005;
`

const Card = styled.div`
  overflow-y: auto;
  box-shadow: 1px 1px 10px 5px #0005;
  border-radius: 5px;
  height: 100%;
  background-color: ${(props) => props.theme.bodyBg};
  max-height: min(80vh, var(--available-height, 80vh));
  max-width: var(--available-width, 80vw);
  width: 500px;
`

const Button = styled.button<{ $size?: number }>`
  display: inline-flex;
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
  border-radius: ${(props) => props.$size}px;
  padding: 0 !important;
  margin: auto 0.5rem;
`

const Icon = styled(InfoIcon)`
  padding: 0 !important;
  margin: auto !important;
`

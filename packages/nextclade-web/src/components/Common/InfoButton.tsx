import React, { PropsWithChildren } from 'react'
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
  autoPlacement,
} from '@floating-ui/react'

export interface InfoButtonProps extends Omit<ButtonProps, 'size'> {
  size?: number
}

export function InfoButton({ size = 18, children, ...restProps }: PropsWithChildren<InfoButtonProps>) {
  const { t } = useTranslationSafe()
  const theme = useTheme()

  const { state: isOpen, toggle, setState: setIsOpen } = useToggle(false)
  const { refs, context, floatingStyles } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [autoPlacement()],
  })
  const dismiss = useDismiss(context)
  const focus = useFocus(context)
  const role = useRole(context)
  const { getReferenceProps, getFloatingProps } = useInteractions([focus, dismiss, role])

  return (
    <>
      <Button
        innerRef={refs.setReference} // NOTE: using `innerRef` to pass ref to `reactstrap` component underneath.
        as={ButtonBase} // NOTE: this works with styled-components v5, but "as" prop is removed in v6.
        title={t('Click to get help information')}
        $size={size}
        {...getReferenceProps({ onClick: toggle })}
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

const Floating = styled.div`
  z-index: 1005;
  width: 500px;
  max-width: 80vw;
  max-height: 80vh;
`

const Card = styled.div`
  overflow-y: auto;
  box-shadow: 1px 1px 10px 5px #0005;
  border-radius: 5px;
  height: 100%;
  background-color: ${(props) => props.theme.bodyBg};
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

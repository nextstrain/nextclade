import React, { PropsWithChildren, useMemo } from 'react'
import { MdArrowDropDown } from 'react-icons/md'
import { Card, CardBody, CardHeader, CardProps, Collapse } from 'reactstrap'
import { useToggle } from 'src/hooks/useToggle'
import styled from 'styled-components'

export interface CardCollapsibleProps extends PropsWithChildren<CardProps> {
  header?: React.ReactNode
  children?: React.ReactNode | React.ReactNode[]
  defaultCollapsed?: boolean
}

export function CardCollapsible({ header, children, defaultCollapsed = true, ...restProps }: CardCollapsibleProps) {
  const { state: collapsed, toggle: toggleCollapsed } = useToggle(defaultCollapsed)
  const isOpen = useMemo(() => !collapsed && !!children, [children, collapsed])
  const Icon = useMemo(
    () => <ArrowIcon color={children ? '#999' : 'transparent'} size={22} $rotated={isOpen} />,
    [children, isOpen],
  )
  return (
    <Card {...restProps}>
      <CardHeader onClick={toggleCollapsed}>
        {Icon}
        <HeaderWrapper>{header}</HeaderWrapper>
      </CardHeader>

      <Collapse isOpen={isOpen}>
        <CardBody>{children}</CardBody>
      </Collapse>
    </Card>
  )
}

export const ArrowIcon = styled(MdArrowDropDown)<{ $rotated?: boolean }>`
  display: inline;
  transition: transform linear 0.25s;
  transform: ${(props) => !props.$rotated && 'rotate(-90deg)'};
`

const HeaderWrapper = styled.span`
  vertical-align: middle;
`

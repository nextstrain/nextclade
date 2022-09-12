import React, { useCallback, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import { HiOutlineAcademicCap } from 'react-icons/hi'
import { ButtonProps } from 'reactstrap'

import { ButtonTransparent } from 'src/components/Common/ButtonTransparent'

const CitationDialog = dynamic(() => import('src/components/Citation/CitationDialog'), { ssr: false })

export const ButtonCitationBase = styled(ButtonTransparent)<ButtonProps>`
  margin: 2px 2px;
  height: 38px;
  width: 50px;
  color: ${(props) => props.theme.gray700};

  @media (min-width: 1200px) {
    width: 100px;
  }
`

export function CitationButton() {
  const { t } = useTranslation()
  const [showCitation, setShowCitation] = useState(false)
  const totggle = useCallback(() => setShowCitation((showCitation) => !showCitation), [])
  const text = t('Citation')
  const dialog = useMemo(() => {
    if (!showCitation) {
      return null
    }
    return <CitationDialog isOpen={showCitation} toggle={totggle} />
  }, [showCitation, totggle])

  return (
    <>
      <ButtonCitationBase type="button" onClick={totggle} title={text}>
        <HiOutlineAcademicCap className="mr-xl-2" />
        <span className="d-none d-xl-inline">{text}</span>
      </ButtonCitationBase>

      {dialog}
    </>
  )
}

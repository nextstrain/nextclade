import dynamic from 'next/dynamic'
import React, { useCallback, useMemo } from 'react'
import { useRecoilState } from 'recoil'
import type { ButtonProps } from 'reactstrap'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import { FaListUl } from 'react-icons/fa'

import { ButtonTransparent } from 'src/components/Common/ButtonTransparent'
import { changelogIsShownAtom } from 'src/state/settings.state'

const WhatsNewDialog = dynamic(() => import('src/components/Layout/WhatsNewDialog'), { ssr: false })

export const ButtonWhatsNewBase = styled(ButtonTransparent)<ButtonProps>`
  margin: 2px 2px;
  height: 38px;
  width: 50px;
  color: ${(props) => props.theme.gray700};

  @media (min-width: 1200px) {
    width: 100px;
  }
`

export function WhatsNewButton() {
  const { t } = useTranslation()

  const [showChangelog, setShowChangelog] = useRecoilState(changelogIsShownAtom)

  const toggle = useCallback(() => {
    setShowChangelog((showChangelog) => !showChangelog)
  }, [setShowChangelog])

  const text = t("What's new")

  const dialog = useMemo(() => {
    if (!showChangelog) {
      return null
    }
    return <WhatsNewDialog isOpen={showChangelog} toggle={toggle} />
  }, [showChangelog, toggle])

  return (
    <>
      <ButtonWhatsNewBase type="button" onClick={toggle} title={text}>
        <FaListUl className="mr-xl-2" />
        <span className="d-none d-xl-inline">{text}</span>
      </ButtonWhatsNewBase>

      {dialog}
    </>
  )
}

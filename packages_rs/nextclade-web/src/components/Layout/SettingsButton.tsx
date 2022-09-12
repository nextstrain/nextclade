import React, { useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRecoilState } from 'recoil'
import styled from 'styled-components'
import { IoMdSettings } from 'react-icons/io'
import { ButtonProps } from 'reactstrap'

import { ButtonTransparent } from 'src/components/Common/ButtonTransparent'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { isSettingsDialogOpenAtom } from 'src/state/settings.state'

const SettingsDialog = dynamic(() => import('src/components/Layout/SettingsDialog'), { ssr: false })

export const ButtonSettingsBase = styled(ButtonTransparent)<ButtonProps>`
  margin: 2px 2px;
  height: 38px;
  color: ${(props) => props.theme.gray700};

  width: 50px;
  @media (min-width: 1200px) {
    width: 100px;
  }
`

export function SettingsButton() {
  const { t } = useTranslationSafe()

  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useRecoilState(isSettingsDialogOpenAtom)

  const toggleOpen = useCallback(
    () => setIsSettingsDialogOpen(!isSettingsDialogOpen),
    [setIsSettingsDialogOpen, isSettingsDialogOpen],
  )

  const text = useMemo(() => t('Settings'), [t])

  const dialog = useMemo(() => {
    if (!isSettingsDialogOpen) {
      return null
    }

    return <SettingsDialog isOpen={isSettingsDialogOpen} toggleOpen={toggleOpen} />
  }, [isSettingsDialogOpen, toggleOpen])

  return (
    <>
      <ButtonSettingsBase type="button" onClick={toggleOpen} title={text}>
        <IoMdSettings className="mr-xl-2" />
        <span className="d-none d-xl-inline">{text}</span>
      </ButtonSettingsBase>

      {dialog}
    </>
  )
}

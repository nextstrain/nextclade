import { Button, ButtonProps } from 'reactstrap'
import { useTranslation } from 'react-i18next'
import { goBack } from 'connected-next-router'
import { FaCaretLeft } from 'react-icons/fa'
import React from 'react'

export function ButtonBack({ onClick }: ButtonProps) {
  const { t } = useTranslation()

  return (
    <Button color="secondary" className="results-btn-back" onClick={goBack}>
      <FaCaretLeft />
      {t('Back')}
    </Button>
  )
}

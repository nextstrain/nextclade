import React from 'react'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { InfoButton } from 'src/components/Common/InfoButton'
import { LinkExternal } from 'src/components/Link/LinkExternal'

export function SelectRefNodeHelp() {
  const { t } = useTranslationSafe()

  return (
    <InfoButton color="link">
      <p>{t('Select reference node target for relative mutations.')}</p>

      <p>{t('This allows ...')}</p>

      <p>
        {t('Learn more in Nextclade {{documentation}}')}
        <LinkExternal href="https://docs.nextstrain.org/projects/nextclade/en/stable">
          {t('documentation')}
        </LinkExternal>
        {t('.')}
      </p>
    </InfoButton>
  )
}

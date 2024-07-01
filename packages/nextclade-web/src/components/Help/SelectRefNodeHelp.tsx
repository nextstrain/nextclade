import React from 'react'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { InfoButton } from 'src/components/Common/InfoButton'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { Ul, Li } from 'src/components/Common/List'

export function SelectRefNodeHelp() {
  const { t } = useTranslationSafe()

  return (
    <InfoButton color="link">
      <h5>{t('Select target for mutation calling.')}</h5>

      <Ul>
        <Li>{t('"Reference" - shows mutations relative to the reference sequence (as defined in the dataset)')}</Li>
        <Li>
          {t(
            '"Parent" - shows private mutations, i.e. mutations relative to the parent (nearest) node to which the query sample has been attached to during phylogenetic placement.',
          )}
        </Li>
        <Li>
          {t(
            '"Clade founder" - shows mutations relative to the founder of the clade that has been assigned to the query sample',
          )}
        </Li>
        <Li>
          {t(
            'Entries of format "\'<attribute>\' founder" show mutations relative to the founder node of a particular clade-like attribute  (if any defined in the dataset). Dataset authors may choose to exclude certain attributes.',
          )}
        </Li>
        <Li>
          {t(
            'Any additional entries show mutations relative to the node(s) found according to the custom search criteria (if any defined in the dataset). If the query sample does not match search criteria, then "{{ notApplicable }}" will be displayed.',
            { notApplicable: t('Not applicable') },
          )}
        </Li>
      </Ul>

      <p>
        {t(
          'Switching the target will change mutations displayed in the sequence views as well as in the "Mut" column of the table and its mouseover tooltip.',
        )}
      </p>

      <p className="p-0 m-0 small">
        {t('Learn more in Nextclade {{documentation}}')}
        <LinkExternal href="https://docs.nextstrain.org/projects/nextclade/en/stable">
          {t('documentation')}
        </LinkExternal>
      </p>
    </InfoButton>
  )
}

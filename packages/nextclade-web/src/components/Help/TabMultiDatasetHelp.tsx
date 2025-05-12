import React from 'react'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { InfoButton } from 'src/components/Common/InfoButton'
import { LinkExternal } from 'src/components/Link/LinkExternal'

export function TabMultiDatasetHelp() {
  const { t } = useTranslationSafe()

  return (
    <InfoButton>
      <p>
        {t(
          'In multi-dataset mode, Nextclade automatically tries to deduce the most appropriate dataset for each sequence, which results with a list of suggested datasets. When running analysis in multi-dataset mode, you will receive separate results (table, tree and exports) for each dataset.',
        )}
      </p>

      <p>
        {t(
          'This is particularly useful, for example, to analyze FASTA files containing a mixture of flu segments (HA, NA) or a mixture of different organisms, or, more generally, what Nextclade treats as different datasets, e.g. RSV-A and RSV-B.',
        )}
      </p>

      <p>
        {t(
          'Currently, the analysis results obtained for different datasets in multi-dataset mode are still entirely separate. There is no difference between performing a multi-dataset run and performing multiple runs in single-dataset mode one after another. Multi-dataset more is a convenience feature only.',
        )}
      </p>

      <p className="p-0 m-0 small">
        {t('Learn more about datasets in Nextclade {{documentation}}')}
        <LinkExternal href="https://docs.nextstrain.org/projects/nextclade/en/stable">
          {t('documentation')}
        </LinkExternal>
      </p>
    </InfoButton>
  )
}

import React from 'react'
import { HelpTipsColumnSeqViewGeneLegend } from 'src/components/Results/HelpTips/HelpTipsColumnSeqViewGeneLegend'
import { HelpTipsColumnSeqViewNucLegend } from 'src/components/Results/HelpTips/HelpTipsColumnSeqViewNucLegend'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { InfoButton } from 'src/components/Common/InfoButton'
import { LinkExternal } from 'src/components/Link/LinkExternal'

export function SelectGeneHelp() {
  const { t } = useTranslationSafe()

  return (
    <InfoButton color="link">
      <h5>{t('Select a genetic feature.')}</h5>

      <p>
        {t(
          'This allows to switch sequence views between nucleotide sequence and peptides (translated CDSes; only available if the dataset provides a genome annotation).',
        )}
      </p>

      <hr />

      <p>
        {t(
          'Each row of the table displays a schema of the corresponding sequence, highlighting the differences relative to the target selected in the "Relative to" dropdown.',
        )}
      </p>

      <hr />

      <h5>{t('Nucleotide Sequence mode')}</h5>

      <p>
        {t(
          'In "Nucleotide Sequence" mode, the whole nucleotide sequence is shown. Line markers represent nucleotide mutations. They are colored by the resulting (query) nucleotide:',
        )}
      </p>

      <HelpTipsColumnSeqViewNucLegend />

      <p>
        {t('Mouse hover on a mutation marker to show details of that mutation and its neighborhood in the alignment.')}
        <br />
        {t("Unsequenced regions at the 5' and 3' end are indicated as light gray areas on both ends.")}
        <br />
        {t('For a mapping between positions in the sequence and genes, see Genome Annotation view below the table.')}
      </p>

      <hr />

      <h5>{t('Peptide/protein mode')}</h5>

      <p>
        {t(
          'When a CDS is selected, each row displays a schema of the corresponding translated amino acid sequence by highlighting the differences to the corresponding peptide in the reference/target. Note that the CDS might be split into multiple segments or be located on the reverse strand.',
        )}
        <br />
        {t(
          'Line markers on sequence views represent amino acid mutations colored by the resulting (query) amino acid:',
        )}
      </p>

      <HelpTipsColumnSeqViewGeneLegend />

      <p>
        {t('Note: Sometimes mutations are so close to each other that they overlap.')}
        <br />
        {t('Note: Positions are 1-based.')}
      </p>

      <hr />

      <p className="p-0 m-0 small">
        {t('Learn more in Nextclade {{documentation}}')}
        <LinkExternal href="https://docs.nextstrain.org/projects/nextclade/en/stable">
          {t('documentation')}
        </LinkExternal>
      </p>
    </InfoButton>
  )
}

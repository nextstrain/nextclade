import React, { useMemo } from 'react'

import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import { Col, Row } from 'reactstrap'
import { useRecoilState, useRecoilValue, useResetRecoilState } from 'recoil'

import { geneMapErrorAtom, refSeqErrorAtom, refTreeErrorAtom, virusPropertiesErrorAtom } from 'src/state/error.state'
import { geneMapInputAtom, refSeqInputAtom, refTreeInputAtom, virusPropertiesInputAtom } from 'src/state/inputs.state'

import { FileIconFasta, FileIconGff, FileIconJson } from 'src/components/Common/FileIcons'
import { FilePicker } from 'src/components/FilePicker/FilePicker'

export function FilePickerAdvanced() {
  const { t } = useTranslation()

  const [refSeq, setRefSeq] = useRecoilState(refSeqInputAtom)
  const refSeqError = useRecoilValue(refSeqErrorAtom)
  const resetRefSeq = useResetRecoilState(refSeqInputAtom)

  const [geneMap, setGeneMap] = useRecoilState(geneMapInputAtom)
  const geneMapError = useRecoilValue(geneMapErrorAtom)
  const resetGeneMap = useResetRecoilState(geneMapInputAtom)

  const [refTree, setRefTree] = useRecoilState(refTreeInputAtom)
  const refTreeError = useRecoilValue(refTreeErrorAtom)
  const resetRefTree = useResetRecoilState(refTreeInputAtom)

  const [virusProperties, setVirusProperties] = useRecoilState(virusPropertiesInputAtom)
  const virusPropertiesError = useRecoilValue(virusPropertiesErrorAtom)
  const resetVirusProperties = useResetRecoilState(virusPropertiesInputAtom)

  const iconFasta = useMemo(() => <FileIconFasta size={30} />, [])
  const iconGff = useMemo(() => <FileIconGff size={30} />, [])
  const iconJson = useMemo(() => <FileIconJson size={30} />, [])

  return (
    <Row>
      <Col>
        <FilePicker
          className="mb-2"
          compact
          icon={iconJson}
          title={t('Reference tree')}
          exampleUrl="https://example.com/tree.json"
          pasteInstructions={t('Enter reference tree in {{formatName}} format', { formatName: 'Auspice JSON v2' })}
          input={refTree}
          error={refTreeError}
          onRemove={resetRefTree}
          onInput={setRefTree}
        />

        <FilePicker
          className="my-3"
          compact
          icon={iconFasta}
          title={t('Reference sequence')}
          exampleUrl="https://example.com/root_seq.fasta"
          pasteInstructions={t('Enter reference sequence in {{formatName}} format', { formatName: 'FASTA' })}
          input={refSeq}
          error={refSeqError}
          onRemove={resetRefSeq}
          onInput={setRefSeq}
        />

        <FilePicker
          className="my-3"
          compact
          icon={iconJson}
          title={t('Pathogen JSON')}
          exampleUrl="https://example.com/pathogen.json"
          pasteInstructions={t('Enter pathogen description in {{formatName}} format', { formatName: 'JSON' })}
          input={virusProperties}
          error={virusPropertiesError}
          onRemove={resetVirusProperties}
          onInput={setVirusProperties}
        />

        <FilePicker
          className="my-3"
          compact
          icon={iconGff}
          title={t('Genome annotation')}
          exampleUrl="https://example.com/genome_annotation.gff3"
          pasteInstructions={t('Enter genome annotation in {{formatName}} format', { formatName: 'GFF3' })}
          input={geneMap}
          error={geneMapError}
          onRemove={resetGeneMap}
          onInput={setGeneMap}
        />
      </Col>
    </Row>
  )
}

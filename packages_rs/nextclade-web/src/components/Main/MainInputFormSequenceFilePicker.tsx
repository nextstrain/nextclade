import React, { useCallback, useMemo } from 'react'
import { sumBy } from 'lodash'
import { useRouter } from 'next/router'
import { connect } from 'react-redux'
import { Button, Col, Form, FormGroup, Row } from 'reactstrap'
import { useRecoilCallback, useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import { analysisStatusGlobalAtom } from 'src/state/analysisStatusGlobal.state'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { errorAtom } from 'src/state/error.state'
import { analysisResultsAtom } from 'src/state/results.state'
import { numThreadsAtom } from 'src/state/settings.state'
import styled from 'styled-components'

import type { DatasetFlat } from 'src/algorithms/types'
import type { State } from 'src/state/reducer'
import type { AlgorithmInput, AlgorithmParams } from 'src/state/algorithm/algorithm.state'
import { Toggle } from 'src/components/Common/Toggle'
import { FlexLeft, FlexRight } from 'src/components/FilePicker/FilePickerStyles'
import { setShouldRunAutomatically } from 'src/state/settings/settings.actions'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { AlgorithmInputDefault } from 'src/io/AlgorithmInput'
import { algorithmRunAsync, removeFasta, setFasta, setIsDirty } from 'src/state/algorithm/algorithm.actions'
import { setShowNewRunPopup } from 'src/state/ui/ui.actions'
import {
  selectCanRun,
  selectCurrentDataset,
  selectHasRequiredInputs,
  selectParams,
  selectIsInProgressFasta,
} from 'src/state/algorithm/algorithm.selectors'
import { FilePicker } from 'src/components/FilePicker/FilePicker'
import { FileIconFasta } from 'src/components/Common/FileIcons'
import { selectShouldRunAutomatically } from 'src/state/settings/settings.selectors'
import { LaunchAnalysisInputs, launchAnalysis, LaunchAnalysisCallbacks } from 'src/workers/launchAnalysis'
import {
  qrySeqAtom,
  refSeqAtom,
  geneMapAtom,
  refTreeAtom,
  qcConfigAtom,
  virusPropertiesAtom,
  primersCsvAtom,
} from 'src/state/inputs.state'

const SequenceFilePickerContainer = styled.section`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
`

const ButtonRunStyled = styled(Button)`
  min-width: 160px;
  min-height: 50px;
  margin-left: 1rem;
`

export interface MainInputFormSequenceFilePickerProps {
  params: AlgorithmParams
  datasetCurrent?: DatasetFlat
  canRun: boolean
  hasRequiredInputs: boolean
  isInProgressFasta: boolean
  shouldRunAutomatically: boolean
  algorithmRunTrigger(_0: unknown): void
  setShowNewRunPopup(showNewRunPopup: boolean): void
  setIsDirty(isDirty: boolean): void
  setFasta(input: AlgorithmInput): void
  removeFasta(_0: unknown): void
  setShouldRunAutomatically(shouldRunAutomatically: boolean): void
}

const mapStateToProps = (state: State) => ({
  params: selectParams(state),
  datasetCurrent: selectCurrentDataset(state),
  canRun: selectCanRun(state),
  hasRequiredInputs: selectHasRequiredInputs(state),
  isInProgressFasta: selectIsInProgressFasta(state),
  shouldRunAutomatically: selectShouldRunAutomatically(state),
})

const mapDispatchToProps = {
  setFasta: setFasta.trigger,
  removeFasta,
  algorithmRunTrigger: algorithmRunAsync.trigger,
  setShowNewRunPopup,
  setIsDirty,
  setShouldRunAutomatically,
}

export const MainInputFormSequenceFilePicker = connect(
  mapStateToProps,
  mapDispatchToProps,
)(MainInputFormSequenceFilePickerDisconnected)

export function MainInputFormSequenceFilePickerDisconnected({
  params,
  canRun,
  hasRequiredInputs,
  isInProgressFasta,
  setShowNewRunPopup,
  setIsDirty,
  shouldRunAutomatically,
  setShouldRunAutomatically,
}: MainInputFormSequenceFilePickerProps) {
  const { t } = useTranslationSafe()
  const router = useRouter()

  const numThreads = useRecoilValue(numThreadsAtom)
  const setGlobalStatus = useSetRecoilState(analysisStatusGlobalAtom)
  const datasetCurrent = useRecoilValue(datasetCurrentAtom)

  const [_, setQrySeq] = useRecoilState(qrySeqAtom)
  const [refSeq, setRefSeq] = useRecoilState(refSeqAtom)
  const [geneMap, setGeneMap] = useRecoilState(geneMapAtom)
  const [refTree, setRefTree] = useRecoilState(refTreeAtom)
  const [qcConfig, setQcConfig] = useRecoilState(qcConfigAtom)
  const [virusProperties, setVirusProperties] = useRecoilState(virusPropertiesAtom)
  const [primersCsv, setPrimersCsv] = useRecoilState(primersCsvAtom)

  const hasErrors = useMemo(() => {
    const numErrors = sumBy(Object.values(params.errors), (err) => err.length)
    return numErrors > 0
  }, [params.errors])

  const run = useRecoilCallback(
    ({ set, snapshot: { getPromise } }) =>
      () => {
        const qrySeq = getPromise(qrySeqAtom)

        setShowNewRunPopup(false)
        setIsDirty(true)

        const inputs: LaunchAnalysisInputs = {
          ref_seq_str: refSeq,
          gene_map_str: geneMap,
          tree_str: refTree,
          qc_config_str: qcConfig,
          virus_properties_str: virusProperties,
          pcr_primers_str: primersCsv,
        }

        const callbacks: LaunchAnalysisCallbacks = {
          onGlobalStatus(status) {
            setGlobalStatus(status)
          },
          onParsedFasta(/* record */) {
            // TODO: this does not work well: updates in `onAnalysisResult()` callback below fight with this one.
            // Figure out how to make them both work.
            // set(analysisResultsAtom(record.seqName), { index: record.index, seqName: record.seqName })
          },
          onAnalysisResult(result) {
            set(analysisResultsAtom(result.seqName), result)
          },
          onError(error) {
            set(errorAtom, error)
          },
          onComplete() {},
        }

        if (!datasetCurrent) {
          throw new ErrorInternal('Dataset is not selected, but required.')
        }

        launchAnalysis(qrySeq, inputs, callbacks, datasetCurrent, numThreads).catch(console.error)

        // eslint-disable-next-line no-void
        void router.push('/results')
      },
    [
      setShowNewRunPopup,
      setIsDirty,
      refSeq,
      geneMap,
      refTree,
      qcConfig,
      virusProperties,
      primersCsv,
      datasetCurrent,
      numThreads,
      router,
      setGlobalStatus,
    ],
  )

  const setSequences = useCallback(
    (input: AlgorithmInput) => {
      setQrySeq(input)

      if (shouldRunAutomatically) {
        run()
      }
    },
    [run, setQrySeq, shouldRunAutomatically],
  )

  const setExampleSequences = useCallback(() => {
    if (!datasetCurrent) {
      throw new Error('Internal error: dataset is not ready')
    }

    setQrySeq(new AlgorithmInputDefault(datasetCurrent))

    if (shouldRunAutomatically) {
      run()
    }
  }, [datasetCurrent, run, setQrySeq, shouldRunAutomatically])

  const { isRunButtonDisabled, runButtonColor, runButtonTooltip } = useMemo(() => {
    const isRunButtonDisabled = !(canRun && hasRequiredInputs) || hasErrors
    return {
      isRunButtonDisabled,
      runButtonColor: isRunButtonDisabled ? 'secondary' : 'success',
      runButtonTooltip: isRunButtonDisabled
        ? t('Please provide input files for the algorithm')
        : t('Launch the algorithm!'),
    }
  }, [canRun, hasErrors, hasRequiredInputs, t])

  const LoadExampleLink = useMemo(() => {
    const cannotLoadExample = hasRequiredInputs || isInProgressFasta || hasErrors
    return (
      <Button color="link" onClick={setExampleSequences} disabled={cannotLoadExample}>
        {t('Load example')}
      </Button>
    )
  }, [hasErrors, hasRequiredInputs, isInProgressFasta, setExampleSequences, t])

  const onToggleRunAutomatically = useCallback(() => {
    setShouldRunAutomatically(!shouldRunAutomatically)
  }, [setShouldRunAutomatically, shouldRunAutomatically])

  return (
    <SequenceFilePickerContainer>
      <FilePicker
        title={t('Provide sequence data')}
        icon={<FileIconFasta />}
        exampleUrl="https://example.com/sequences.fasta"
        pasteInstructions={t('Enter sequence data in FASTA or plain text format')}
        input={params.raw.seqData}
        errors={params.errors.seqData}
        isInProgress={isInProgressFasta}
        onRemove={removeFasta}
        onInput={setSequences}
      />

      <Row noGutters className="mt-2">
        <Col className="w-100 d-flex">
          <FlexLeft>
            <Form className="d-flex h-100 mt-1">
              <FormGroup className="my-auto">
                <Toggle
                  identifier="toggle-run-automatically"
                  checked={shouldRunAutomatically}
                  onCheckedChanged={onToggleRunAutomatically}
                >
                  <span title="Run Nextclade automatically after sequence data is provided">
                    {t('Run automatically')}
                  </span>
                </Toggle>
              </FormGroup>
            </Form>
          </FlexLeft>

          <FlexRight>
            {LoadExampleLink}

            <ButtonRunStyled
              disabled={isRunButtonDisabled}
              color={runButtonColor}
              onClick={run}
              title={runButtonTooltip}
            >
              {t('Run')}
            </ButtonRunStyled>
          </FlexRight>
        </Col>
      </Row>
    </SequenceFilePickerContainer>
  )
}

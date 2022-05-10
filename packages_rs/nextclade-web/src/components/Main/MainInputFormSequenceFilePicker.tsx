import React, { useCallback, useMemo } from 'react'
import { useRouter } from 'next/router'
import { useDispatch } from 'react-redux'
import { Button, Col, Form, FormGroup, Row } from 'reactstrap'
import { useRecoilCallback, useRecoilState, useRecoilValue, useResetRecoilState, useSetRecoilState } from 'recoil'
import type { AuspiceJsonV2 } from 'auspice'
import styled from 'styled-components'

import { changeColorBy } from 'auspice/src/actions/colors'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { auspiceStartClean, treeFilterByNodeType } from 'src/state/auspice/auspice.actions'
import { createAuspiceState } from 'src/state/auspice/createAuspiceState'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import { analysisStatusGlobalAtom, canRunAtom } from 'src/state/analysisStatusGlobal.state'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { globalErrorAtom, hasInputErrorsAtom, qrySeqErrorAtom } from 'src/state/error.state'
import { analysisResultsAtom, treeAtom } from 'src/state/results.state'
import { numThreadsAtom, shouldRunAutomaticallyAtom, showNewRunPopupAtom } from 'src/state/settings.state'
import { AlgorithmGlobalStatus } from 'src/state/algorithm/algorithm.state'
import type { AlgorithmInput } from 'src/state/algorithm/algorithm.state'
import { Toggle } from 'src/components/Common/Toggle'
import { FlexLeft, FlexRight } from 'src/components/FilePicker/FilePickerStyles'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { AlgorithmInputDefault } from 'src/io/AlgorithmInput'
import { FilePicker } from 'src/components/FilePicker/FilePicker'
import { FileIconFasta } from 'src/components/Common/FileIcons'
import { LaunchAnalysisInputs, launchAnalysis, LaunchAnalysisCallbacks } from 'src/workers/launchAnalysis'
import {
  qrySeqAtom,
  refSeqAtom,
  geneMapAtom,
  refTreeAtom,
  qcConfigAtom,
  virusPropertiesAtom,
  primersCsvAtom,
  hasRequiredInputsAtom,
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

export function MainInputFormSequenceFilePicker() {
  const { t } = useTranslationSafe()
  const router = useRouter()
  const dispatch = useDispatch()

  const numThreads = useRecoilValue(numThreadsAtom)
  const setGlobalStatus = useSetRecoilState(analysisStatusGlobalAtom)
  const datasetCurrent = useRecoilValue(datasetCurrentAtom)

  const [qrySeq, setQrySeq] = useRecoilState(qrySeqAtom)
  const removeQrySeq = useResetRecoilState(qrySeqAtom)
  const qrySeqError = useRecoilValue(qrySeqErrorAtom)

  const refSeq = useRecoilValue(refSeqAtom)
  const geneMap = useRecoilValue(geneMapAtom)
  const refTree = useRecoilValue(refTreeAtom)
  const qcConfig = useRecoilValue(qcConfigAtom)
  const virusProperties = useRecoilValue(virusPropertiesAtom)
  const primersCsv = useRecoilValue(primersCsvAtom)

  const canRun = useRecoilValue(canRunAtom)
  const [shouldRunAutomatically, setShouldRunAutomatically] = useRecoilState(shouldRunAutomaticallyAtom)
  const hasRequiredInputs = useRecoilValue(hasRequiredInputsAtom)
  const hasInputErrors = useRecoilValue(hasInputErrorsAtom)
  const setShowNewRunPopup = useSetRecoilState(showNewRunPopupAtom)

  const isInProgressFasta = useMemo(() => false, []) // TODO: decide whether this is needed at all
  const setIsDirty = useCallback((_0: boolean) => {}, []) // TODO: decide whether this is needed at all

  const icon = useMemo(() => <FileIconFasta />, [])

  const run = useRecoilCallback(
    ({ set, snapshot: { getPromise } }) =>
      () => {
        setGlobalStatus(AlgorithmGlobalStatus.loadingData)

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
            set(globalErrorAtom, error)
          },
          onTree(tree: AuspiceJsonV2) {
            set(treeAtom, tree)

            const auspiceState = createAuspiceState(tree, dispatch)
            dispatch(auspiceStartClean(auspiceState))
            dispatch(changeColorBy())
            dispatch(treeFilterByNodeType(['New']))
          },
          onComplete() {},
        }

        if (!datasetCurrent) {
          throw new ErrorInternal('Dataset is not selected, but required.')
        }

        router
          .push('/results', '/results')
          .then(async () => {
            return launchAnalysis(qrySeq, inputs, callbacks, datasetCurrent, numThreads)
          })
          .catch((error) => {
            setGlobalStatus(AlgorithmGlobalStatus.failed)
            set(globalErrorAtom, sanitizeError(error))
            console.error(error)
          })
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
      dispatch,
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
    const isRunButtonDisabled = !(canRun && hasRequiredInputs) || hasInputErrors
    return {
      isRunButtonDisabled,
      runButtonColor: isRunButtonDisabled ? 'secondary' : 'success',
      runButtonTooltip: isRunButtonDisabled
        ? t('Please provide input files for the algorithm')
        : t('Launch the algorithm!'),
    }
  }, [canRun, hasInputErrors, hasRequiredInputs, t])

  const LoadExampleLink = useMemo(() => {
    const cannotLoadExample = hasRequiredInputs || isInProgressFasta || hasInputErrors
    return (
      <Button color="link" onClick={setExampleSequences} disabled={cannotLoadExample}>
        {t('Load example')}
      </Button>
    )
  }, [hasInputErrors, hasRequiredInputs, isInProgressFasta, setExampleSequences, t])

  const onToggleRunAutomatically = useCallback(() => {
    setShouldRunAutomatically((shouldRunAutomatically) => !shouldRunAutomatically)
  }, [setShouldRunAutomatically])

  return (
    <SequenceFilePickerContainer>
      <FilePicker
        title={t('Provide sequence data')}
        icon={icon}
        exampleUrl="https://example.com/sequences.fasta"
        pasteInstructions={t('Enter sequence data in FASTA or plain text format')}
        input={qrySeq}
        error={qrySeqError}
        isInProgress={isInProgressFasta}
        onRemove={removeQrySeq}
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

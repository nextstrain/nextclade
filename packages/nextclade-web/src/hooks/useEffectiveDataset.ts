import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { findDatasetByPath } from 'src/helpers/sortDatasetVersions'
import { datasetsAtom, datasetsForAnalysisAtom, viewedDatasetNameAtom } from 'src/state/dataset.state'
import { Dataset } from 'src/types'

export interface EffectiveDataset {
  effectiveDatasetPath: string | undefined
  dataset: Dataset | undefined
}

export function useEffectiveDataset(): EffectiveDataset {
  const datasetPath = useRecoilValue(viewedDatasetNameAtom)
  const datasetsForAnalysis = useRecoilValue(datasetsForAnalysisAtom)
  const datasets = useRecoilValue(datasetsAtom)

  const effectiveDatasetPath = useMemo(
    () => datasetPath ?? datasetsForAnalysis?.[0]?.path,
    [datasetPath, datasetsForAnalysis],
  )

  const dataset = useMemo(
    () => (effectiveDatasetPath ? findDatasetByPath(datasets, effectiveDatasetPath) : undefined),
    [datasets, effectiveDatasetPath],
  )

  return { effectiveDatasetPath, dataset }
}

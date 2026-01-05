import React, { Suspense, lazy, useCallback, useMemo, useRef } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { Layout } from 'src/components/Layout/Layout'
import { LOADING } from 'src/components/Loading/Loading'
import { viewedDatasetNameAtom } from 'src/state/dataset.state'
import { analysisResultsAtom } from 'src/state/results.state'
import type { NextcladeResult } from 'src/types'
import {
  representationTypeAtom,
  selectedSequenceIndexAtom,
  viewerLibraryAtom,
  type RepresentationType,
  type ViewerLibrary,
} from 'src/state/structure.state'
import { DEFAULT_STRUCTURE_CONFIG, getStructureConfig } from './structureConfig'
import type { ResidueSelection, StructureViewerHandle } from './viewers/types'

const NglViewer = lazy(() => import('./viewers/NglViewer').then((m) => ({ default: m.NglViewer })))
const MolstarViewer = lazy(() => import('./viewers/MolstarViewer').then((m) => ({ default: m.MolstarViewer })))

interface SelectOption<T extends string> {
  value: T
  label: string
}

const REPRESENTATION_OPTIONS: SelectOption<RepresentationType>[] = [
  { value: 'cartoon', label: 'Cartoon' },
  { value: 'surface', label: 'Surface' },
  { value: 'ball+stick', label: 'Ball and Stick' },
  { value: 'spacefill', label: 'Spacefill' },
  { value: 'licorice', label: 'Licorice' },
]

const VIEWER_OPTIONS: SelectOption<ViewerLibrary>[] = [
  { value: 'ngl', label: 'NGL' },
  { value: 'molstar', label: 'Mol*' },
]

function renderSelectOptions<T extends string>(options: SelectOption<T>[]) {
  return options.map(({ value, label }) => (
    <option key={value} value={value}>
      {label}
    </option>
  ))
}

// Mock data for testing - remove in production
const MOCK_RESULTS = [
  {
    index: 0,
    seqName: 'A/Darwin/6/2021',
    result: {
      analysisResult: {
        aaSubstitutions: [
          { cdsName: 'HA1', pos: 49, refAa: 'E', qryAa: 'K' },
          { cdsName: 'HA1', pos: 52, refAa: 'N', qryAa: 'S' },
          { cdsName: 'HA1', pos: 142, refAa: 'R', qryAa: 'K' },
          { cdsName: 'HA2', pos: 150, refAa: 'I', qryAa: 'V' },
        ],
      },
    },
  },
  {
    index: 1,
    seqName: 'A/Victoria/2570/2019',
    result: {
      analysisResult: {
        aaSubstitutions: [
          { cdsName: 'HA1', pos: 3, refAa: 'Q', qryAa: 'R' },
          { cdsName: 'HA1', pos: 156, refAa: 'H', qryAa: 'Q' },
        ],
      },
    },
  },
]

const USE_MOCK_DATA = true // Set to false to use real results

export function StructurePage() {
  const datasetName = useRecoilValue(viewedDatasetNameAtom)

  return (
    <Layout>
      <Container>
        <Suspense fallback={LOADING}>
          <StructurePageContent key={datasetName} />
        </Suspense>
      </Container>
    </Layout>
  )
}

function StructurePageContent() {
  const datasetName = useRecoilValue(viewedDatasetNameAtom)
  const realResults = useRecoilValue(analysisResultsAtom)
  const results: NextcladeResult[] = USE_MOCK_DATA ? (MOCK_RESULTS as NextcladeResult[]) : realResults
  const [selectedIndex, setSelectedIndex] = useRecoilState(selectedSequenceIndexAtom)
  const [representationType, setRepresentationType] = useRecoilState(representationTypeAtom)
  const [viewerLibrary, setViewerLibrary] = useRecoilState(viewerLibraryAtom)

  const viewerRef = useRef<StructureViewerHandle>(null)

  const structureConfig = useMemo(() => {
    if (USE_MOCK_DATA) {
      return DEFAULT_STRUCTURE_CONFIG
    }
    return getStructureConfig(datasetName)
  }, [datasetName])

  // Get mutation selections for current sequence
  const mutationSelections = useMemo((): ResidueSelection[] => {
    if (!structureConfig || !results[selectedIndex]) return []

    const result = results[selectedIndex]
    const analysisResult = result.result?.analysisResult
    if (!analysisResult) return []

    const aaSubs = analysisResult.aaSubstitutions ?? []

    return aaSubs.flatMap((sub): ResidueSelection[] => {
      const chain = structureConfig.chainMapping[sub.cdsName]
      if (!chain) return []
      return [
        {
          chain,
          position: sub.pos + 1 + structureConfig.offset,
          color: 'red',
        },
      ]
    })
  }, [structureConfig, results, selectedIndex])

  const handleSequenceChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedIndex(Number(e.target.value))
    },
    [setSelectedIndex],
  )

  const handleRepresentationChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setRepresentationType(e.target.value as RepresentationType)
    },
    [setRepresentationType],
  )

  const handleViewerChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setViewerLibrary(e.target.value as ViewerLibrary)
    },
    [setViewerLibrary],
  )

  const handleResetView = useCallback(() => {
    viewerRef.current?.resetView()
  }, [])

  if (!structureConfig) {
    return (
      <NoDataMessage>
        <h2>No structure available</h2>
        <p>No protein structure is configured for this dataset ({datasetName}).</p>
        <p>Structure visualization is currently available for H3N2 HA datasets.</p>
      </NoDataMessage>
    )
  }

  const selectedResult = results[selectedIndex]
  const seqName = selectedResult?.seqName ?? `Sequence ${selectedIndex}`
  const mutationCount = mutationSelections.length

  return (
    <ContentWrapper>
      <ControlsPanel>
        <ControlGroup>
          <Label htmlFor="sequence-select">Sequence:</Label>
          <Select id="sequence-select" value={selectedIndex} onChange={handleSequenceChange}>
            {results.map((result) => (
              <option key={result.index} value={result.index}>
                {result.seqName ?? `Sequence ${result.index}`}
              </option>
            ))}
          </Select>
        </ControlGroup>

        <ControlGroup>
          <Label htmlFor="representation-select">Representation:</Label>
          <Select id="representation-select" value={representationType} onChange={handleRepresentationChange}>
            {renderSelectOptions(REPRESENTATION_OPTIONS)}
          </Select>
        </ControlGroup>

        <ControlGroup>
          <Label htmlFor="viewer-select">Viewer:</Label>
          <Select id="viewer-select" value={viewerLibrary} onChange={handleViewerChange}>
            {renderSelectOptions(VIEWER_OPTIONS)}
          </Select>
        </ControlGroup>

        <ControlGroup>
          <Button type="button" onClick={handleResetView}>
            Reset View
          </Button>
        </ControlGroup>

        <InfoPanel>
          <InfoRow>
            <InfoLabel>Structure:</InfoLabel>
            <InfoValue>PDB {structureConfig.pdbId}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>Sequence:</InfoLabel>
            <InfoValue>{seqName}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>Mutations:</InfoLabel>
            <InfoValue>{mutationCount} highlighted</InfoValue>
          </InfoRow>
        </InfoPanel>
      </ControlsPanel>

      <ViewerPanel>
        {viewerLibrary === 'ngl' ? (
          <NglViewer
            ref={viewerRef}
            pdbId={structureConfig.pdbId}
            representationType={representationType}
            highlights={mutationSelections}
          />
        ) : (
          <MolstarViewer ref={viewerRef} representationType={representationType} />
        )}
      </ViewerPanel>
    </ContentWrapper>
  )
}

const Container = styled.div`
  flex: 1;
  flex-basis: 100%;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  overflow: auto;
`

const ContentWrapper = styled.div`
  display: flex;
  gap: 20px;
  height: 100%;
  min-height: 600px;

  @media (max-width: 1024px) {
    flex-direction: column;
  }
`

const ControlsPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 250px;
  max-width: 300px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;

  @media (max-width: 1024px) {
    max-width: none;
    flex-direction: row;
    flex-wrap: wrap;
  }
`

const ControlGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const Label = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: #495057;
  text-transform: uppercase;
`

const Select = styled.select`
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #80bdff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`

const Button = styled.button`
  padding: 8px 16px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #45a049;
  }

  &:active {
    background: #3d8b40;
  }
`

const InfoPanel = styled.div`
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid #dee2e6;
`

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 4px;
`

const InfoLabel = styled.span`
  color: #6c757d;
`

const InfoValue = styled.span`
  color: #212529;
  font-weight: 500;
`

const ViewerPanel = styled.div`
  flex: 1;
  min-height: 500px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow: hidden;
`

const NoDataMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: #6c757d;

  h2 {
    margin: 0 0 8px;
    color: #495057;
  }

  p {
    margin: 0 0 4px;
    max-width: 400px;
  }
`

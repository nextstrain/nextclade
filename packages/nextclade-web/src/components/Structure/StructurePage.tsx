import React, { Suspense, lazy, useCallback, useMemo, useRef, useState } from 'react'
import { useQuery } from 'react-query'
import { useRecoilState, useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { Layout } from 'src/components/Layout/Layout'
import { LOADING } from 'src/components/Loading/Loading'
import { Tooltip } from 'src/components/Results/Tooltip'
import { viewedDatasetNameAtom } from 'src/state/dataset.state'
import { analysisResultsAtom } from 'src/state/results.state'
import type { NextcladeResult } from 'src/types'
import {
  entityVisibilityAtom,
  representationTypeAtom,
  selectedPdbIdAtom,
  selectedSequenceIndexAtom,
  viewerLibraryAtom,
  type RepresentationType,
  type ViewerLibrary,
} from 'src/state/structure.state'
import { Toggle } from 'src/components/Common/Toggle'
import { getStructureConfigFromOption, getStructureOption, STRUCTURE_OPTIONS } from './structureConfig'
import {
  fetchStructureCitation,
  fetchStructureFile,
  formatFullCitation,
  formatShortCitation,
  RCSB_CITATION,
  type StructureCitation,
} from './rcsbApi'
import type { ResidueSelection, StructureViewerHandle } from './viewers/types'

const NglViewer = lazy(() => import('./viewers/NglViewer').then((m) => ({ default: m.NglViewer })))
const MolstarViewer = lazy(() => import('./viewers/MolstarViewer').then((m) => ({ default: m.MolstarViewer })))

interface CitationsSectionProps {
  structureCitation: StructureCitation | undefined
  databaseCitation: StructureCitation
}

function CitationsSection({ structureCitation, databaseCitation }: CitationsSectionProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  return (
    <CitationSectionContainer id="citations-section" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <CitationHeader>Citations</CitationHeader>
      {structureCitation && (
        <CitationRow>
          <CitationLabel>Structure:</CitationLabel>
          <CitationValue>
            {formatShortCitation(structureCitation)}
            {structureCitation.doi && (
              <>
                {' '}
                <CitationLink
                  href={`https://doi.org/${structureCitation.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  doi
                </CitationLink>
              </>
            )}
          </CitationValue>
        </CitationRow>
      )}
      <CitationRow>
        <CitationLabel>Database:</CitationLabel>
        <CitationValue>
          {formatShortCitation(databaseCitation)}
          {databaseCitation.doi && (
            <>
              {' '}
              <CitationLink href={`https://doi.org/${databaseCitation.doi}`} target="_blank" rel="noopener noreferrer">
                doi
              </CitationLink>
            </>
          )}
        </CitationValue>
      </CitationRow>
      <Tooltip target="citations-section" isOpen={showTooltip} placement="bottom-start" tooltipWidth="450px">
        <TooltipContent>
          <TooltipHeader>Citations</TooltipHeader>
          {structureCitation && (
            <TooltipRow>
              <TooltipLabel>Structure:</TooltipLabel>
              <TooltipValue>{formatFullCitation(structureCitation)}</TooltipValue>
            </TooltipRow>
          )}
          <TooltipRow>
            <TooltipLabel>Database:</TooltipLabel>
            <TooltipValue>{formatFullCitation(databaseCitation)}</TooltipValue>
          </TooltipRow>
        </TooltipContent>
      </Tooltip>
    </CitationSectionContainer>
  )
}

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

function renderStructureOptionGroup(group: string, label: string) {
  const filteredOptions = STRUCTURE_OPTIONS.filter((opt) => opt.group === group)
  return (
    <optgroup key={group} label={label}>
      {filteredOptions.map((opt) => (
        <option key={opt.pdbId} value={opt.pdbId}>
          {opt.pdbId} - {opt.description}
        </option>
      ))}
    </optgroup>
  )
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
  const realResults = useRecoilValue(analysisResultsAtom)
  const results: NextcladeResult[] = USE_MOCK_DATA ? (MOCK_RESULTS as NextcladeResult[]) : realResults
  const [selectedIndex, setSelectedIndex] = useRecoilState(selectedSequenceIndexAtom)
  const [representationType, setRepresentationType] = useRecoilState(representationTypeAtom)
  const [viewerLibrary, setViewerLibrary] = useRecoilState(viewerLibraryAtom)
  const [selectedPdbId, setSelectedPdbId] = useRecoilState(selectedPdbIdAtom)
  const [entityVisibility, setEntityVisibility] = useRecoilState(entityVisibilityAtom)

  const viewerRef = useRef<StructureViewerHandle>(null)

  const structureOption = useMemo(() => getStructureOption(selectedPdbId), [selectedPdbId])

  const structureConfig = useMemo(() => {
    if (!structureOption) {
      return undefined
    }
    return getStructureConfigFromOption(structureOption)
  }, [structureOption])

  const pdbId = structureConfig?.pdbId

  const {
    data: structureData,
    isLoading: isLoadingStructure,
    error: structureError,
  } = useQuery(
    ['structure-file', pdbId],
    async () => {
      if (!pdbId) throw new Error('No PDB ID')
      return fetchStructureFile(pdbId)
    },
    {
      enabled: Boolean(pdbId),
      staleTime: Number.POSITIVE_INFINITY,
      refetchOnWindowFocus: false,
    },
  )

  const { data: citation } = useQuery(
    ['structure-citation', pdbId],
    async () => {
      if (!pdbId) return undefined
      return fetchStructureCitation(pdbId)
    },
    {
      enabled: Boolean(pdbId),
      staleTime: Number.POSITIVE_INFINITY,
      refetchOnWindowFocus: false,
    },
  )

  const isFetching = isLoadingStructure
  const fetchError = structureError instanceof Error ? structureError.message : undefined

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

  const handleStructureChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedPdbId(e.target.value)
    },
    [setSelectedPdbId],
  )

  const handleResetView = useCallback(() => {
    viewerRef.current?.resetView()
  }, [])

  const handlePolymerVisibilityChange = useCallback(
    (visible: boolean) => setEntityVisibility((prev) => ({ ...prev, polymer: visible })),
    [setEntityVisibility],
  )

  const handleLigandVisibilityChange = useCallback(
    (visible: boolean) => setEntityVisibility((prev) => ({ ...prev, ligand: visible })),
    [setEntityVisibility],
  )

  const handleWaterVisibilityChange = useCallback(
    (visible: boolean) => setEntityVisibility((prev) => ({ ...prev, water: visible })),
    [setEntityVisibility],
  )

  const handleIonVisibilityChange = useCallback(
    (visible: boolean) => setEntityVisibility((prev) => ({ ...prev, ion: visible })),
    [setEntityVisibility],
  )

  const handleCarbohydrateVisibilityChange = useCallback(
    (visible: boolean) => setEntityVisibility((prev) => ({ ...prev, carbohydrate: visible })),
    [setEntityVisibility],
  )

  if (!structureConfig) {
    return (
      <NoDataMessage>
        <h2>No structure available</h2>
        <p>No protein structure is configured.</p>
        <p>Please select a structure from the dropdown.</p>
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
          <Label htmlFor="structure-select">Structure:</Label>
          <Select id="structure-select" value={selectedPdbId} onChange={handleStructureChange}>
            {renderStructureOptionGroup('H1', 'H1 Structures')}
            {renderStructureOptionGroup('H3', 'H3 Structures')}
            {renderStructureOptionGroup('H5', 'H5 Structures')}
          </Select>
        </ControlGroup>

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
          <Label>Show Entities:</Label>
          <EntityToggleRow>
            <Toggle
              identifier="entity-polymer"
              checked={entityVisibility.polymer}
              onCheckedChanged={handlePolymerVisibilityChange}
            >
              Polymer
            </Toggle>
          </EntityToggleRow>
          <EntityToggleRow>
            <Toggle
              identifier="entity-ligand"
              checked={entityVisibility.ligand}
              onCheckedChanged={handleLigandVisibilityChange}
            >
              Ligand
            </Toggle>
          </EntityToggleRow>
          <EntityToggleRow>
            <Toggle
              identifier="entity-water"
              checked={entityVisibility.water}
              onCheckedChanged={handleWaterVisibilityChange}
            >
              Water
            </Toggle>
          </EntityToggleRow>
          <EntityToggleRow>
            <Toggle identifier="entity-ion" checked={entityVisibility.ion} onCheckedChanged={handleIonVisibilityChange}>
              Ion
            </Toggle>
          </EntityToggleRow>
          <EntityToggleRow>
            <Toggle
              identifier="entity-carbohydrate"
              checked={entityVisibility.carbohydrate}
              onCheckedChanged={handleCarbohydrateVisibilityChange}
            >
              Carbohydrate
            </Toggle>
          </EntityToggleRow>
        </ControlGroup>

        <ControlGroup>
          <Button type="button" onClick={handleResetView}>
            Reset View
          </Button>
        </ControlGroup>

        <InfoPanel>
          <InfoRow>
            <InfoLabel>Structure:</InfoLabel>
            <InfoValue>
              <PdbLink
                href={`https://www.rcsb.org/structure/${structureConfig.pdbId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                PDB {structureConfig.pdbId}
              </PdbLink>
            </InfoValue>
          </InfoRow>
          {structureOption && (
            <>
              <InfoRow>
                <InfoLabel>Resolution:</InfoLabel>
                <InfoValue>{structureOption.resolution} A</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Reference:</InfoLabel>
                <InfoValue>{structureOption.reference}</InfoValue>
              </InfoRow>
            </>
          )}
          <InfoRow>
            <InfoLabel>Sequence:</InfoLabel>
            <InfoValue>{seqName}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>Mutations:</InfoLabel>
            <InfoValue>{mutationCount} highlighted</InfoValue>
          </InfoRow>
        </InfoPanel>

        <CitationsSection structureCitation={citation} databaseCitation={RCSB_CITATION} />
      </ControlsPanel>

      <ViewerPanel>
        {fetchError ? (
          <ErrorMessage>{fetchError}</ErrorMessage>
        ) : isFetching ? (
          <LoadingMessage>Fetching structure...</LoadingMessage>
        ) : viewerLibrary === 'ngl' ? (
          <NglViewer
            key={`ngl-${pdbId}`}
            ref={viewerRef}
            structureData={structureData}
            representationType={representationType}
            highlights={mutationSelections}
            entityVisibility={entityVisibility}
          />
        ) : (
          <MolstarViewer
            key={`molstar-${pdbId}`}
            ref={viewerRef}
            structureData={structureData}
            representationType={representationType}
            highlights={mutationSelections}
            entityVisibility={entityVisibility}
          />
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

const EntityToggleRow = styled.div`
  display: flex;
  align-items: center;
  font-size: 13px;
  margin-top: 4px;
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

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #c00;
  font-size: 14px;
  padding: 20px;
  text-align: center;
`

const LoadingMessage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6c757d;
  font-size: 14px;
`

const CitationSectionContainer = styled.div`
  padding-top: 12px;
  border-top: 1px solid #dee2e6;
  font-size: 11px;
  cursor: help;
`

const CitationHeader = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #495057;
  text-transform: uppercase;
  margin-bottom: 6px;
`

const CitationRow = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 2px;
  line-height: 1.4;
`

const CitationLabel = styled.span`
  color: #6c757d;
  flex-shrink: 0;
`

const CitationValue = styled.span`
  color: #495057;
`

const CitationLink = styled.a`
  color: #007bff;
  text-decoration: none;
  font-size: 10px;

  &:hover {
    text-decoration: underline;
  }
`

const TooltipContent = styled.div`
  font-size: 12px;
  line-height: 1.5;
`

const TooltipHeader = styled.div`
  font-weight: 600;
  color: #495057;
  text-transform: uppercase;
  margin-bottom: 8px;
  font-size: 11px;
`

const TooltipRow = styled.div`
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
`

const TooltipLabel = styled.div`
  color: #6c757d;
  font-size: 11px;
  margin-bottom: 2px;
`

const TooltipValue = styled.div`
  color: #212529;
`

const PdbLink = styled.a`
  color: #007bff;
  text-decoration: none;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`

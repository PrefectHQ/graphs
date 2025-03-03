import './App.css'
import { parseISO, isValid } from 'date-fns'
import { useState, useCallback, useMemo } from 'react'
import graph2kJson from './data/graph-2k.json'
import graphSmallLongJson from './data/graph-small-long.json'
import graphSmallJson from './data/graph-small.json'
import eventsJson from './data/graph-small_events.json'
import graphSubflowsJson from './data/graph-subflows.json'
import graphXsmallProgressArtifactsJson from './data/graph-xsmall-progress-artifacts.json'
import graphXsmallJson from './data/graph-xsmall.json'
import { RunGraph } from './components/RunGraph'
import { ButtonGroup } from './components/ButtonGroup'
import { GraphItemSelection, RunGraphConfig, RunGraphData, RunGraphEvent, StateType, ViewportDateRange } from '@prefecthq/graphs'
import { RunGraphSettings } from './components/RunGraphSettings'

// Helper functions
function reviver(key: string, value: any): any {
  if (typeof value === 'string') {
    const date = parseISO(value)
    if (isValid(date)) {
      return date
    }
  }

  if (key === 'nodes') {
    return new Map(value)
  }

  return value
}

function parseJson(json: unknown): unknown {
  return JSON.parse(JSON.stringify(json), reviver)
}

function getData(json: unknown): RunGraphData {
  return parseJson(json) as RunGraphData
}

const datasetOptions = ['2k', 'small', 'small (long)', 'subflows', 'xsmall', 'xsmall (w/ progress artifacts)'] as const
type DatasetOption = typeof datasetOptions[number]

const datasetMap: Record<DatasetOption, RunGraphData> = {
  '2k': getData(graph2kJson),
  'small': getData(graphSmallJson),
  'small (long)': getData(graphSmallLongJson),
  'subflows': getData(graphSubflowsJson),
  'xsmall': getData(graphXsmallJson),
  'xsmall (w/ progress artifacts)': getData(graphXsmallProgressArtifactsJson),
}

const stateTypeColors: Record<StateType, string> = {
  COMPLETED: '#219D4B',
  RUNNING: '#09439B',
  SCHEDULED: '#E08504',
  PENDING: '#554B58',
  FAILED: '#DE0529',
  CANCELLED: '#333333',
  CANCELLING: '#333333',
  CRASHED: '#EA580C',
  PAUSED: '#554B58',
}

function App() {
  const [selectedDataset, setSelectedDataset] = useState<DatasetOption>('xsmall (w/ progress artifacts)')
  const [visibleDateRange, setVisibleDateRange] = useState<ViewportDateRange>()
  const [selected, setSelected] = useState<GraphItemSelection | undefined>(undefined)
  const [remountKey, setRemountKey] = useState(0)

  const data = useMemo(() => datasetMap[selectedDataset], [selectedDataset])
  const eventsData = useMemo(() => parseJson(eventsJson) as RunGraphEvent[], [])

  const handleDatasetChange = useCallback((newDataset: DatasetOption) => {
    setSelectedDataset(newDataset)
    setRemountKey(prev => prev ^ 1)
  }, [])

  const getColorToken = (cssVariable: string): string => {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(cssVariable)
      .trim()
  }

  const config = useMemo<RunGraphConfig>(() => ({
    runId: 'foo',
    fetch: () => data,
    fetchEvents: () => eventsData,
    theme: 'dark',
    styles: () => ({
      textDefault: getColorToken('--p-color-text-default'),
      textInverse: getColorToken('--p-color-text-inverse'),
      nodeToggleBorderColor: getColorToken('--p-color-button-default-border'),
      selectedBorderColor: getColorToken('--p-color-text-selected'),
      edgeColor: getColorToken('--p-color-text-subdued'),
      guideLineColor: getColorToken('--p-color-divider'),
      guideTextColor: getColorToken('--p-color-text-subdued'),
      node: (node) => ({
        background: stateTypeColors[node.state_type],
      }),
      state: (state) => ({
        background: stateTypeColors[state.type],
      }),
    }),
  }), [data, eventsData])

  return (
    <div className="run-graph-demo">
      <span>Choose a Dataset</span>
      <ButtonGroup
        value={selectedDataset}
        onChange={handleDatasetChange}
        options={datasetOptions}
        small
      />

      <RunGraph
        key={remountKey}
        viewport={visibleDateRange}
        onViewportChange={setVisibleDateRange}
        selected={selected}
        onSelectedChange={setSelected}
        config={config}
        className="run-graph-demo__graph"
      />

      <div style={{ width: '300px' }}>
        <RunGraphSettings />
      </div>

      <div>
        <p>Visible Date Range:</p>
        <span>{JSON.stringify(visibleDateRange)}</span>
      </div>
      <div>
        <p>Selected:</p>
        <span>{JSON.stringify(selected)}</span>
      </div>
    </div>
  )
}

export default App

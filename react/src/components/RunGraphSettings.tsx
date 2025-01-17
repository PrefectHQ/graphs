import {
  DEFAULT_HORIZONTAL_SCALE_MULTIPLIER,
  HorizontalMode,
  VerticalMode,
  isHorizontalMode,
  isVerticalMode,
  layout,
  resetHorizontalScaleMultiplier,
  setDisabledArtifacts,
  setDisabledEdges,
  setDisabledEvents,
  setHorizontalMode,
  setHorizontalScaleMultiplier,
  setVerticalMode,
} from '@prefecthq/graphs'
import { useEffect, useState } from 'react'

type LayoutOption = `${HorizontalMode}_${VerticalMode}`

interface Option<T extends string> {
  value: T
  label: string
}

function isLayoutOption(value: string): value is LayoutOption {
  const [horizontal, vertical] = value.split('_')
  return isHorizontalMode(horizontal) && isVerticalMode(vertical)
}

const layoutOptions: Option<LayoutOption>[] = [
  {
    label: 'Temporal dependency',
    value: 'temporal_nearest-parent',
  },
  {
    label: 'Temporal sequence',
    value: 'temporal_waterfall',
  },
  {
    label: 'Dependency grid',
    value: 'dependency_nearest-parent',
  },
  {
    label: 'Sequential grid',
    value: 'dependency_waterfall',
  },
  {
    label: 'Comparative duration',
    value: 'left-aligned_duration-sorted',
  },
]

export function RunGraphSettings(): JSX.Element {
  const [selectedLayoutOption, setSelectedLayoutOption] = useState<LayoutOption>(
    `${layout.horizontal}_${layout.vertical}` as LayoutOption,
  )
  const [hideEdges, setHideEdges] = useState(layout.disableEdges)
  const [hideArtifacts, setHideArtifacts] = useState(layout.disableArtifacts)
  const [hideEvents, setHideEvents] = useState(layout.disableEvents)

  const handleLayoutChange = (value: string) => {
    if (!isLayoutOption(value)) {
      return
    }

    setSelectedLayoutOption(value)
    const [horizontal, vertical] = value.split('_') as [HorizontalMode, VerticalMode]
    setHorizontalMode(horizontal)
    setVerticalMode(vertical)
  }

  const handleHideEdges = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.checked
    setHideEdges(value)
    setDisabledEdges(value)
  }

  const handleHideArtifacts = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.checked
    setHideArtifacts(value)
    setDisabledArtifacts(value)
  }

  const handleHideEvents = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.checked
    setHideEvents(value)
    setDisabledEvents(value)
  }

  const increaseScale = () => {
    const multiplier = DEFAULT_HORIZONTAL_SCALE_MULTIPLIER + 1
    const scale = layout.horizontalScaleMultiplier * multiplier
    setHorizontalScaleMultiplier(scale)
  }

  const decreaseScale = () => {
    const multiplier = Math.abs(DEFAULT_HORIZONTAL_SCALE_MULTIPLIER - 1)
    const scale = layout.horizontalScaleMultiplier * multiplier
    setHorizontalScaleMultiplier(scale)
  }

  const resetScale = () => {
    resetHorizontalScaleMultiplier()
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.metaKey ||
        event.ctrlKey
      ) {
        return
      }

      switch (event.key) {
        case '-':
          decreaseScale()
          break
        case '=':
          increaseScale()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="run-graph-settings">
      <div>
        <h3>Layout</h3>
        {layoutOptions.map((option) => (
          <div key={option.value}>
            <input
              type="radio"
              id={option.value}
              name="layout"
              value={option.value}
              checked={selectedLayoutOption === option.value}
              onChange={(e) => handleLayoutChange(e.target.value)}
            />
            <label htmlFor={option.value}>{option.label}</label>
          </div>
        ))}
      </div>

      {(layout.isTemporal() || layout.isLeftAligned()) && (
        <div>
          <h3>Scaling</h3>
          <button onClick={decreaseScale} title="Decrease scale (-)">-</button>
          <button onClick={increaseScale} title="Increase scale (+)">+</button>
          <button onClick={resetScale}>Reset</button>
        </div>
      )}

      <hr />
      
      <div>
        <div>
          <input
            type="checkbox"
            id="hideEdges"
            checked={hideEdges}
            onChange={handleHideEdges}
          />
          <label htmlFor="hideEdges">Hide dependency arrows</label>
        </div>

        <div>
          <input
            type="checkbox"
            id="hideArtifacts"
            checked={hideArtifacts}
            onChange={handleHideArtifacts}
          />
          <label htmlFor="hideArtifacts">Hide artifacts</label>
        </div>

        <div>
          <input
            type="checkbox"
            id="hideEvents"
            checked={hideEvents}
            onChange={handleHideEvents}
          />
          <label htmlFor="hideEvents">Hide events</label>
        </div>
      </div>
    </div>
  )
} 
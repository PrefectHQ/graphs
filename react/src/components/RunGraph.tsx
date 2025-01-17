import { CSSProperties, useEffect, useRef, useState } from 'react'
import {
  GraphItemSelection,
  RunGraphConfig,
  ViewportDateRange,
  centerViewport,
  emitter,
  selectItem,
  setConfig,
  start,
  stop,
  updateViewportFromDateRange,
} from '@prefecthq/graphs'
import { RunGraphSettings } from './RunGraphSettings'

type RunGraphProps = {
  viewport?: ViewportDateRange
  onViewportChange?: (viewport: ViewportDateRange) => void
  selected?: GraphItemSelection
  onSelectedChange?: (selected: GraphItemSelection | null) => void
  config: RunGraphConfig
  className?: string
  style?: CSSProperties
  fullscreen?: boolean
  onFullscreenChange?: (fullscreen: boolean) => void
}

export function RunGraph({
  viewport,
  onViewportChange,
  selected,
  onSelectedChange,
  config,
  className,
  style,
  fullscreen: controlledFullscreen,
  onFullscreenChange,
}: RunGraphProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [internalFullscreen, setInternalFullscreen] = useState(false)

  const fullscreen = controlledFullscreen ?? internalFullscreen

  const updateFullscreen = (value: boolean) => {
    setInternalFullscreen(value)
    onFullscreenChange?.(value)
  }

  useEffect(() => {
    setConfig(config)
  }, [config])

  useEffect(() => {
    if (!stageRef.current) {
      throw new Error('Stage does not exist')
    }

    start({
      stage: stageRef.current,
      config,
    })

    return () => {
      stop()
    }
  }, [config])

  useEffect(() => {
    if (selected !== undefined) {
      selectItem(selected)
    }
  }, [selected])

  useEffect(() => {
    if (viewport) {
      updateViewportFromDateRange(viewport)
    }
  }, [viewport])

  useEffect(() => {
    const handleItemSelected = (nodeId: GraphItemSelection) => {
      onSelectedChange?.(nodeId)
    }

    const handleViewportUpdate = (range: ViewportDateRange) => {
      onViewportChange?.(range)
    }

    emitter.on('itemSelected', handleItemSelected)
    emitter.on('viewportDateRangeUpdated', handleViewportUpdate)

    return () => {
      emitter.off('itemSelected', handleItemSelected)
      emitter.off('viewportDateRangeUpdated', handleViewportUpdate)
    }
  }, [onSelectedChange, onViewportChange])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        isEventTargetInput(event.target) ||
        event.metaKey ||
        event.ctrlKey
      ) {
        return
      }

      switch (event.key) {
        case 'c':
          center()
          break
        case 'f':
          toggleFullscreen()
          break
        case 'Escape':
          if (fullscreen) {
            toggleFullscreen()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [fullscreen])

  const center = () => {
    centerViewport({ animate: true })
  }

  const toggleFullscreen = () => {
    updateFullscreen(!fullscreen)
  }

  const isEventTargetInput = (target: EventTarget | null): boolean => {
    if (!target || !(target instanceof HTMLElement)) {
      return false
    }
    return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  }

  return (
    <div 
      className={`run-graph ${fullscreen ? 'run-graph--fullscreen' : ''} ${className ?? ''}`}
      style={style}
    >
      <div ref={stageRef} className="run-graph__stage" />
      <div className="run-graph__actions">
        <button 
          title="Recenter graph (c)" 
          onClick={center}
          className="p-button p-button--flat"
        >
          Recenter
        </button>
        <button 
          title="Toggle fullscreen (f)" 
          onClick={toggleFullscreen}
          className="p-button p-button--flat"
        >
          Fullscreen
        </button>
        <RunGraphSettings />
      </div>

      <style>{`
        .run-graph {
          position: relative;
        }

        .run-graph--fullscreen {
          position: fixed;
          height: 100vh !important;
          width: 100vw !important;
          left: 0;
          top: 0;
        }

        .run-graph__stage,
        .run-graph__stage > canvas {
          width: 100%;
          height: 100%;
        }

        .run-graph__actions {
          position: absolute;
          bottom: 0.5rem;
          right: 0.5rem;
        }
      `}</style>
    </div>
  )
} 
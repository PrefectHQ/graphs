import { Container } from 'pixi.js'
import { DEFAULT_GUIDES_COUNT, DEFAULT_GUIDES_MIN_GAP } from '@/consts'
import { GuideFactory, guideFactory } from '@/factories/guide'
import { FormatDate } from '@/models/guides'
import { LayoutSettings } from '@/models/layout'
import { waitForViewport } from '@/objects'
import { emitter } from '@/objects/events'
import { waitForScale } from '@/objects/scale'
import { repeat } from '@/utilities/repeat'
import { formatDateFns, labelFormats, timeIncrements } from '@/utilities/timeIncrements'

const visibleGuideBoundsMargin = 300

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function guidesFactory() {
  const viewport = await waitForViewport()
  const scale = await waitForScale()

  const element = new Container()
  const guides = new Map<number, GuideFactory>()

  let paused = false

  let currentIncrement = 0
  let currentAnchor = 0
  let labelFormatter: FormatDate = (date) => date.toLocaleTimeString()

  emitter.on('viewportDateRangeUpdated', () => {
    update()
  })
  emitter.on('layoutCreated', (layout) => onLayoutUpdate(layout))
  emitter.on('layoutUpdated', (layout) => onLayoutUpdate(layout))

  function render(): void {
    createGuides()
  }

  async function createGuides(): Promise<void> {
    const guideIndexes = Array.from({ length: DEFAULT_GUIDES_COUNT }, (val, i) => i)

    for await (const guideIndex of guideIndexes) {
      await createGuide(guideIndex)
    }
  }

  async function createGuide(index: number): Promise<void> {
    if (guides.has(index)) {
      return
    }

    const response = await guideFactory()

    element.addChild(response.element)

    guides.set(index, response)
  }

  function update(): void {
    if (paused) {
      return
    }

    const left = scale.invert(viewport.left - visibleGuideBoundsMargin)
    const gapDate = scale.invert(viewport.left - visibleGuideBoundsMargin + DEFAULT_GUIDES_MIN_GAP / viewport.scale.x) as Date

    if (!(left instanceof Date)) {
      console.warn('Guides: Attempted to update guides with a non-temporal layout.')
      return
    }

    const gap = gapDate.getTime() - left.getTime()
    const { increment, getAnchor, labelFormat } = timeIncrements.find(timeSlot => timeSlot.ceiling > gap) ?? timeIncrements[0]

    const anchor = getAnchor === undefined
      ? Math.floor(left.getTime() / increment) * increment
      : getAnchor(left)

    if (increment !== currentIncrement || anchor !== currentAnchor) {
      currentIncrement = increment
      currentAnchor = anchor
      setLabelFormat(labelFormat)
    }

    setGuides()
  }

  function setLabelFormat(labelFormat: string): void {
    switch (labelFormat) {
      case labelFormats.minutes:
        labelFormatter = formatDateFns.timeByMinutesWithDates
        break
      case labelFormats.date:
        labelFormatter = formatDateFns.date
        break
      default:
        labelFormatter = formatDateFns.timeBySeconds
    }
  }

  function setGuides(): void {
    const times = getGuideTimes()
    const guidesStore = new Map(guides.entries())
    const unused = Array.from(guidesStore.keys()).filter((time) => {
      return !times.includes(time)
    })

    guides.clear()

    for (const time of times) {
      if (guidesStore.has(time)) {
        const guide = guidesStore.get(time)!

        guides.set(time, guide)

        continue
      }

      const guide = guidesStore.get(unused.pop() ?? -1)

      if (guide === undefined) {
        console.warn('Guides: No unused guides available to render.')
        continue
      }

      guide.render(new Date(time), labelFormatter)
      guides.set(time, guide)
    }
  }

  function getGuideTimes(): number[] {
    return repeat(DEFAULT_GUIDES_COUNT, (index) => {
      return currentAnchor + currentIncrement * index
    })
  }

  function onLayoutUpdate(layout: LayoutSettings): void {
    if (layout.horizontal !== 'trace') {
      pauseGuides()
      return
    }

    resumeGuides()
  }

  function pauseGuides(): void {
    paused = true
    element.visible = false
  }

  function resumeGuides(): void {
    paused = false
    update()
    element.visible = true
  }

  return {
    element,
    render,
  }
}
import { HorizontalPositionSettings, VerticalPositionSettings } from '@/factories/position'
import { getHorizontalDomain, getHorizontalRange, layout } from '@/objects/settings'

export function horizontalSettingsFactory(startTime: Date): HorizontalPositionSettings {
  return {
    mode: layout.horizontal,
    range: getHorizontalRange(),
    domain: getHorizontalDomain(startTime),
  }
}

export function verticalSettingsFactory(): VerticalPositionSettings {
  return {
    mode: layout.vertical,
  }
}
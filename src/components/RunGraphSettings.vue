<template>
  <p-pop-over
    class="run-graph-settings"
    auto-close
    :placement="placement"
  >
    <template #target="{ toggle }">
      <p-button
        aria-label="Run Graph Options"
        icon="CogIcon"
        flat
        @click="toggle"
      />
    </template>

    <p-overflow-menu class="run-graph-settings__menu">
      <p-label label="View">
        <p-radio-group v-model="horizontal" :options="horizontalOptions">
          <template #label="{ option }">
            {{ option.label }}
          </template>
        </p-radio-group>
      </p-label>
      <template v-if="layout.isTrace()">
        <p-label label="Scaling">
          <div class="flex items-center gap-2">
            <p-button small icon="MinusIcon" @click="decreaseScale" />
            <p-button small icon="PlusIcon" @click="increaseScale" />
            <p-button small @click="resetScale">
              Reset
            </p-button>
          </div>
        </p-label>
      </template>
      <p-label label="Layout">
        <p-radio-group v-model="vertical" :options="verticalOptions">
          <template #label="{ option }">
            {{ option.label }}
          </template>
        </p-radio-group>
      </p-label>
    </p-overflow-menu>
  </p-pop-over>
</template>

<script lang="ts" setup>
  import { PButton, positions, PPopOver } from '@prefecthq/prefect-design'
  import { computed } from 'vue'
  import { DEFAULT_HORIZONTAL_SCALE, DEFAULT_HORIZONTAL_SCALE_MULTIPLIER } from '@/consts'
  import { HorizontalMode, VerticalMode } from '@/models/layout'
  import { layout, setHorizontalMode, setHorizontalScale, setVerticalMode } from '@/objects/settings'

  type Option<T extends string> = {
    value: T,
    label: string,
  }

  const placement = [positions.topRight, positions.bottomRight, positions.topLeft, positions.bottomLeft]

  const horizontalOptions: Option<HorizontalMode>[] = [
    {
      value: 'dependency',
      label: 'Dependency',
    },
    {
      value: 'trace',
      label: 'Trace',
    },
  ]

  const horizontal = computed({
    get() {
      return layout.horizontal
    },
    set(value) {
      setHorizontalMode(value)
    },
  })

  const verticalOptions: Option<VerticalMode>[] = [
    {
      value: 'waterfall',
      label: 'Waterfall',
    },
    {
      value: 'nearest-parent',
      label: 'Nearest Parent',
    },
  ]

  const vertical = computed({
    get() {
      return layout.vertical
    },
    set(value) {
      setVerticalMode(value)
    },
  })

  function increaseScale(): void {
    const multiplier = DEFAULT_HORIZONTAL_SCALE_MULTIPLIER + 1
    const scale = layout.horizontalScaleMultiplier * multiplier

    setHorizontalScale(scale)
  }

  function decreaseScale(): void {
    const multiplier = Math.abs(DEFAULT_HORIZONTAL_SCALE_MULTIPLIER - 1)
    const scale = layout.horizontalScaleMultiplier * multiplier

    setHorizontalScale(scale)
  }

  function resetScale(): void {
    setHorizontalScale(DEFAULT_HORIZONTAL_SCALE)
  }
</script>

<style>
.run-graph-settings {
  display: inline-block;
}

.run-graph-settings__menu {
  display: grid;
  grid-template-columns: 1fr;
  gap: theme('spacing.4');
  padding: theme('spacing.2');
}
</style>
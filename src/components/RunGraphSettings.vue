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
      <template v-if="layout.isTemporal()">
        <p-label label="Scaling" class="mt-4">
          <div class="flex items-center gap-2">
            <p-button title="Decrease scale (-)" small icon="MinusIcon" @click="decreaseScale" />
            <p-button title="Increase scale (+)" small icon="PlusIcon" @click="increaseScale" />
            <p-button small @click="resetScale">
              Reset
            </p-button>
          </div>
        </p-label>
      </template>
      <p-divider />
      <p-label label="Layout">
        <p-radio-group v-model="vertical" :options="verticalOptions">
          <template #label="{ option }">
            {{ option.label }}
          </template>
        </p-radio-group>
      </p-label>
      <p-divider />
      <p-checkbox v-model="hideEdges" label="Hide dependency arrows" />
    </p-overflow-menu>
  </p-pop-over>
</template>

<script lang="ts" setup>
  import { PButton, positions, PPopOver } from '@prefecthq/prefect-design'
  import { useKeyDown } from '@prefecthq/vue-compositions'
  import { computed } from 'vue'
  import { DEFAULT_HORIZONTAL_SCALE_MULTIPLIER } from '@/consts'
  import { HorizontalMode, VerticalMode } from '@/models/layout'
  import { layout, resetHorizontalScaleMultiplier, setDisabledEdges, setHorizontalMode, setHorizontalScaleMultiplier, setVerticalMode } from '@/objects/settings'
  import { eventTargetIsInput } from '@/utilities/keyboard'

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
      value: 'temporal',
      label: 'Temporal',
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

  const hideEdges = computed({
    get() {
      return layout.disableEdges
    },
    set(value) {
      setDisabledEdges(value)
    },
  })

  function increaseScale(): void {
    const multiplier = DEFAULT_HORIZONTAL_SCALE_MULTIPLIER + 1
    const scale = layout.horizontalScaleMultiplier * multiplier

    setHorizontalScaleMultiplier(scale)
  }

  function decreaseScale(): void {
    const multiplier = Math.abs(DEFAULT_HORIZONTAL_SCALE_MULTIPLIER - 1)
    const scale = layout.horizontalScaleMultiplier * multiplier

    setHorizontalScaleMultiplier(scale)
  }

  useKeyDown(['-', '='], shortcutHandler)

  function shortcutHandler(event: KeyboardEvent): void {
    if (eventTargetIsInput(event.target) || event.metaKey || event.ctrlKey) {
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

  function resetScale(): void {
    resetHorizontalScaleMultiplier()
  }
</script>

<style>
.run-graph-settings {
  display: inline-block;
}

.run-graph-settings__menu {
  padding: theme('spacing.2');
}
</style>
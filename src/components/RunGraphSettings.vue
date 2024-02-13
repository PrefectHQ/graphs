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
      <p-label label="Layout">
        <p-radio-group v-model="selectedLayoutOption" :options="layoutOptions">
          <template #label="{ option }">
            {{ option.label }}
          </template>
        </p-radio-group>
      </p-label>
      <template v-if="layout.isTemporal() || layout.isLeftAligned()">
        <p-divider />
        <p-label label="Scaling">
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
      <p-checkbox v-model="hideEdges" label="Hide dependency arrows" />
      <!-- <p-checkbox v-model="hideArtifacts" label="Hide artifacts" /> -->
    </p-overflow-menu>
  </p-pop-over>
</template>

<script lang="ts" setup>
  import { PButton, positions, PPopOver } from '@prefecthq/prefect-design'
  import { useKeyDown } from '@prefecthq/vue-compositions'
  import { computed } from 'vue'
  import { DEFAULT_HORIZONTAL_SCALE_MULTIPLIER } from '@/consts'
  import { HorizontalMode, VerticalMode } from '@/models/layout'
  import { layout, resetHorizontalScaleMultiplier, setDisabledEdges, setDisabledArtifacts, setHorizontalMode, setHorizontalScaleMultiplier, setVerticalMode } from '@/objects/settings'
  import { eventTargetIsInput } from '@/utilities/keyboard'

  type Option<T extends string> = {
    value: T,
    label: string,
  }

  const placement = [positions.topRight, positions.bottomRight, positions.topLeft, positions.bottomLeft]

  type LayoutOption = `${HorizontalMode}_${VerticalMode}`

  const layoutOptions: Option<LayoutOption>[] = [
    {
      label: 'Temporal dependency',
      value: 'temporal_nearest-parent',
    }, {
      label: 'Temporal sequence',
      value: 'temporal_waterfall',
    }, {
      label: 'Dependency grid',
      value: 'dependency_nearest-parent',
    }, {
      label: 'Sequential grid',
      value: 'dependency_waterfall',
    }, {
      label: 'Comparative duration',
      value: 'left-aligned_duration-sorted',
    },
  ]

  const selectedLayoutOption = computed({
    get() {
      return `${layout.horizontal}_${layout.vertical}`
    },
    set(value) {
      const [horizontal, vertical] = value.split('_') as [HorizontalMode, VerticalMode]

      setHorizontalMode(horizontal)
      setVerticalMode(vertical)
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

  const hideArtifacts = computed({
    get() {
      return layout.disableArtifacts
    },
    set(value) {
      setDisabledArtifacts(value)
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
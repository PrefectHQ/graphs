<template>
  <p-navigation-bar class="app-navigation-bar" :class="classes.root" v-bind="{ layout }">
    <template #prepend>
      <slot name="prepend" v-bind="{ layout }">
        <template v-if="layout == 'horizontal'">
          <p-button icon="Bars3Icon" @click="toggleDrawer" />
        </template>
        <template v-else>
          <p-icon class="app-navigation-bar__logo" icon="Prefect" @click="toggleDrawer" />
          <span class="app-navigation-bar__heading">Prefect Graphs</span>
        </template>
      </slot>
    </template>

    <template v-if="layout == 'horizontal'">
      <p-drawer v-model:open="showDrawer" resizable>
        <AppNavigationBar class="app-navigation-bar__drawer">
          <template #prepend>
            <p-icon class="app-navigation-bar__logo" icon="Prefect" @click="toggleDrawer" />
            <span class="app-navigation-bar__heading">Prefect Design</span>
          </template>
        </AppNavigationBar>
      </p-drawer>
    </template>

    <template v-else>
      <AppComponentNavigationItems />
    </template>

    <template v-if="layout == 'vertical'" #append>
      <div class="app-navigation-bar__append">
        <p-theme-toggle />
      </div>
    </template>
  </p-navigation-bar>
</template>

<script lang="ts" setup>
  import { computed, ref } from 'vue'
  import AppComponentNavigationItems from '@/demo/components/AppComponentNavigationItems.vue'

  const props = defineProps<{
    layout?: 'horizontal' | 'vertical',
  }>()

  const showDrawer = ref(false)


  const layout = computed(() => props.layout ?? 'vertical')
  const classes = computed(() => ({
    root: {
      [`app-navigation-bar--${layout.value}`]: true,
    },
  }))

  const toggleDrawer = (): void => {
    showDrawer.value = !showDrawer.value
  }
</script>

<style>
.app-navigation-bar {
  --p-layout-resizable-aside-size: 256px;
  --p-layout-resizable-aside-max-size: 512px;
  --p-layout-resizable-aside-min-size: 256px;
  --p-drawer-min-size: 256px;
}

.app-navigation-bar { @apply
  pt-4
  px-2
  w-full
}

.app-navigation-bar__logo { @apply
  h-10
  w-10
}

.app-navigation-bar__heading { @apply
  font-normal
  text-xl
}

.app-navigation-bar--horizontal { @apply
  py-2
  px-4
}

.app-navigation-bar__drawer { @apply
  bg-floating
  shadow-lg
  w-full
  max-w-[theme(screens.sm)]
}

.app-navigation-bar .p-context-accordion-item__title,
.app-navigation-bar .p-context-nav-item { @apply
  capitalize
}

.app-navigation-bar__append { @apply
  flex
  flex-col
  items-center
  w-full
  pb-4
}
</style>
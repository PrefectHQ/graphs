<template>
  <div class="app">
    <template v-if="!media.lg">
      <p-global-sidebar class="app__mobile-menu">
        <template #upper-links>
          <p-icon icon="Prefect" class="app__prefect-icon" />
          <span class="text-slate-200">Prefect</span>
        </template>
        <template #bottom-links>
          <p-icon icon="Bars3Icon" class="app__menu-icon" @click="toggle" />
        </template>
      </p-global-sidebar>
    </template>
    <ContextSidebar v-if="showMenu" class="app__sidebar" />

    <router-view v-slot="{ Component }" class="app__router-view">
      <transition name="app__router-view-fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<script lang="ts" setup>
  import { media, useColorTheme } from '@prefecthq/prefect-design'
  import { computed, watchEffect } from 'vue'
  import ContextSidebar from '@/demo/components/ContextSidebar.vue'
  import { mobileMenuOpen, toggle } from '@/demo/router/menu'

  // Add PIXI to the global scope so that the chrome plugin can access it, when in demo mode
  if (import.meta.env.MODE === 'demo') {
    import('pixi.js').then(PIXI => Object.defineProperty(window, 'PIXI', { value: PIXI }))
  }

  const showMenu = computed(() => media.lg || mobileMenuOpen.value)

  watchEffect(() => document.body.classList.toggle('body-scrolling-disabled', showMenu.value && !media.lg))

  useColorTheme()
</script>

<style>
.body-scrolling-disabled { @apply
  overflow-hidden
}

html, body {
  overscroll-behavior-y: none;
}

.app { @apply
  h-screen
  flex
  flex-col
}

.app__prefect-icon { @apply
  w-6
  h-6
}

.app__menu-icon { @apply
  text-slate-200
  w-6
  h-6
  cursor-pointer
}

.app__router-view { @apply
  w-full
  mx-auto
  py-10
  px-6
  lg:px-8
  h-screen
  overflow-auto
}

.app__router-view-fade-enter-active,
.app__router-view-fade-leave-active {
  transition: opacity 0.15s ease;
}

.app__router-view-fade-enter-from,
.app__router-view-fade-leave-to {
  opacity: 0;
}

@screen lg {
  .app {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
  }
}
</style>

<template>
  <div class="home">
    <component :is="CirclesIcon" class="home__circles" />
    <p-icon class="home__logo-icon" icon="Prefect" />
    <div class="home__intro">
      <p class="home__title">
        Prefect Graphs
      </p>
      <p class="home__description">
        Prefect Graphs is a package built on PixieJS, Vue 3, and Typescript. It is a collection of components that can be used to build data visualization applications.
      </p>
    </div>
    <p-terminal class="home__terminal" command="npm i @prefecthq/graphs" />
    <div class="home__links">
      <a href="https://github.com/PrefectHQ/graphs/README.md">
        <p-button icon="BookOpenIcon">
          Documentation
        </p-button>
      </a>
      <a href="https://github.com/PrefectHQ/graphs/" target="_blank">
        <p-button icon="GitHubIcon">
          Github
        </p-button>
      </a>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import CirclesIcon from '@/demo/components/CirclesIcon.svg'
  import { routeRecordsFlat } from '@/demo/router/routeRecordsFlat'

  const [firstComponent] = Object.keys(routeRecordsFlat)
</script>

<style>
.home { @apply
  relative
  flex
  flex-col
  items-center
  gap-10
  overflow-hidden
}

.home__logo-icon { @apply
  w-52
  h-52
}

.home__intro { @apply
  flex
  flex-col
  gap-2
  text-justify
  font-light
  max-w-md
}

.home__title { @apply
  text-center
  text-4xl
  font-normal
}

.home__terminal { @apply
  max-w-md
}

.home__links { @apply
  flex
  gap-2
}

.home__logo-icon,
.home__intro,
.home__title,
.home__description,
.home__terminal,
.home__links { @apply
  z-10
}

.home__circles { @apply
  -translate-x-1/2
  -translate-y-1/2
  absolute
  left-1/2
  origin-center
  opacity-20
  top-1/2
  select-none
  z-0
}
</style>
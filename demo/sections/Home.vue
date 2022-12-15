<template>
  <div class="home">
    <component :is="CirclesIcon" class="home__circles" />
    <p-icon class="home__logo-icon" icon="PrefectGradient" />
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
        <p-button class="home__github-link" icon="GitHubIcon">
          Github
        </p-button>
      </a>
      <p-link :to="routeRecordsFlat[firstComponent]">
        <p-button secondary icon="ArrowNarrowRightIcon">
          Get Started
        </p-button>
      </p-link>
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

.home__github-link { @apply
  text-white
  bg-slate-900
  focus:ring-slate-900
}

.home__github-link:not(.p-button--disabled) { @apply
  hover:bg-slate-700
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
text-stone-100
  z-0
  absolute;
  animation-name: spin;
  animation-duration: 60s;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

@keyframes spin {
  0% {
      transform: rotate(0deg);
  }
  100% {
      transform: rotate(360deg);
  }
}
</style>
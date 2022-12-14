<template>
  <main>

    <div class="data__table-header">
      <div></div>
      <div>
        Nodes: <p-number-input v-model="size" />
      </div>

    </div>


    <TimescaleTable class="data__table" :data="data" />
  </main>
</template>

<script lang="ts" setup>
import { ref, watchEffect } from 'vue';
import { generateTimescaleData } from '../utilities/timescaleData';
import TimescaleTable from './components/TimescaleTable.vue';

const size = ref(50)

const data = ref(generateTimescaleData({ size: size.value }))


watchEffect(() => {
  data.value = generateTimescaleData({ size: size.value })
})
</script>

<style>
.data__table-header { @apply
  flex
  items-center
  text-sm
  p-4
  shadow
  ring-1
  ring-black
  ring-opacity-5
  rounded-lg
  rounded-b-none
  sticky
  top-0
  bg-slate-500
  text-white
}

.data__table { @apply
  !rounded-t-none
}
</style>
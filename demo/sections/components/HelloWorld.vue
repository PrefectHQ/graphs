<template>
  <ComponentPage title="Hello, World!" :demos="[]">
    <template #description>
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed euismod, nisl nec aliquam aliquam, nisl nisl aliquet nisl, eget aliquam nisl nisl sit amet nisl. Sed euismod, nisl nec aliquam aliquam, nisl nisl aliquet nisl, eget aliquam nisl nisl sit amet nisl.
    </template>
  </ComponentPage>
</template>

<script lang="ts" setup>
  import ComponentPage from '@/demo/components/ComponentPage.vue'
</script>
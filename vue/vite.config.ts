import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
// eslint-disable-next-line import/no-default-export
export default defineConfig(({ mode }) => {
  return {
      resolve: {
        alias: [
          {
            find: '@',
            replacement: resolve(__dirname, './src'),
          },
        ],
      },
      plugins: [vue()],
  }
})

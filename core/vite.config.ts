import { resolve } from 'path'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
// eslint-disable-next-line import/no-default-export
export default defineConfig(({ mode }) => {
  return {
    resolve: {
      alias: [
        {
          find: '@/demo',
          replacement: resolve(__dirname, './demo'),
        },
        {
          find: '@',
          replacement: resolve(__dirname, 'src'),
        },
      ],
    },
    build: {
      emptyOutDir: false,
      sourcemap: true,
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'prefect-graphs',
      },
      rollupOptions: {
        output: {
          exports: 'named',
          // Provide vue as a global variable to use in the UMD build
          globals: {
            vue: 'Vue',
          },
        },
      },
    },
  }
})

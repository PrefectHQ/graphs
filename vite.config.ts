import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import svgLoader from 'vite-svg-loader'

// https://vitejs.dev/config/
// eslint-disable-next-line import/no-default-export
export default defineConfig(({ mode }) => {
  const baseConfig = {
    assetsInclude: ['**/*.fnt'],
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
    plugins: [vue(), svgLoader()],
  }

  if (mode == 'demo') {
    return {
      root: './demo',
      ...baseConfig,
    }
  }

  return {
    ...baseConfig,
    build: {
      emptyOutDir: false,
      sourcemap: true,
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'prefect-graphs',
      },
      rollupOptions: {
        // ensures vue isn't added to the bundle
        external: [
          'vue',
          'vue-router',
          '@prefecthq/prefect-design',
          '@prefecthq/vue-compositions',
        ],
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

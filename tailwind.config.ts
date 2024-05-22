import prefectDesignTailwindConfig from '@prefecthq/prefect-design/src/tailwind.config'

module.exports = {
  content: [
    './index.html',
    './demo/**/*.vue',
    './src/**/*.vue',
  ],
  presets: [prefectDesignTailwindConfig],
}

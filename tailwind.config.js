/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
const prefectDesignTheme = require('@prefecthq/prefect-design/dist/tailwindTheme.js')
const prefectDesignUtilities = require('@prefecthq/prefect-design/dist/tailwindUtilities.js')

const plugins = [
  prefectDesignTheme,
  prefectDesignUtilities
]

module.exports = {
  content: [
    './src/**/*.vue',
    './demo/index.html',
    './demo/**/*.vue',
  ],
  plugins,
}

/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
const prefectDesignPlugin = require('@prefecthq/prefect-design/dist/tailwindPlugin.js')

module.exports = {
  content: [
    './src/**/*.vue',
    './demo/index.html',
    './demo/**/*.vue',
  ],
  plugins: [prefectDesignPlugin],
}

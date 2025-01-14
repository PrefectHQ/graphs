import '@prefecthq/prefect-design/dist/style.css'

import { plugin as PrefectDesign } from '@prefecthq/prefect-design'
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App).use(PrefectDesign)

app.mount('#app')

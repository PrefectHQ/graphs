import '@prefecthq/prefect-design/dist/style.css'
import './style.css'

import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { plugin as PrefectDesign } from '@prefecthq/prefect-design'

const app = createApp(App)
app.use(router)
app.use(PrefectDesign)

app.mount('#app')

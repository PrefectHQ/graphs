import '@prefecthq/prefect-design/dist/style.css'
import './style.css'

import { plugin as PrefectDesign } from '@prefecthq/prefect-design'
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'

const app = createApp(App)
app.use(router)
app.use(PrefectDesign)

app.mount('#app')

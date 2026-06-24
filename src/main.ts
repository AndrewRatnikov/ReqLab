import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Dialog from 'primevue/dialog'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import './assets/styles/tailwind.css'
import './assets/styles/main.scss'
import App from './App.vue'

const app = createApp(App)

app.use(PrimeVue, { unstyled: true })

app.component('PButton', Button)
app.component('PSelect', Select)
app.component('PDialog', Dialog)
app.component('PTabs', Tabs)
app.component('PTabList', TabList)
app.component('PTab', Tab)
app.component('PTabPanels', TabPanels)
app.component('PTabPanel', TabPanel)
app.component('PInputText', InputText)
app.component('PTextarea', Textarea)

app.mount('#app')

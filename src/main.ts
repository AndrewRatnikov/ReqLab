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

app.component('Button', Button)
app.component('Select', Select)
app.component('Dialog', Dialog)
app.component('Tabs', Tabs)
app.component('TabList', TabList)
app.component('Tab', Tab)
app.component('TabPanels', TabPanels)
app.component('TabPanel', TabPanel)
app.component('InputText', InputText)
app.component('Textarea', Textarea)

app.mount('#app')

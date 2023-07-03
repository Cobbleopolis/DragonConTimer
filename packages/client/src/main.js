import { createApp, provide, h } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import { DefaultApolloClient } from '@vue/apollo-composable'
import {
    ApolloClient,
    createHttpLink,
    InMemoryCache,
} from '@apollo/client/core'

// import './assets/main.css'
import './styles/main.sass'
// eslint-disable-next-line no-unused-vars
import * as bootstrap from 'bootstrap'

import Themes from './services/ThemesService'

const httpLink = createHttpLink({
    uri: 'http://localhost:9000/gql',
})
const cache = new InMemoryCache()
const apolloClient = new ApolloClient({
    link: httpLink,
    cache,
})


const app = createApp({
    setup() {
        provide(DefaultApolloClient, apolloClient)
    },

    render: () => h(App),
})

app.use(createPinia())
app.use(router)

app.config.globalProperties.$themes = new Themes()

app.mount('#app')


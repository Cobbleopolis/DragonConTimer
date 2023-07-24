import { createApp, provide, h } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import { DefaultApolloClient } from '@vue/apollo-composable'
import {
    ApolloClient,
    createHttpLink,
    split,
    InMemoryCache,
} from '@apollo/client/core'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { createClient } from 'graphql-ws'
import { getMainDefinition } from '@apollo/client/utilities'

// import './assets/main.css'
import './styles/main.sass'
// eslint-disable-next-line no-unused-vars
import * as bootstrap from 'bootstrap'

import Themes from './services/ThemesService'

const httpLink = createHttpLink({
    uri: 'http://' + import.meta.env.VITE_GQL_URL,
})

const wsLink = new GraphQLWsLink(
    createClient({
        url: 'ws://' + import.meta.env.VITE_GQL_URL,
    })
)

const link = split( //Splitting the traffic between ws and http
    ({query}) => {
        const definition = getMainDefinition(query)
        return (definition.kind === 'OperationDefinition' && definition.operation === 'subscription')
    },
    wsLink,
    httpLink
)

const cache = new InMemoryCache({
    typePolicies: {
        Query: {
            fields: {
                station: {
                    merge: false
                },
                console: {
                    merge: false
                },
                globalSetting: {
                    merge: false
                }
                // station: {
                //     merge(existing, incoming) {
                //         return incoming
                //     }
                // },
                // console: {
                //     merge(existing, incoming) {
                //         return incoming
                //     }
                // },
                // globalSetting: {
                //     merge(existing, incoming) {
                //         return incoming
                //     }
                // }
            }
        }
    }
})
const apolloClient = new ApolloClient({
    link,
    cache,
})


const app = createApp({
    setup() {
        provide(DefaultApolloClient, apolloClient)
    },

    render: () => h(App),
})

// app.use(VueApollo)
app.use(createPinia())
app.use(router)

app.config.globalProperties.$themes = new Themes()

app.mount('#app')


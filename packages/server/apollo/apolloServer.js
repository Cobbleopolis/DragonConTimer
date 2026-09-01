import { ApolloServer } from '@apollo/server'
import schema from './schema.js'
import { WebSocketServer } from 'ws'
import { useServer } from 'graphql-ws/lib/use/ws'
// import { MongodbPubSub } from 'graphql-mongoose-subscriptions'

import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import {PubSub} from "graphql-subscriptions";

export default function(app, path, mongoose) {

    const wsServer = new WebSocketServer({
        // This is the `httpServer` we created in a previous step.
        server: app.server,
        // Pass a different path here if your ApolloServer serves at
        // a different path.
        path,
    })

    const maxListeners = process.env.MAX_LISTENERS | 0 ?? 1024
    const useInfiniteListeners = (process.env.USE_INFINITE_LISTENERS ?? process.env.USE_DYNAMIC_LISTENERS ?? 'false').toLowerCase() === 'true'

    const pubsub = new PubSub()
    pubsub.ee.setMaxListeners(useInfiniteListeners ? Infinity : maxListeners)

    const apolloSchema = schema(pubsub)
    const serverCleanup = useServer({ schema: apolloSchema }, wsServer)

    const apolloServer = new ApolloServer({
        schema: apolloSchema,
        csrfPrevention: true,
        cache: 'bounded',
        introspection: process.env.NODE_ENV !== 'production',
        plugins: [
            ApolloServerPluginDrainHttpServer({ httpServer: app.server }),
            {
                async serverWillStart() {
                    return {
                        async drainServer() {
                            await serverCleanup.dispose()
                        }
                    }
                }
            },
            ApolloServerPluginLandingPageLocalDefault({ embed: true })
        ]
    })

    return apolloServer
}
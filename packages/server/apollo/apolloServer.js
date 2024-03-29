import { ApolloServer } from '@apollo/server'
import schema from './schema.js'
import { WebSocketServer } from 'ws'
import { useServer } from 'graphql-ws/lib/use/ws'
import { PubSub } from 'graphql-subscriptions'
// import { RedisPubSub } from 'graphql-redis-subscriptions'
// import Redis from 'ioredis';
// import { MongodbPubSub } from 'graphql-mongoose-subscriptions'

import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'

export default function(app, path) {

    const wsServer = new WebSocketServer({
        // This is the `httpServer` we created in a previous step.
        server: app.server,
        // Pass a different path here if your ApolloServer serves at
        // a different path.
        path,
    })


    let redisConnectionString = process.env.REDIS_CONNECTION_STRING
    if(process.env.REDIS_CONNECTION_STRING_FILE) {
        try {
            redisConnectionString = fs.readFileSync(process.env.REDIS_CONNECTION_STRING_FILE, 'utf-8').trim()
        } catch (err) {
            console.error(err)
        }
    }

    const maxListeners = process.env.MAX_LISTENERS | 0 ?? 1024
    const useDynamicListeners = (process.env.USE_DYNAMIC_LISTENERS ?? 'false').toLowerCase() === 'true'

    const pubsub = new PubSub()
    // const pubsub = new RedisPubSub({
    //     publisher: new Redis(redisConnectionString),
    //     subscriber: new Redis(redisConnectionString)
    // })
    // const pubsub = new MongodbPubSub()
    // console.log(pubsub.ee.getMaxListeners())
    pubsub.ee.setMaxListeners(maxListeners)
    if (useDynamicListeners) {
    pubsub.ee.on('connection', () => { // This should let us constantly resize our pubsub listeners
            if (pubsub.ee.listenerCount === pubsub.ee.getMaxListeners()) {
                pubsub.ee.setMaxListeners(pubsub.ee.getMaxListeners() * 2)
            }
        })
    }
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
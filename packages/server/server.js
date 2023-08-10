import fs from 'fs'
import cors from 'cors'
import mongoose from 'mongoose'
import http from 'http'
import bodyParser from 'body-parser'

import 'dotenv/config'

import app from './app.js'
import apolloServer from './apollo/apolloServer.js'
import { expressMiddleware } from '@apollo/server/express4'

const PORT = process.env.PORT ?? 9000
const GQL_PATH = process.env.GQL_PATH ?? '/gql'

app.use(cors())

let connectionString = process.env.DB_CONNECTION_STRING
if(process.env.DB_CONNECTION_STRING_FILE) {
    try {
        connectionString = fs.readFileSync(process.env.DB_CONNECTION_STRING_FILE, 'utf-8')
    } catch (err) {
        console.error(err)
    }
}

mongoose.set('strictQuery', false)
mongoose.connect(connectionString)

app.server = http.createServer(app)

const apollo = apolloServer(app, GQL_PATH)

await apollo.start()

app.use(
    GQL_PATH,
    cors(),
    bodyParser.json(),
    expressMiddleware(apollo)
)

// apollo.applyMiddleware({
//     app,
//     path: GQL_PATH
// })

app.server.listen(PORT, () => {
    console.log(`🍆 Server is listening at http://localhost:${PORT}`)
    console.log(`🍆 Graphql is on http://localhost:${PORT}${GQL_PATH}`)
})

const SHUTDOWN_SIGNALS = {
    'SIGHUP': 1,
    'SIGINT': 2,
    'SIGTERM': 15
}

function shutdown(signal, value) {
    app.server.close(() => {
        console.log(`Server stopped by ${signal} with value ${value}`)
        process.exit(128 + value)
    })
}

Object.keys(SHUTDOWN_SIGNALS).forEach(signal => {
    process.on(signal, () => {
        console.log(`Process recieved a ${signal} signal`)
        shutdown(signal, SHUTDOWN_SIGNALS[signal])
    })
})
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

mongoose.set('strictQuery', false)
mongoose.connect(process.env.DB_CONNECTION_STRING)

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
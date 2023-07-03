import express from 'express'

import buildinfo from '@dct/common/buildinfo.js'

const app = express()

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/version', (req, res) => {
    res.send(buildinfo.version)
})

export default app
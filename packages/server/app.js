import express from 'express'

import buildinfo from '@dct/common/buildinfo.js'

const app = express()

// app.get('/', (req, res) => {
//     res.send('Hello World!')
// })

app.use('/', express.static('public'))
app.use('/availability', express.static('public'))
app.use('/config/globalSettings', express.static('public'))

app.get('/alive', (req, res) => {
    res.status(200).json({status:"ok"});
})

app.get('/version', (req, res) => {
    res.send(buildinfo.version)
})

export default app
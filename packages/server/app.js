import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import express from 'express'

import buildinfo from '@dct/common/buildinfo.js'

const app = express()

// app.get('/', (req, res) => {
//     res.send('Hello World!')
// })

app.use('/', express.static(__dirname + '/public'))
app.use('/availability', express.static(__dirname + '/public'))
app.use('/config/globalSettings', express.static(__dirname + '/public'))
app.use('/config/consoles', express.static(__dirname + '/public'))
app.use('/config/stations', express.static(__dirname + '/public'))

app.get('/alive', (req, res) => {
    res.status(200).json({status:"ok"});
})

app.get('/version', (req, res) => {
    res.send(buildinfo.version)
})

export default app
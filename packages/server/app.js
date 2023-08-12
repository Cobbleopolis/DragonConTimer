import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import express from 'express'

import buildinfo from '@dct/common/buildinfo.js'

const app = express()

// app.get('/', (req, res) => {
//     res.send('Hello World!')
// })

app.use('/', express.static(path.join(__dirname, 'public')))
app.use('/availability', express.static(path.join(__dirname, 'public')))
app.use('/config/globalSettings', express.static(path.join(__dirname, 'public')))
app.use('/config/consoles', express.static(path.join(__dirname, 'public')))
app.use('/config/stations', express.static(path.join(__dirname, 'public')))

app.get('/alive', (req, res) => {
    res.status(200).json({status:"ok"});
})

app.get('/version', (req, res) => {
    res.send(buildinfo.version)
})

export default app
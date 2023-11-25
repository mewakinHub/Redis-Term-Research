import express from 'express'
import {getAlbum, getImage} from './database.js'

const app = express()
const port = 3000;

app.get('/app', async (req, res) => {
   const result = await getImage(1)
   res.send(result)
})

app.listen(port, () => {
   console.log('Server is running on port', port)
})
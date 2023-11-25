import express from 'express'
import {getAlbum, getImage} from './database.js'

const app = express()
const port = 8080

app.use(express.json)

app.get('/app', async (req, res) => {
   const result = await getAlbum()
   res.send(result)
})

app.get('/app/:id', async (req, res) => {
   const id = req.params.id
   const result = await getImage(id)
   res.send(result)
})

app.use((err, req, res, next) => {
   console.error(err.stack)
   res.status(500).send('Something broke!')
})

app.listen(port, () => {
   console.log('Server is running on port',port)
})
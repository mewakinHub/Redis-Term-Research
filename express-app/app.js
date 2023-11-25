import express from 'express'
import {getAlbumAll, getImageAll} from './database.js'

const port = 3000
const app = express()

app.use(express.static('public'));

app.get('/albumall', async (req, res) => {
   const result = await getAlbumAll()
   res.json(result);
})

app.get('/imageall', async (req, res) => {
   const result = await getImageAll();
   res.json(result);
});

app.listen(port, () => {
   console.log('App is running on port', port)
})
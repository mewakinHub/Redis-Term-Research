import express from 'express'
import {getImageAll, getImageByAlbum, getImageById} from './database.js'

const port = 3000
const app = express()

app.use(express.static('public'));

app.get('/imgall', async (req, res) => {
   const result = await getImageAll();
   res.json(result);
});

app.get('/imgalbum/:album', async (req, res) => {
   const album = req.params.album
   const result = await getImageByAlbum(album);
   res.json(result);
});

app.get('/imgid/:id', async (req, res) => {
   const id = req.params.id
   const result = await getImageById(id);
   res.json(result);
});

app.listen(port, () => {
   console.log('App is running on port', port)
});

import express from 'express'
import {RgetImageAll, RgetImageByAlbum, RgetImageById} from './rediSQL.js'

const port = 3001
const app = express()

app.use(express.static('public'));

app.get('/r/imgall', async (req, res) => {
   const result = await RgetImageAll();
   res.json(result);
});

app.get('/r/imgalbum/:album', async (req, res) => {
   const album = req.params.album
   const result = await RgetImageByAlbum(album);
   res.json(result);
});

app.get('/r/imgid/:id', async (req, res) => {
   const id = req.params.id
   const result = await RgetImageById(id);
   res.json(result);
});

app.listen(port, () => {
   console.log('App is running on port', port)
});

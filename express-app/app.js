import express from 'express'
import {VgetImageAll, VgetImageByAlbum, VgetImageById} from './vanillaSQL.js'
import {RgetImageAll, RgetImageByAlbum, RgetImageById} from './rediSQL.js'

const port = 3000
const app = express()

app.use(express.static('public'));

app.get('/v/imgall', async (req, res) => {
   const result = await VgetImageAll();
   res.json(result);
});

app.get('/v/imgalbum/:album', async (req, res) => {
   const album = req.params.album
   const result = await VgetImageByAlbum(album);
   res.json(result);
});

app.get('/v/imgid/:id', async (req, res) => {
   const id = req.params.id
   const result = await VgetImageById(id);
   res.json(result);
});

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

### database.js

// Create Connection Components
- using connection pool bc/ it's cache of DB connection [not interfere our Redis ShowCase] {bc/ it's only used for cache miss}
- connect to MySQL database

// GetImage:
1. All()
2. ByAlbum(album)
3. ById(id)
- SQL query: SELECT image FROM images WHERE album=?;`, [album]
- export async fn.

### app.js
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

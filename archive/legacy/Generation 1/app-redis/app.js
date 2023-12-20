import express from 'express'
import {getImageAll, getImageByAlbum, getImageById} from './database.js'
import redis from 'redis'

const app = express()
const redisCli = redis.createClient()
redisCli.on('error', err => console.log('Redis Client Error', err));
await redisCli.connect();

const port = 3001
const DEFAULT_EXPIRATION = 3600

app.use(express.static('public'));

app.get('/imgall', async (req, res) => {
   const rdata = await redisCli.get('images');
   if (rdata != null) {
      console.log('cache hit!')
      res.send(rdata)
   }
   else {
      console.log('cache miss!')
      const dbdata = await getImageAll();
      res.json(dbdata);
      redisCli.setEx('images', DEFAULT_EXPIRATION, JSON.stringify(dbdata));
   }
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

app.get('/test', async (req, res) => {
   const result = await redisCli.get('key1');
   res.send(result);
});

app.listen(port, () => {
   console.log('App is running on port', port)
});

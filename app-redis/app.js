import mysql from 'mysql2';
import express from 'express';
import redis from 'redis';

const conn = mysql.createConnection({
   host: 'localhost',
   user: 'root',
   password: 'root',
   database: 'redisresearch'
}).promise();

const app = express();
const redisCli = redis.createClient();
redisCli.on('error', err => console.log('Redis Client Error', err));
await redisCli.connect();

//Adjustable variables
const port = 3001;
const TTL = 3600;

app.use(express.static('public'));

app.get('/all', async (req, res) => {
   const rdata = await redisCli.get('imgAll');
   if (rdata != null) {
      console.log('Cache Hit');
      res.send(rdata);
      redisCli.expire('imgAll', TTL);
   }
   else {
      console.log('Cache Miss');
      const [dbdata] = await conn.query('SELECT image FROM images;');
      const dbJson = JSON.stringify(dbdata);
      res.send(dbJson)
      redisCli.setEx('imgAll', TTL, dbJson);
   }
});

app.get('/album/:album', async (req, res) => {
   const album = req.params.album;
   const rdata = await redisCli.get(`imgAlbum?album=${album}`);
   if (rdata != null) {
      console.log('Cache Hit');
      res.send(rdata);
      redisCli.expire(`imgAlbum?album=${album}`, TTL);
   }
   else {
      console.log('Cache Miss');
      const [dbdata] = await conn.query('SELECT image FROM images WHERE album=?', [album]);
      const dbJson = JSON.stringify(dbdata);
      res.send(dbJson);
      redisCli.setEx(`imgAlbum?album=${album}`, TTL, dbJson)
   }
})

app.get('/id/:id', async (req, res) => {
   const id = req.params.id;
   const rdata = await redisCli.get(`imgId?id=${id}`);
   if (rdata != null) {
      console.log('Cache Hit');
      res.send(rdata);
      redisCli.expire(`imgId?id=${id}`, TTL);
   }
   else {
      console.log('Cache Miss');
      const [dbdata] = await conn.query('SELECT image FROM images WHERE id=?', [id]);
      const dbJson = JSON.stringify(dbdata);
      res.send(dbJson);
      redisCli.setEx(`imgId?id=${id}`, TTL, dbJson)
   }
})
app.listen(port, () => {
   console.log('Server is running on port', port);
});

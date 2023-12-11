import mysql from 'mysql2';
import express from 'express';
import redis from 'redis';
//mew
import sharp from 'sharp';
//mew

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
const port = 3002;
const TTL = 3600;

app.use(express.static('public'));

app.get('/loadtime/:loadtime', async (req, res) => {
   const loadtime = req.params.loadtime;
   console.log('Load time:', loadtime, 'ms');
});

app.get('/all', async (req, res) => {
   const rdata = await redisCli.get('img');
   if (rdata != null) {
      console.log('Cache Hit: all');
      res.send(rdata);
      redisCli.expire('img', TTL);
   }
   else {
      console.log('Cache Miss: all');
      const [dbdata] = await conn.query('SELECT image FROM images;');
      const dbJson = JSON.stringify(dbdata);
      res.send(dbJson)
      // mewwwwwwwwwww
      [dbdata].forEach(item => {
         const imageData = item.image; 
         const uint8Array = new Uint8Array(imageData.data);
         const blob = new Blob([uint8Array], { type: 'image/jpg' });
         const dataUrl = URL.createObjectURL(blob);

         // Apply compression decision algorithm
         const compressionRatio = calculateCompressionRatio(blob.width, blob.height, blob.size, blob.complexity);

         // Use compression algorithm (Sharp in this case)
         const compressedImage = await compressImage(blob, compressionRatio);

         // Store compressed image in Redis
         imageResultRedis.push(compressedImage);
      });
      // mewwwwwwwwwwww
      redisCli.setEx('img', TTL, JSON.stringify(imageResultRedis));
   }
});

app.get('/album/:album', async (req, res) => {
   const album = req.params.album;
   const rdata = await redisCli.get(`img?album=${album}`);
   if (rdata != null) {
      console.log('Cache Hit: album', album);
      res.send(rdata);
      redisCli.expire(`img?album=${album}`, TTL);
   }
   else {
      console.log('Cache Miss: album', album);
      const [dbdata] = await conn.query('SELECT image FROM images WHERE album=?', [album]);
      const dbJson = JSON.stringify(dbdata);
      res.send(dbJson);
      redisCli.setEx(`img?album=${album}`, TTL, dbJson)
   }
});

app.get('/id/:id', async (req, res) => {
   const id = req.params.id;
   const rdata = await redisCli.get(`imgId?id=${id}`);
   if (rdata != null) {
      console.log('Cache Hit: album', album);
      res.send(rdata);
      redisCli.expire(`img?id=${id}`, TTL);
   }
   else {
      console.log('Cache Miss');
      const [dbdata] = await conn.query('SELECT image FROM images WHERE id=?', [id]);
      const dbJson = JSON.stringify(dbdata);
      res.send(dbJson);
      redisCli.setEx(`img?id=${id}`, TTL, dbJson);
   }
})

app.listen(port, () => {
   console.log('Server is running on port', port);
});

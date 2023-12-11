import mysql from 'mysql2';
import express from 'express';
import redis from 'redis';
import zlib from 'zlib';

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
   const rdata = await redisCli.get('zImg');
   if (rdata != null) {
      console.log('Cache Hit');
      const unzippedRdata = zlib.inflateSync(Buffer.from(rdata, 'base64'));
      res.send(unzippedRdata);
      redisCli.expire('zImg', TTL);
   }
   else {
      console.log('Cache Miss');
      const [dbdata] = await conn.query('SELECT image FROM images;');
      const dbJson = JSON.stringify(dbdata);
      res.send(dbJson);
      const zippedJson = zlib.deflateSync(dbJson);
      redisCli.setEx('zImg', TTL, zippedJson.toString('base64'));
   }
});

app.get('/album/:album', async (req, res) => {
   const album = req.params.album;
   const rdata = await redisCli.get(`zImg?album=${album}`);
   if (rdata != null) {
      console.log('Cache Hit: album', album);
      const unzippedRdata = zlib.inflateSync(Buffer.from(rdata, 'base64'));
      res.send(unzippedRdata);
      redisCli.expire(`zImg?album=${album}`, TTL);
   }
   else {
      console.log('Cache Miss: album', album);
      const [dbdata] = await conn.query('SELECT image FROM images WHERE album=?', [album]);
      const dbJson = JSON.stringify(dbdata);
      res.send(dbJson);
      const zippedJson = zlib.deflateSync(dbJson);
      redisCli.setEx(`zImg?album=${album}`, TTL, zippedJson.toString('base64'));
   }
});

app.get('/id/:id', async (req, res) => {
   const album = req.params.album;
   const rdata = await redisCli.get(`zImg?album=${album}`);
   if (rdata != null) {
      console.log('Cache Hit: album', album);
      const unzippedRdata = zlib.inflateSync(Buffer.from(rdata, 'base64'));
      res.send(unzippedRdata);
      redisCli.expire(`zImg?album=${album}`, TTL);
   }
   else {
      console.log('Cache Miss: album', album);
      const [dbdata] = await conn.query('SELECT image FROM images WHERE album=?', [album]);
      const dbJson = JSON.stringify(dbdata);
      res.send(dbJson);
      const zippedJson = zlib.deflateSync(dbJson);
      redisCli.setEx(`zImg?album=${album}`, TTL, zippedJson.toString('base64'));
   }
});

app.listen(port, () => {
   console.log('Server is running on port', port);
});

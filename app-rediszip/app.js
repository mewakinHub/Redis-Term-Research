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

app.get('/all', async (req, res) => {
   const rdata = await redisCli.get('zImgAll');
   if (rdata != null) {
      console.log('Cache Hit');
      const unzippedRdata = zlib.inflateSync(rdata);
      console.log('Unzipped data:', unzippedRdata);
      res.send(unzippedRdata);
      redisCli.expire('zImgAll', TTL);
   }
   else {
      console.log('Cache Miss');
      const [dbdata] = await conn.query('SELECT image FROM images;');
      const dbJson = JSON.stringify(dbdata);
      const zippedJson = zlib.deflateSync(dbJson);
      console.log('Zipped data:', zippedJson);
      redisCli.setEx('zImgAll', TTL, zippedJson);
      res.send(dbJson);
   }
});

app.listen(port, () => {
   console.log('Server is running on port', port);
});

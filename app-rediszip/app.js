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
      const unzippedRdata = zlib.inflateSync(Buffer.from(rdata, 'base64'));
      res.send(unzippedRdata);
      redisCli.expire('zImgAll', TTL);
   }
   else {
      console.log('Cache Miss');
      const [dbdata] = await conn.query('SELECT image FROM images;');
      const dbJson = JSON.stringify(dbdata);
      res.send(dbJson);
      const zippedJson = zlib.deflateSync(dbJson, {level: 9});
      redisCli.setEx('zImgAll', TTL, zippedJson.toString('base64'));
   }
});

app.listen(port, () => {
   console.log('Server is running on port', port);
});

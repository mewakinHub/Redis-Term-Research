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
const port = 3001;
const TTL = 3600;

app.use(express.static('public'));

app.get('/all', async (req, res) => {
   const rdata = await redisCli.get('imgAll');
   if (rdata != null) {
      console.log('Cache Hit');
      res.send(rdata);
   }
   else {
      console.log('Cache Miss');
      const [dbdata] = await conn.query('SELECT image FROM images;');
      const dbjson = JSON.stringify(dbdata);
      res.send(dbjson)
      redisCli.setEx('imgAll', TTL, dbjson);
   }
});

app.listen(port, () => {
   console.log('Server is running on port', port);
});

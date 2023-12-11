import mysql from 'mysql2';
import express from 'express';
import redis from 'redis';
import pako from 'pako';
import { rejects } from 'assert';

//Adjustable variables
const port = 1002;
const TTL = 3600;

//Initialize MySQL
const conn = mysql.createConnection({
   host: 'localhost',
   user: 'root',
   password: 'root',
   database: 'redisresearch'
}).promise();

//Initialize Express
const app = express();
app.use(express.static('public'));
app.listen(port, () => {
   console.log('• Server is running on port', port);
   console.log('---------------');
});

//Initialize Timestamps

var startTime = 0;
var endTime = 0;
var responseTime = 0;
var loadTime = 0;

function RecordFetchTime() {
   endTime = new Date().getTime();
   responseTime = endTime - startTime;
   console.log('Fetch response time:', responseTime, 'ms');
};

app.get('/loadtime/:loadtime', async (req, res) => {
   loadTime = req.params.loadtime;
   if (responseTime != 0) {
      console.log('Page render time:', String(loadTime-responseTime), 'ms');
      console.log('Total load time:', loadTime, 'ms');
      console.log('---------------');
   }
});

//Initialize Redis
const redisCli = redis.createClient();
redisCli.on('error', err => console.log('Redis Client Error', err));
await redisCli.connect();

//Exit protocol
process.on('SIGINT', async () => {
   console.log('Exiting...');
   await redisCli.bgSave();
   console.log('• Saved snapshot to dump.rdb');
   process.exit();
});

//Fetch function
async function FetchQuery(res, rediskey, sqlquery, params) {
   startTime = new Date().getTime();
   const key = rediskey+params;
   const rBuffer = await redisCli.get(key);
   if (rBuffer != null) {
      console.log('Key:', key);
      console.log('Cache: Hit');
      try {
         const rCompressed = Buffer.from(rBuffer, 'base64');
         const rJson = pako.inflate(rCompressed);
         res.send(rJson);
      } catch (error) {
         console.error('Decompression error:', error);
      }
      RecordFetchTime();
      const oldTTL = await redisCli.ttl(key);
      console.log('• Reset TTL of key', key, 'from', String(oldTTL), 's to', String(TTL), 's');
      redisCli.expire(key, TTL);
   }
   else {
      console.log('Key:', key);
      console.log('Cache: Miss');
      const [dbData] = await conn.query(sqlquery, [params]);
      res.send(dbData);
      RecordFetchTime();
      try {
         const dbJson = JSON.stringify(dbData);
         const dbCompressed = pako.deflate(dbJson);
         const dbBuffer = Buffer.from(dbCompressed);
         redisCli.setEx(key, TTL, dbBuffer);
      }
      catch (error) {
         console.error('Compression error:', error);
      }
      console.log('• Set key', key, 'with TTL', String(TTL), 's');
   }
};

//API endpoints

app.get('/all', async (req, res) => {
   FetchQuery(res, '2img', 'SELECT image FROM images;', '');
});

app.get('/album/:album', async (req, res) => {
   const album = req.params.album;
   FetchQuery(res, '2imgAlbum', 'SELECT image FROM images WHERE album=?', album);
});

app.get('/id/:id', async (req, res) => {
   const id = req.params.id;
   FetchQuery(res, '2imgId', 'SELECT image FROM images WHERE id=?', id);
});

app.get('/flush', async (req, res) => {
   redisCli.flushAll();
   res.send('');
});

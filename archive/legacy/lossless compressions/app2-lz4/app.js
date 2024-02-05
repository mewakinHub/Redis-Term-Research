import mysql from 'mysql2';
import express from 'express';
import redis from 'redis';
import lz4 from 'lz4';

//Adjustable variables
const port = 1002;
const TTL = 3600;

//Initialize MySQL
const sqlConn = mysql.createConnection({
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

let startTime = 0;
let endTime = 0;
let responseTime = 0;
let loadTime = 0;

function RecordResponseTime() {
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
async function FetchQuery(res, rediskey, query, params) {
   startTime = new Date().getTime();
   const key = rediskey+params;
   const rComp = await redisCli.get(key);
   if (rComp != null) {
      console.log('Key:', key);
      console.log('Cache: Hit');
      //Decompress from lz4
      const rJson = lz4.decodeBlock(Buffer.from(rComp, 'base64'));
      res.send(rJson);
      RecordResponseTime();
      const oldTTL = await redisCli.ttl(key);
      console.log('• Reset TTL of key', key, 'from', String(oldTTL), 's to', String(TTL), 's');
      redisCli.expire(key, TTL);
   }
   else {
      console.log('Key:', key);
      console.log('Cache: Miss');
      const [dbData] = await sqlConn.query(query, [params]);
      res.send(dbData);
      RecordResponseTime();
      const dbJson = JSON.stringify(dbData);
      //Compress with lz4
      const dbComp = lz4.encodeBlock(dbJson).toString('base64');
      redisCli.setEx(key, TTL, dbComp);
      console.log('• Set key', key, 'with TTL', String(TTL), 's');
   }
};

//API endpoints

app.get('/all', async (req, res) => {
   FetchQuery(res, 'Limg', 'SELECT image FROM images;', '');
});

app.get('/album/:album', async (req, res) => {
   const album = req.params.album;
   FetchQuery(res, 'LimgAlbum', 'SELECT image FROM images WHERE album=?', album);
});

app.get('/id/:id', async (req, res) => {
   const id = req.params.id;
   FetchQuery(res, 'LimgId', 'SELECT image FROM images WHERE id=?', id);
});

app.get('/flush', async (req, res) => {
   redisCli.flushAll();
   res.send('');
});

import mysql from 'mysql2';
import express from 'express';
import redis from 'redis';

//Adjustable variables
const port = 1001;
const TTL = 3600;

//Initialize base

const conn = mysql.createConnection({
   host: 'localhost',
   user: 'root',
   password: 'root',
   database: 'redisresearch'
}).promise();

const app = express();
app.use(express.static('public'));
app.listen(port, () => {
   console.log('Server is running on port', port);
   console.log('---------------');
});

var startTime = 0;
var endTime = 0;
var responseTime = 0;
var loadTime = 0;

app.get('/loadtime/:loadtime', async (req, res) => {
   loadTime = req.params.loadtime;
   if (responseTime != 0) {
      console.log('Page render time:', String(loadTime-responseTime), 'ms');
      console.log('Total load time:', loadTime, 'ms');
      console.log('---------------');
   }
});

function RecordFetchTime() {
   endTime = new Date().getTime();
   responseTime = endTime - startTime;
   console.log('Fetch response time:', responseTime, 'ms');
};

//Initialize Redis
const redisCli = redis.createClient();
redisCli.on('error', err => console.log('Redis Client Error', err));
await redisCli.connect();

//Fetch function
async function FetchQuery(res, rediskey, sqlquery, params) {
   startTime = new Date().getTime();
   const key = rediskey+params;
   const rdata = await redisCli.get(key);
   if (rdata != null) {
      console.log('Key:', key);
      console.log('Cache: Hit');
      res.send(rdata);
      RecordFetchTime();
      redisCli.expire(key, TTL);
   }
   else {
      console.log('Key:', key);
      console.log('Cache: Miss');
      const [dbdata] = await conn.query(sqlquery, [params]);
      const dbJson = JSON.stringify(dbdata);
      res.send(dbJson);
      RecordFetchTime();
      redisCli.setEx(key, TTL, dbJson);
      console.log('• setEx done');
   }
};

//API endpoints

app.get('/all', async (req, res) => {
   FetchQuery(res, 'img', 'SELECT image FROM images;', '');
});

app.get('/album/:album', async (req, res) => {
   const album = req.params.album;
   FetchQuery(res, 'img?album=', 'SELECT image FROM images WHERE album=?', album);
});

app.get('/id/:id', async (req, res) => {
   const id = req.params.id;
   FetchQuery(res, 'img?id=', 'SELECT image FROM images WHERE id=?', id);
});

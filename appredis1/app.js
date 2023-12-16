const express = require('express');
const mysql2 = require('mysql2');
const redis = require('redis');

//Adjustable variables
const port = 1001; //Integer [1000, infinity). Server port
const TTLbase = 3600; //Integer [1, infinity). Base time-to-live in seconds of a Redis cache
const TTLmax = 21600; //Integer [1, infinity). Maximum time-to-live in seconds of a Redis cache

//Initialize Express
const app = express();
app.use(express.static('public'));
app.listen(port, () => {
   console.log('---------------');
   console.log('• Server is running on port', port);
   console.log('---------------');
});

//Initialize MySQL
const sqlConn = mysql2.createConnection({
   host: 'localhost',
   user: 'root',
   password: 'root',
   database: 'redisresearch'
}).promise();

//Initialize Timestamps

let startTime = 0;
let endTime = 0;
let responseTime = 0;
let loadTime = 0;

function RecordResponseTime() {
   endTime = new Date().getTime();
   responseTime = endTime - startTime;
   console.log('Response time:', responseTime, 'ms');
};

app.get('/loadtime/:loadtime', async (req, res) => {
   loadTime = req.params.loadtime;
   if (responseTime != 0) {
      console.log('Page render time:', loadTime-responseTime, 'ms');
      console.log('Total load time:', parseInt(loadTime), 'ms');
      console.log('---------------');
   }
});

//Initialize Redis
const redisCli = redis.createClient();
redisCli.on('error', err => console.log('Redis Client Error', err));
redisCli.connect();

//TTL function
async function AddTTL(key) {
   const currentTTL = await redisCli.ttl(key);
   let newTTL = currentTTL + TTLbase;
   if (newTTL > TTLmax) {
      newTTL = TTLmax;
   }
   redisCli.expire(key, newTTL);
   console.log('• Changed TTL of key', key, 'from', currentTTL, 's to', newTTL, 's');
}

//Fetch function
async function FetchQuery(res, rediskey, sqlquery, params) {
   startTime = new Date().getTime();
   const key = rediskey+params;
   const rJson = await redisCli.get(key);
   console.log('Key:', key);
   if (rJson != null) {
      console.log('Cache: Hit');
      res.send(rJson);
      RecordResponseTime();
      AddTTL(key);
   }
   else {
      console.log('Cache: Miss');
      const [dbData] = await sqlConn.query(sqlquery, [params]);
      res.send(dbData);
      RecordResponseTime();
      const dbJson = JSON.stringify(dbData);
      redisCli.setEx(key, TTLbase, dbJson);
      console.log('•••••••••');
      console.log('Set key', key, 'with TTL', TTLbase, 's');
      console.log('Approximate size in Redis', Math.round(dbJson.length / 1.81));
      console.log('•••••••••');
   }
};

//API endpoints

app.get('/all', async (req, res) => {
   FetchQuery(res, 'img', 'SELECT image FROM images;', '');
});

app.get('/album/:album', async (req, res) => {
   const album = req.params.album;
   FetchQuery(res, 'img-album', 'SELECT image FROM images WHERE album=?', album);
});

app.get('/id/:id', async (req, res) => {
   const id = req.params.id;
   FetchQuery(res, 'img-id', 'SELECT image FROM images WHERE id=?', id);
});

//Exit procedure
process.on('SIGINT', async () => {
   console.log('Exiting...');
   await redisCli.bgSave();
   console.log('• Saved snapshot to dump.rdb');
   console.log('---------------');
   sqlConn.end();
   redisCli.quit();
   process.exit();
});

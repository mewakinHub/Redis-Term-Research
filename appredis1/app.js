const express = require('express');
const mysql2 = require('mysql2');
const redis = require('redis');

//Adjustable variables

let port = 1001; //Integer range [1000, infinity). Server port

const sqlHost = 'localhost'; //String. Address of the webpage.
const sqlUser = 'root'; //String. MySQL user.
const sqlPassword = 'root'; //String. MySQL password.
const sqlDatabase = 'redisresearch'; //String. MySQL password.

const enableTTL = true; //true for false. Whether to use TTL or not. (true = cache expires, false = cache never expires)
let TTLbase = 3600; //Integer range [1, infinity). Base time-to-live in seconds of a Redis cache
let TTLmax = 21600; //Integer range [1, infinity). Maximum time-to-live in seconds of a Redis cache

//Initialize Express

const app = express();
app.use(express.static('public'));
app.listen(port, () => {
   console.log('---------------');
   console.log('✔ Server is running on port', port);
});

//Adjustable Express API endpoints

app.get('/all', async (req, res) => {
   FetchQuery(res, 'img', 'SELECT id, image FROM images;', '');
});

app.get('/album/:album', async (req, res) => {
   const album = req.params.album;
   FetchQuery(res, 'img-album', 'SELECT id, image FROM images WHERE album=?', album);
});

app.get('/id/:id', async (req, res) => {
   const id = req.params.id;
   FetchQuery(res, 'img-id', 'SELECT id, image FROM images WHERE id=?', id);
});



//Initialize database

const sqlConn = mysql2.createConnection({
   host: sqlHost,
   user: sqlUser,
   password: sqlPassword,
   database: sqlDatabase
}).promise();

async function QueryDatabase(sqlquery, params) {
   return sqlConn.query(sqlquery, [params]);
}

//Initialize Redis

const redisCli = redis.createClient();
redisCli.on('error', err => console.log('⚠︎ Redis Client Error', err));
redisCli.connect();

//Initialize time measurements

let startTime = 0;
let endTime = 0;
let responseTime = 0;
let loadTime = 0;

function RecordResponseTime() {
   endTime = new Date().getTime();
   responseTime = endTime - startTime;
   console.log('○ Response time:', responseTime, 'ms');
};

app.get('/loadtime/:loadtime', async (req, res) => {
   loadTime = req.params.loadtime;
   if (responseTime != 0) {
      console.log('○ Page render time:', loadTime-responseTime, 'ms');
      console.log('○ Total load time:', parseInt(loadTime), 'ms');
   }
});

//TTL function

async function AddTTL(key) {
   if (enableTTL) {
      const currentTTL = await redisCli.ttl(key);
      let newTTL = currentTTL + TTLbase;
      if (newTTL > TTLmax) {
         newTTL = TTLmax;
      }
      redisCli.expire(key, newTTL);
      console.log('○ Changed TTL of key', key, 'from', currentTTL, 's to', newTTL, 's');
   }
}

//Fetch function

async function FetchQuery(res, rediskey, sqlquery, params) {
   startTime = new Date().getTime();
   const key = rediskey+params;
   const rJson = await redisCli.get(key);
   console.log('● Key:', key);
   if (rJson != null) {
      console.log('○ Cache: Hit');
      res.send(rJson);
      RecordResponseTime();
      AddTTL(key);
   }
   else {
      console.log('○ Cache: Miss');
      const [dbData] = await QueryDatabase(sqlquery, params);
      res.send(dbData);
      RecordResponseTime();
      const dbJson = JSON.stringify(dbData);
      if (enableTTL) {
         redisCli.setEx(key, TTLbase, dbJson);
         console.log('▶ Set key', key, 'with TTL', TTLbase, 's');
      }
      else {
         redisCli.set(key, dbJson);
         console.log('▶ Set key', key, 'with no TTL');
      }
      console.log('▷ Approximate size in Redis:', Math.round(dbJson.length / 1.81), 'bytes');
   }
};

//Exit procedure

process.on('SIGINT', async () => {
   console.log('⌫  Exiting...');
   await redisCli.bgSave();
   console.log('⌫  Saved snapshot to dump.rdb');
   console.log('---------------');
   sqlConn.end();
   redisCli.quit();
   process.exit();
});

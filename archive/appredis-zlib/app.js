const express = require('express');
const mysql2 = require('mysql2');
const redis = require('redis');
const zlib = require('zlib');

//Adjustable variables
const port = 1003;
const TTLbase = 3600;
const TTLmax = 21600;

//Initialize Express
const app = express();
app.use(express.static('public'));
app.listen(port, () => {
   console.log('---------------');
   console.log('• Server is running on port', port);
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
      console.log('Page render time:', String(loadTime-responseTime), 'ms');
      console.log('Total load time:', loadTime, 'ms');
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
   console.log('• Changed TTL of key', key, 'from', String(currentTTL), 's to', String(newTTL), 's');
}

//Fetch function
async function FetchQuery(res, rediskey, query, params) {
   startTime = new Date().getTime();
   const key = rediskey+params;
   const rDeflated = await redisCli.get(key);
   console.log('Key:', key);
   if (rDeflated != null) {
      console.log('Cache: Hit');
      const rJson = zlib.inflateSync(Buffer.from(rDeflated, 'base64'));
      res.send(rJson);
      RecordResponseTime();
      AddTTL(key);
   }
   else {
      console.log('Cache: Miss');
      const [dbData] = await sqlConn.query(query, [params]);
      res.send(dbData);
      RecordResponseTime();
      const dbJson = JSON.stringify(dbData);
      const dbDeflated = zlib.deflateSync(dbJson, {level: 9}).toString('base64');
      redisCli.setEx(key, TTLbase, dbDeflated);
      console.log('• Set key', key, 'with TTL', String(TTLbase), 's');
   }
};

//API endpoints

app.get('/all', async (req, res) => {
   FetchQuery(res, 'imgZ', 'SELECT image FROM images;', '');
});

app.get('/album/:album', async (req, res) => {
   const album = req.params.album;
   FetchQuery(res, 'imgZ-album', 'SELECT image FROM images WHERE album=?', album);
});

app.get('/id/:id', async (req, res) => {
   const id = req.params.id;
   FetchQuery(res, 'imgZ-id', 'SELECT image FROM images WHERE id=?', id);
});

//Exit procedure
process.on('SIGINT', async () => {
   console.log('Exiting...');
   await redisCli.bgSave();
   console.log('• Saved snapshot to dump.rdb');
   console.log('---------------');
   sqlConn.end();
   sqlEventConn.end();
   redisCli.quit();
   process.exit();
});

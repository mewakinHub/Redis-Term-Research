const express = require('express');
const mysql2 = require('mysql2');
const mysql = require('mysql');
const redis = require('redis');
const MySQLEvents = require('@rodrigogs/mysql-events');

//Adjustable variables
const port = 1001;
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

//Initialize MySQLEvent
const sqlEventConn = mysql.createConnection({
   host: 'localhost',
   user: 'root',
   password: 'root',
});
const instance = new MySQLEvents(sqlEventConn, {startAtEnd: true});
instance.start()
   .then(() => {
      console.log('• Listening to change in DB')
      console.log('---------------');
   })
   .catch(err => console.error('MySQLEvent failed to start.', err));

//Obsolete Redis cache prevention procedure
instance.addTrigger({
   name: 'DetectChange',
   expression: 'redisresearch.images.*',
   statement: MySQLEvents.STATEMENTS.ALL,
   onEvent: async (event) => {
      console.log('• Change in DB detected');
      redisCli.flushAll();
      console.log('• Flushed all Redis keys');
      console.log('---------------');
   },
});
instance.on(MySQLEvents.EVENTS.CONNECTION_ERROR, console.error);
instance.on(MySQLEvents.EVENTS.ZONGJI_ERROR, console.error);

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
      const [dbData] = await sqlConn.query(query, [params]);
      const dbBase64 = dbData.map(item => {
         const imageData = item.image;
         const base64Image = Buffer.from(imageData).toString('base64');
         return { ...item, image: base64Image };
      });
      res.send(dbBase64);
      RecordResponseTime();
      const dbJson = JSON.stringify(dbBase64);
      redisCli.setEx(key, TTLbase, dbJson);
      console.log('• Set key', key, 'with TTL', String(TTLbase), 's');
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
   sqlEventConn.end();
   redisCli.quit();
   process.exit();
});

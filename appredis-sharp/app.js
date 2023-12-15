const express = require('express');
const mysql2 = require('mysql2');
const mysql = require('mysql');
const redis = require('redis');
const MySQLEvents = require('@rodrigogs/mysql-events');
const sharp = require('sharp');

//Adjustable variables
const port = 1003; //Server port
const TTLbase = 3600; //Base time-to-live of a Redis cache
const TTLmax = 21600; //Maximum time-to-live of a Redis cache
const enableCompression = true;
let compressStiffness = 1; //Range (0,infinity). The higher the number, the less the image file size affects compression amount.
let compressQualityMin = 25; //Range [0,100]. The floor of the quality of the compressed image in percent.
let compressQualityMax = 75; //Range [0,100] only. The ceiling of the quality of the compressed image in percent.

//Invalid variables prevention
compressStiffness = Math.max(compressStiffness, 0.01);
compressQualityMin = Math.min(Math.max(compressQualityMin, 0), 100);
compressQualityMax = Math.min(Math.max(compressQualityMax, 0), 100);
if(compressQualityMin > compressQualityMax) [compressQualityMin, compressQualityMax] = [compressQualityMax, compressQualityMin];

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
      console.log('Page render time:', loadTime-responseTime, 'ms');
      console.log('Total load time:', parseInt(loadTime), 'ms');
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
      let dbJson;
      if (enableCompression) {
         let dbCompressed = [];
         for (const item of dbData) {
            let compressQualityNormalized;
            const image = item.image;
            sharp(image)
               .metadata()
               .then(meta => {
                  const width = meta.width;
                  const height = meta.height;
                  const size = meta.size;
                  const compressQualityRaw = (1 - (size / (width * height * compressStiffness))) * 100;
                  compressQualityNormalized = Math.min(Math.max(compressQualityRaw, compressQualityMin), compressQualityMax);
                  /*console.log('width', width);
                  console.log('height', height);
                  console.log('size', size);
                  console.log('raw', compressQualityRaw);
                  console.log('normalized', compressQualityNormalized);*/
               })
            const compressedImage = await sharp(image)
               .jpeg({ quality: compressQualityNormalized })
               .toBuffer();
            dbCompressed.push({image: compressedImage});
         };
         dbJson = JSON.stringify(dbCompressed);
      }
      else {
         dbJson = JSON.stringify(dbData);
      }
      redisCli.setEx(key, TTLbase, dbJson);
      console.log('• Set key', key, 'with TTL', String(TTLbase), 's');
   }
};

//API endpoints

app.get('/all', async (req, res) => {
   FetchQuery(res, 'imgS', 'SELECT image FROM images;', '');
});

app.get('/album/:album', async (req, res) => {
   const album = req.params.album;
   FetchQuery(res, 'imgS-album', 'SELECT image FROM images WHERE album=?', album);
});

app.get('/id/:id', async (req, res) => {
   const id = req.params.id;
   FetchQuery(res, 'imgS-id', 'SELECT image FROM images WHERE id=?', id);
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

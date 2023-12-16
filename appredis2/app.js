const express = require('express');
const mysql2 = require('mysql2');
const redis = require('redis');
const mysql = require('mysql');
const MySQLEvents = require('@rodrigogs/mysql-events');
const sharp = require('sharp');

//Adjustable variables
const port = 1002; //Server port
const TTLbase = 3600; //Base time-to-live in seconds of a Redis cache
const TTLmax = 21600; //Maximum time-to-live in seconds of a Redis cache
const enableCompression = true;
let compressCorrection = 0.95; //Float (0, 1). The amount to correct Sharp's bigger output size when no compression is applied (quality = 80). The lesser, the more compression.
let compressStiffness = 0.25; //Float (0,infinity). The higher the number, the less the image file size affects compression amount.
let compressQualityMin = 1; //Integer [1,80]. The floor of image quality. Up to 100 is allowed, but more than 80 is expansion, not compression.
let compressQualityMax = 60; //Integer [1,80]. The ceiling of image quality. Up to 100 is allowed, but more than 80 is expansion, not compression.
let forceCompressQuality = 0; //Integer [1,80]. Set to negative or zero to disable. Used for testing. Up to 100 is allowed, but more than 80 is expansion, not compression.

//Invalid variables prevention
compressStiffness = Math.max(compressStiffness, 0.01);
compressQualityMin = Math.round(Math.min(Math.max(compressQualityMin, 1), 100));
compressQualityMax = Math.round(Math.min(Math.max(compressQualityMax, 1), 100));
if(compressQualityMin > compressQualityMax) 
   [compressQualityMin, compressQualityMax] = [compressQualityMax, compressQualityMin];

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
      let dbJson;
      let logArray = [];
      if (enableCompression) {
         let dbCompressed = [];
         for (const item of dbData) {
            let width;
            let height;
            let size;
            let compressQualityCorrected;
            const image = item.image;
            await sharp(image)
               .metadata()
               .then(meta => {
                  width = meta.width;
                  height = meta.height;
                  size = meta.size;
                  if (forceCompressQuality <= 0) {
                     const compressQualityRaw = (1 - (size / (width * height * compressStiffness))) * 100;
                     compressQualityNormalized =
                        Math.min(
                           Math.max(compressQualityRaw, compressQualityMin),
                           compressQualityMax
                        );
                  }
                  else {
                     compressQualityNormalized = forceCompressQuality;
                  }
                  compressQualityCorrected = Math.round(compressQualityNormalized * compressCorrection)
                  logArray.push({
                     width: width,
                     height: height,
                     size: size,
                     quality: compressQualityCorrected
                  });
               });
            const compressedImage = await sharp(image)
               .webp({
                  quality: compressQualityCorrected,
                  minSize: true,
                  effort: 0
               })
               .toBuffer();
            dbCompressed.push({image: compressedImage});
         };
         dbJson = JSON.stringify(dbCompressed);
      }
      else {
         dbJson = JSON.stringify(dbData);
      }
      redisCli.setEx(key, TTLbase, dbJson);
      console.log('•••••••••');
      for (let i = 0; i < logArray.length; i++) {
         //console.log('Img', i+1, 'width', logArray[i].width);
         //console.log('Img', i+1, 'height', logArray[i].height);
         //console.log('Img', i+1, 'size', logArray[i].size);
         console.log('Img', i+1, 'quality:', logArray[i].quality);
      }
      console.log('Set key', key, 'with TTL', TTLbase, 's');
      console.log('Approximate size in Redis', Math.round(dbJson.length / 1.81));
      console.log('•••••••••');
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

const express = require('express');
const mysql2 = require('mysql2');
const redis = require('redis');
const sharp = require('sharp');
const mysql = require('mysql');
const MySQLEvents = require('@rodrigogs/mysql-events');

//Adjustable variables

let port = 1003; //Integer range [1000, infinity). Server port

const sqlHost = 'localhost'; //String. Address of the webpage.
const sqlUser = 'root'; //String. MySQL user.
const sqlPassword = 'root'; //String. MySQL password.
const sqlDatabase = 'redisresearch'; //String. MySQL password.
const AttId = 'id'; //String. Name of the 'id' attribute in the table
const AttImage = 'image'; //String. Name of the 'id' attribute in the table which stores the BLOB images.

const enableTTL = true; //true for false. Whether to use TTL or not. (true = cache expires, false = cache never expires)
let TTLbase = 3600; //Integer range [1, infinity). Base time-to-live in seconds of a Redis cache
let TTLmax = 21600; //Integer range [1, infinity). Maximum time-to-live in seconds of a Redis cache

const enableCompression = true; //true or false. Whether to use compression or not.
let compressStiffness = 0.25; //Float range (0,infinity). The higher the number, the less the image file size affects compression amount, thus less compression.
let compressQualityMin = 0.1; //Float range (0, 1]. The floor of compressed image quality.
let compressQualityMax = 0.8; //Float range (0, 1]. The ceiling of compressed image quality.
let compressCorrection = 0.95; //Float range (0, 1]. Not recommended to change. The amount to correct Sharp's bigger output size when no compression is applied (quality = 80).
const forceCompressQuality = 0; //Float range (0, 1]. Set to negative or zero to disable. Used for testing.

//Initialize Express

const app = express();
app.use(express.static('public'));
app.listen(port, () => {
   console.log('---------------');
   console.log('✔ Server is running on port', port);
});

//Adjustable Express API endpoints

app.get('/all', async (req, res) => {
   FetchQuery(res, 'SELECT id, image FROM images', 'imgS', ['id'], ['image']);
});

app.get('/album/:album', async (req, res) => {
   const album = req.params.album;
   FetchQuery(res, 'SELECT id, image FROM images WHERE album='+album, 'imgS-album'+album, ['id'], ['image']);
});

app.get('/id/:id', async (req, res) => {
   const id = req.params.id;
   FetchQuery(res, 'SELECT id, image FROM images WHERE id='+id, 'imgS-id'+id, ['id'], ['image']);
});



//Initialize database

const sqlConn = mysql2.createConnection({
   host: sqlHost,
   user: sqlUser,
   password: sqlPassword,
   database: sqlDatabase
}).promise();

async function QueryDatabase(sqlquery) {
   return sqlConn.query(sqlquery);
}

//Initialize database listener

const sqlEventConn = mysql.createConnection({
   host: sqlHost,
   user: sqlUser,
   password: sqlPassword
});

const instance = new MySQLEvents(sqlEventConn, {startAtEnd: true});
instance.start()
   .then(() => {
      console.log('✔ Listening to change in DB')
   })
   .catch(err => console.error('⚠︎ MySQLEvent failed to start.', err));

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

//Outdated cache handler

instance.addTrigger({
   name: 'DetectChange',
   expression: 'redisresearch.*',
   statement: MySQLEvents.STATEMENTS.ALL,
   onEvent: async (event) => {
      console.log('▶ A change in DB detected');
      console.log('▷ Table:', event.table);
      console.log('▷ Row:', event.affectedRows[0].after.id);
      console.log('▷ Column:', event.affectedColumns.filter(item => item !== sqlImgAtt));
   },
});
instance.on(MySQLEvents.EVENTS.CONNECTION_ERROR, console.error);
instance.on(MySQLEvents.EVENTS.ZONGJI_ERROR, console.error);

//Image compression
async function CompressImage(dbData, otherAttributes, imgAttributes) {
   console.log('▶ Compression process starts')
   let compressedArray = [];
   let i = 1;
   for (const item of dbData) {
      let obj = {}
      for (j = 0; j < otherAttributes.length; j++) {
         obj[otherAttributes[j]] = item[otherAttributes[j]]
      }
      let width;
      let height;
      let size;
      let compressQualityMapped;
      for (j = 0; j < imgAttributes.length; j++) {
         const image = item[imgAttributes[j]];
         await sharp(image)
            .metadata()
            .then(meta => {
               width = meta.width;
               height = meta.height;
               size = meta.size;
               if (forceCompressQuality <= 0) {
                  const compressQualityRaw = (1 - (size / (width * height * compressStiffness)));
                  compressQualityNormalized = Math.min(Math.max(compressQualityRaw, compressQualityMin), compressQualityMax);
               }
               else {
                  compressQualityNormalized = forceCompressQuality;
               }
               compressQualityMapped = Math.round(compressQualityNormalized * compressCorrection * 80);
               console.log('▷ Img', i, 'quality:', compressQualityMapped*1.25 + '%');
            });
         const compressedImage = await sharp(image)
            .webp({
               quality: compressQualityMapped,
               minSize: true,
               effort: 0
            })
            .toBuffer();
         obj[imgAttributes[j]] = compressedImage;
      }
      compressedArray.push(obj);
      i++;
   };
   return JSON.stringify(compressedArray);
}

//Fetch function

async function FetchQuery(res, sqlquery, key, otherAttributes, imgAttributes) {
   startTime = new Date().getTime();
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
      const [dbData] = await QueryDatabase(sqlquery);
      res.send(dbData);
      RecordResponseTime();
      let dbJson;
      if (enableCompression) {
         dbJson = await CompressImage(dbData, imgAttributes, otherAttributes);
      }
      else {
         dbJson = JSON.stringify(dbData);
      }
      if (enableTTL) {
         redisCli.setEx(key, TTLbase, dbJson);
         console.log('▷ Set key', key, 'with TTL', TTLbase, 's');
      }
      else {
         redisCli.set(key, dbJson);
         console.log('▷ Set key', key, 'with no TTL');
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

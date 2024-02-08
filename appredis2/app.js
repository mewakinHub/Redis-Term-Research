const express = require('express');
const mysql2 = require('mysql2');
const redis = require('redis');
const sharp = require('sharp');

//Adjustable variables

let port = 1002; //Integer range [1000, infinity). Server port

const sqlHost = 'localhost'; //String. Address of the webpage.
const sqlUser = 'root'; //String. MySQL user.
const sqlPassword = 'root'; //String. MySQL password.
const sqlDatabase = 'redisresearch'; //String. MySQL password.

const enableTTL = true; //true for false. Whether to use TTL or not. (true = cache expires, false = cache never expires)
let TTLbase = 3600; //Integer range [1, infinity). Base time-to-live in seconds of a Redis cache
let TTLmax = 21600; //Integer range [1, infinity). Maximum time-to-live in seconds of a Redis cache

const enableCompression = true; //true or false. Whether to use compression or not.
let compressStiffness = 0.25; //Float range (0,infinity). The higher the number, the less the image file size affects compression amount, thus less compression.
let compressQualityMin = 0.1; //Float range (0, 1]. The floor of compressed image quality.
let compressQualityMax = 0.8; //Float range (0, 1]. The ceiling of compressed image quality.
let compressCorrection = 0.95; //Float range (0, 1]. Not recommended to change. The amount to correct Sharp's bigger output size when no compression is applied (quality = 80).
const forceCompressQuality = 0; //Float range (0, 1]. Set to negative or zero to disable. Used for testing.

//Invalid system variables prevention

port = Math.round(Math.max(port, 1000));
TTLbase = Math.round(Math.max(TTLbase, 1));
TTLmax = Math.round(Math.max(TTLbase, 1));
compressStiffness = Math.max(compressStiffness, 0.01);
compressQualityMin = Math.min(Math.max(compressQualityMin, 0.01), 1);
compressQualityMax = Math.min(Math.max(compressQualityMax, 0.01), 1);
if (compressQualityMin > compressQualityMax) {
   [compressQualityMin, compressQualityMax] = [compressQualityMax, compressQualityMin];
}
compressCorrection = Math.min(Math.max(compressCorrection, 0), 1);

//Initialize Express

const app = express();
app.use(express.static('public'));
app.listen(port, () => {
   console.log('---------------');
   console.log('✔ Server is running on port', port);
});

//Adjustable Express API endpoints

app.get('/all', async (req, res) => {
   FetchQuery(res, 'SELECT id, image FROM images', 'imgS:all', ['id'], ['image']);
});

app.get('/album/:album', async (req, res) => {
   const album = req.params.album;
   FetchQuery(res, 'SELECT id, image FROM images WHERE album='+album, 'imgS:album:'+album, ['id'], ['image']);
});

app.get('/id/:id', async (req, res) => {
   const id = req.params.id;
   FetchQuery(res, 'SELECT id, image FROM images WHERE id='+id, 'imgS:id:'+id, ['id'], ['image']);
});



//Initialize database

const sqlConn = mysql2.createConnection({
   host: sqlHost,
   user: sqlUser,
   password: sqlPassword,
   database: sqlDatabase
}).promise();

async function QueryDatabase(query) {
   return sqlConn.query(query);
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

async function AddTTL(redisKey) {
   if (enableTTL) {
      const currentTTL = await redisCli.ttl(redisKey);
      let newTTL = currentTTL + TTLbase;
      if (newTTL > TTLmax) {
         newTTL = TTLmax;
      }
      redisCli.expire(redisKey, newTTL);
      console.log('○ Changed TTL of key', redisKey, 'from', currentTTL, 's to', newTTL, 's');
   }
}

//Image compression
async function CompressImage(dbData, genericAtt, imgAtt) {
   console.log('▶ Compression process begins')
   let compressedArray = [];
   let i = 1;
   for (const item of dbData) {
      let obj = {}
      for (j = 0; j < genericAtt.length; j++) {
         obj[genericAtt[j]] = item[genericAtt[j]]
      }
      let width;
      let height;
      let size;
      let compressQualityMapped;
      for (j = 0; j < imgAtt.length; j++) {
         const image = item[imgAtt[j]];
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
         obj[imgAtt[j]] = compressedImage;
      }
      compressedArray.push(obj);
      i++;
   };
   return JSON.stringify(compressedArray);
}

//Fetch function

async function FetchQuery(res, query, redisKey, genericAtt, imgAtt) {
   console.log('● API called');
   startTime = new Date().getTime();
   const rJson = await redisCli.get(redisKey);
   console.log('○ Key:', redisKey);
   if (rJson != null) {
      console.log('○ Cache: Hit');
      res.send(rJson);
      RecordResponseTime();
      AddTTL(redisKey);
   }
   else {
      console.log('○ Cache: Miss');
      const [dbData] = await QueryDatabase(query);
      res.send(dbData);
      RecordResponseTime();
      let dbJson;
      if (enableCompression) {
         dbJson = await CompressImage(dbData, genericAtt, imgAtt);
      }
      else {
         dbJson = JSON.stringify(dbData);
      }
      if (enableTTL) {
         redisCli.setEx(redisKey, TTLbase, dbJson);
         console.log('▷ Set key', redisKey, 'with TTL', TTLbase, 's');
      }
      else {
         redisCli.set(redisKey, dbJson);
         console.log('▷ Set key', redisKey, 'with no TTL');
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

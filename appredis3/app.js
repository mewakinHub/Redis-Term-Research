const express = require('express');
const mysql2 = require('mysql2');
const redis = require('redis');
const mysql = require('mysql');
const MySQLEvents = require('@rodrigogs/mysql-events');
const sharp = require('sharp');

//Adjustable variables

let port = 1003; //Integer range [1000, infinity). Server port

const enableTTL = true; //true for false. Whether to use TTL or not. (true = cache expires, false = cache never expires)
let TTLbase = 3600; //Integer range [1, infinity). Base time-to-live in seconds of a Redis cache
let TTLmax = 21600; //Integer range [1, infinity). Maximum time-to-live in seconds of a Redis cache

const enableCompression = true; //true or false. Whether to use compression or not.
let compressStiffness = 0.25; //Float range (0,infinity). The higher the number, the less the image file size affects compression amount, thus less compression.
let compressQualityMin = 0.1; //Float range (0, 1]. The floor of compressed image quality.
let compressQualityMax = 0.8; //Float range (0, 1]. The ceiling of compressed image quality.
let compressCorrection = 0.95; //Float range (0, 1]. Not recommended to change. The amount to correct Sharp's bigger output size when no compression is applied (quality = 80).
const forceCompressQuality = 0; //Float range (0, 1]. Set to negative or zero to disable. Used for testing.

const sqlHost = 'localhost'; //String. Address of the webpage.
const sqlUser = 'root'; //String. MySQL user.
const sqlPassword = 'root'; //String. MySQL password.
const sqlDatabase = 'redisresearch'; //String. MySQL password.
const sqlPKCol = 'id'; //String. Name of the column in the table which is the primary key.
const sqlImgCol = 'image'; //String. Name of the column in the table which stores the BLOB images.

const imgKey = 'imgS'; //String. Name of the image data key family to be stored into Redis
const metaKey = 'meta'; //String. Name of the metadata key family to be stored into Redis

//Initialize Express

const app = express();
app.use(express.static('public'));
app.listen(port, () => {
   console.log('---------------');
   console.log('• Server is running on port', port);
});

//Adjustable database-specific Express API endpoints

app.get('/all', async (req, res) => {
   FetchQuery(res, imgKey, 'SELECT '+sqlImgCol+' FROM images', '');
});

app.get('/album/:album', async (req, res) => {
   const album = req.params.album;
   FetchQuery(res, imgKey+'-album', 'SELECT '+sqlImgCol+' FROM images WHERE album=?', album);
});

app.get('/id/:id', async (req, res) => {
   const id = req.params.id;
   FetchQuery(res, imgKey+'-id', 'SELECT '+sqlImgCol+' FROM images WHERE id=?', id);
});



//Invalid system variables prevention

port = Math.round(Math.max(port, 1000));
TTLbase = Math.round(Math.max(TTLbase, 1));
TTLmax = Math.round(Math.max(TTLbase, 1));
compressCorrection = Math.min(Math.max(compressCorrection, 0), 1);
compressStiffness = Math.max(compressStiffness, 0.01);
compressQualityMin = Math.min(Math.max(compressQualityMin, 0.01), 1);
compressQualityMax = Math.min(Math.max(compressQualityMax, 0.01), 1);
if (compressQualityMin > compressQualityMax) {
   [compressQualityMin, compressQualityMax] = [compressQualityMax, compressQualityMin];
}

//Initialization

const sqlConn = mysql2.createConnection({
   host: sqlHost,
   user: sqlUser,
   password: sqlPassword,
   database: sqlDatabase
}).promise();

const sqlEventConn = mysql.createConnection({
   host: sqlHost,
   user: sqlUser,
   password: sqlPassword
});

const instance = new MySQLEvents(sqlEventConn, {startAtEnd: true});
instance.start()
   .then(() => {
      console.log('• Listening to change in DB')
      console.log('---------------');
   })
   .catch(err => console.error('MySQLEvent failed to start.', err));

//Initialize time measurements

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

//Outdated cache deletion procedure

instance.addTrigger({
   name: 'DetectChange',
   expression: 'redisresearch.images.*',
   statement: MySQLEvents.STATEMENTS.ALL,
   onEvent: async (event) => {
      console.log('Change in DB detected in:');
      console.log('Row:', event.affectedRows[0].after.id);
      console.log('Column:', event.affectedColumns.filter(item => item !== sqlImgCol));
      console.log('---------------')
   },
});
instance.on(MySQLEvents.EVENTS.CONNECTION_ERROR, console.error);
instance.on(MySQLEvents.EVENTS.ZONGJI_ERROR, console.error);

//Cache miss query function

async function QueryDatabase(sqlquery, params) {
   return sqlConn.query(sqlquery, [params]);
}

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
      if (enableTTL) {
         AddTTL(key);
      }
   }
   else {
      console.log('Cache: Miss');
      const [dbData] = await QueryDatabase(sqlquery, params);
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
            let compressQualityMapped;
            const image = item.image;
            await sharp(image)
               .metadata()
               .then(meta => {
                  width = meta.width;
                  height = meta.height;
                  size = meta.size;
                  if (forceCompressQuality <= 0) {
                     const compressQualityRaw = (1 - (size / (width * height * compressStiffness)));
                     compressQualityNormalized =
                        Math.min(
                           Math.max(compressQualityRaw, compressQualityMin),
                           compressQualityMax
                        );
                  }
                  else {
                     compressQualityNormalized = forceCompressQuality;
                  }
                  compressQualityMapped = Math.round(compressQualityNormalized * compressCorrection * 80);
                  logArray.push({
                     width: width,
                     height: height,
                     size: size,
                     quality: compressQualityMapped*1.25
                  });
               });
            const compressedImage = await sharp(image)
               .webp({
                  quality: compressQualityMapped,
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
      if (enableTTL) {
         redisCli.setEx(key, TTLbase, dbJson);
      }
      else {
         redisCli.set(key, dbJson);
      }
      console.log('•••••••••');
      for (let i = 0; i < logArray.length; i++) {
         //console.log('Img', i+1, 'width', logArray[i].width);
         //console.log('Img', i+1, 'height', logArray[i].height);
         //console.log('Img', i+1, 'size', logArray[i].size);
         console.log('Img', i+1, 'quality:', logArray[i].quality + '%');
      }
      console.log('Set key', key, 'with TTL', TTLbase, 's');
      console.log('Approximate size in Redis:', Math.round(dbJson.length / 1.81));
      console.log('•••••••••');
   }
};

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
